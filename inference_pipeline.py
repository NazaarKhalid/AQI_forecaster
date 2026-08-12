import os
import requests
import pandas as pd
import numpy as np
import joblib
import hopsworks
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.environ.get("DATABASE_URL"))

ISB_LAT, ISB_LON = 33.6938, 73.0651

def run_inference():
    print("1. Fetching last 25 hours from Supabase...")
    query = "SELECT * FROM aqi_features ORDER BY datetime DESC LIMIT 25"
    df_db = pd.read_sql(query, engine)
    
    if len(df_db) < 25:
        print("ERROR: Not enough history in database.")
        return
        
    df_db = df_db.sort_values('datetime').reset_index(drop=True)
    current_row = df_db.iloc[-1]
    lag_row = df_db.iloc[0]
    
    print("2. Fetching Open-Meteo forecast (Extended for 72h)...")
    w_url = "https://api.open-meteo.com/v1/forecast"
    w_params = {
        "latitude": ISB_LAT, "longitude": ISB_LON,
        "forecast_days": 4,
        "hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "wind_direction_10m"],
        "timezone": "GMT"
    }
    w_res = requests.get(w_url, params=w_params).json()
    
    print("3. Connecting to Hopsworks...")
    project = hopsworks.login(api_key_value=os.environ.get("HOPSWORKS_API_KEY"))
    mr = project.get_model_registry()
    
    for day in [1, 2, 3]:
        horizon_hours = 24 * day
        horizon_name = f"Day {day}"
        model_name = f"isb_aqi_day_{day}"
        
        print(f"\n--- Processing {horizon_name} (+{horizon_hours}h) ---")
        
        target_time = current_row['datetime'] + pd.Timedelta(hours=horizon_hours)
        target_time_str = target_time.strftime('%Y-%m-%dT%H:00')
        
        try:
            w_idx = w_res['hourly']['time'].index(target_time_str)
        except ValueError:
            print(f"WARNING: Target forecast time {target_time_str} not found. Skipping.")
            continue
            
        wind_speed = w_res['hourly']['wind_speed_10m'][w_idx]
        wind_dir = w_res['hourly']['wind_direction_10m'][w_idx]
        wind_u = -wind_speed * np.sin(np.radians(wind_dir))
        wind_v = -wind_speed * np.cos(np.radians(wind_dir))
        
        X_infer = pd.DataFrame({
            'pm2_5_ugm3': [current_row['pm2_5_ugm3']],
            'pm25_lag_24h': [lag_row['pm2_5_ugm3']],
            'pm25_rolling_24h': [current_row['pm25_rolling_24h']],
            'future_temp': [w_res['hourly']['temperature_2m'][w_idx]],
            'future_humidity': [w_res['hourly']['relative_humidity_2m'][w_idx]],
            'future_pressure': [w_res['hourly']['surface_pressure'][w_idx]],
            'future_wind_u': [wind_u],
            'future_wind_v': [wind_v],
            'hour_sin': [current_row['hour_sin']],
            'hour_cos': [current_row['hour_cos']],
            'month_sin': [current_row['month_sin']],
            'month_cos': [current_row['month_cos']],
        })
        
        print(f"Downloading {model_name}...")
        try:
            available_models = mr.get_models(model_name)
            latest_version = max([m.version for m in available_models])
            print(f"Detected latest version: {latest_version}")
            hw_model = mr.get_model(model_name, version=latest_version)
            model_dir = hw_model.download()
            model = joblib.load(os.path.join(model_dir, f"day_{day}_model.pkl"))
        except Exception as e:
            print(f"ERROR: Could not fetch {model_name}. Details: {e}")
            continue
        
        prediction = float(model.predict(X_infer)[0])
        
        print(f"Saving to Supabase...")
        insert_query = text("""
            INSERT INTO predictions_aqiforecast (created_at, target_horizon, predicted_pm25)
            VALUES (NOW(), :horizon, :pred)
        """)
        with engine.begin() as conn:
            conn.execute(insert_query, {"horizon": horizon_name, "pred": round(prediction, 2)})
            
        print(f"SUCCESS: {horizon_name} Forecast saved -> {round(prediction, 2)} µg/m³")

if __name__ == "__main__":
    run_inference()