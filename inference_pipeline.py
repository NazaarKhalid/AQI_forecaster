import os
import requests
import pandas as pd
import numpy as np
import joblib
import hopsworks
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()
engine = create_engine(os.environ.get("DATABASE_URL"))

ISB_LAT, ISB_LON = 33.6938, 73.0651

def calculate_aqi(pm25):
    if pm25 <= 12.0: return round((50/12) * pm25)
    elif pm25 <= 35.4: return round(((100-51)/(35.4-12.1)) * (pm25-12.1) + 51)
    elif pm25 <= 55.4: return round(((150-101)/(55.4-35.5)) * (pm25-35.5) + 101)
    elif pm25 <= 150.4: return round(((200-151)/(150.4-55.5)) * (pm25-55.5) + 151)
    elif pm25 <= 250.4: return round(((300-201)/(250.4-150.5)) * (pm25-150.5) + 201)
    else: return round(((500-301)/(500.4-250.5)) * (pm25-250.5) + 301)

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
    
    forecasts = {}
    
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
        forecasts[day] = prediction #storing for email thing later
        
        print(f"Saving to Supabase...")
        insert_query = text("""
            INSERT INTO predictions_aqiforecast (created_at, target_horizon, predicted_pm25)
            VALUES (NOW(), :horizon, :pred)
        """)
        with engine.begin() as conn:
            conn.execute(insert_query, {"horizon": horizon_name, "pred": round(prediction, 2)})
            
        print(f"SUCCESS: {horizon_name} Forecast saved -> {round(prediction, 2)} µg/m³")

    print("\n--- Checking Email Alerts ---")
    if 1 in forecasts:
        tomorrow_pm25 = forecasts[1]
        tomorrow_aqi = calculate_aqi(tomorrow_pm25)
        
        if tomorrow_aqi > 150:
            print(f"⚠️ High AQI predicted for tomorrow ({tomorrow_aqi}). Triggering email alerts...")
            
            try:
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT email FROM alerts_subscriber WHERE is_active = True;"))
                    subscribers = [row[0] for row in result]
                
                if subscribers:
                    sender_email = os.environ.get("EMAIL_HOST_USER")
                    sender_password = os.environ.get("EMAIL_HOST_PASSWORD")
                    
                    if not sender_email or not sender_password:
                        print("❌ Email credentials missing in environment variables. Skipping alerts.")
                    else:
                        server = smtplib.SMTP('smtp.gmail.com', 587)
                        server.starttls()
                        server.login(sender_email, sender_password)
                        
                        for recipient in subscribers:
                            msg = MIMEMultipart()
                            msg['From'] = f"AQI Forecaster <{sender_email}>"
                            msg['To'] = recipient
                            msg['Subject'] = "Islamabad Air Quality Alert for Tomorrow"
                            
                            body = (
                                f"Hello,\n\n"
                                f"Our AI forecasting model predicts an AQI of {tomorrow_aqi} for tomorrow in Islamabad. "
                                f"This falls into the unhealthy range.\n\n"
                                f"Please take necessary precautions, such as limiting prolonged outdoor exertion and keeping windows closed.\n\n"
                                f"Stay safe,\n"
                            )
                            msg.attach(MIMEText(body, 'plain'))
                            
                            server.send_message(msg)
                            print(f"Alert sent to: {recipient}")
                            
                        server.quit()
                        print("✅ All automated alerts dispatched successfully.")
                else:
                    print("No active subscribers found in the database.")
            except Exception as e:
                print(f"❌ Failed to process or send emails: {e}")
        else:
            print(f"Tomorrow's AQI is {tomorrow_aqi} (Safe). No email alerts triggered.")

if __name__ == "__main__":
    run_inference()