import os
import requests
import pandas as pd
import numpy as np
from django.apps import apps
from sqlalchemy import create_engine
from predictions.models import AqiForecast
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.environ.get("DATABASE_URL"))

ISB_LAT, ISB_LON = 33.6938, 73.0651

def generate_and_save_forecast():
    ml_app = apps.get_app_config('ml_engine')
    model = ml_app.ml_model
    
    if model is None:
        print("ERROR: ML Model is not loaded into memory.")
        return False

    query = "SELECT * FROM aqi_features ORDER BY datetime DESC LIMIT 25"
    
    try:
        df_db = pd.read_sql(query, engine)
        if len(df_db) < 25:
            print("ERROR: Not enough history in database to calculate 24h lag.")
            return False
            
        df_db = df_db.sort_values('datetime').reset_index(drop=True)
        
        current_row = df_db.iloc[-1]
        lag_row = df_db.iloc[0]
        
        w_url = "https://api.open-meteo.com/v1/forecast"
        w_params = {
            "latitude": ISB_LAT, "longitude": ISB_LON,
            "forecast_days": 2, 
            "hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "wind_direction_10m"],
            "timezone": "GMT"
        }
        w_res = requests.get(w_url, params=w_params).json()
        
        target_time = current_row['datetime'] + pd.Timedelta(hours=24)
        target_time_str = target_time.strftime('%Y-%m-%dT%H:00')
        
        try:
            w_idx = w_res['hourly']['time'].index(target_time_str)
        except ValueError:
            print(f"ERROR: Target forecast time {target_time_str} not found in Open-Meteo response.")
            return False
            
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
        
        prediction = float(model.predict(X_infer)[0])
        
        AqiForecast.objects.create(
            target_horizon="Day 1",
            predicted_pm25=round(prediction, 2)
        )
        print(f"SUCCESS: Forecast saved to DB -> {round(prediction, 2)} µg/m³")
        return True
        
    except Exception as e:
        print(f"ERROR executing inference: {e}")
        return False