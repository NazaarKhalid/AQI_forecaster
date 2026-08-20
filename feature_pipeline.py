import os
import requests
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from dotenv import load_dotenv
from google import genai
load_dotenv()

ISB_LAT, ISB_LON = 33.6938, 73.0651
OWM_API_KEY = os.environ.get("OWM_API_KEY")
DATABASE_URL = os.environ.get("DATABASE_URL")

engine = create_engine(DATABASE_URL)

now = pd.Timestamp.now('UTC')
start_dt = now - pd.Timedelta(days=14)

print("Fetching recent weather and AQI data...")
start_ts = int(start_dt.timestamp())
end_ts = int(now.timestamp())
owm_url = f"http://api.openweathermap.org/data/2.5/air_pollution/history?lat={ISB_LAT}&lon={ISB_LON}&start={start_ts}&end={end_ts}&appid={OWM_API_KEY}"

res = requests.get(owm_url)
aqi_records = []
if res.status_code == 200:
    for item in res.json().get('list', []):
        aqi_records.append({
            'datetime': pd.to_datetime(item['dt'], unit='s'),
            'current_aqi': item['main']['aqi'],
            'pm2_5_ugm3': item['components']['pm2_5']
        })

df_aqi = pd.DataFrame(aqi_records).drop_duplicates(subset=['datetime']).sort_values('datetime').reset_index(drop=True)

w_url = "https://api.open-meteo.com/v1/forecast"
w_params = {
    "latitude": ISB_LAT, "longitude": ISB_LON,
    "past_days": 14,
    "forecast_days": 1,
    "hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "wind_direction_10m"],
    "timezone": "GMT"
}
w_res = requests.get(w_url, params=w_params).json()

df_w = pd.DataFrame({
    'datetime': pd.to_datetime(w_res['hourly']['time']),
    'temp_celsius': w_res['hourly']['temperature_2m'],
    'humidity_pct': w_res['hourly']['relative_humidity_2m'],
    'pressure_hpa': w_res['hourly']['surface_pressure'],
    'wind_speed': w_res['hourly']['wind_speed_10m'],
    'wind_dir': w_res['hourly']['wind_direction_10m']
})

df = pd.merge(df_w, df_aqi, on='datetime', how='inner')
df['wind_u'] = -df['wind_speed'] * np.sin(np.radians(df['wind_dir']))
df['wind_v'] = -df['wind_speed'] * np.cos(np.radians(df['wind_dir']))
df['pm25_rolling_24h'] = df['pm2_5_ugm3'].rolling(window=24, min_periods=12).mean()

df['hour_sin'] = np.sin(2 * np.pi * df['datetime'].dt.hour / 24)
df['hour_cos'] = np.cos(2 * np.pi * df['datetime'].dt.hour / 24)
df['month_sin'] = np.sin(2 * np.pi * df['datetime'].dt.month / 12)
df['month_cos'] = np.cos(2 * np.pi * df['datetime'].dt.month / 12)

if df['datetime'].dt.tz is None:
    df['datetime'] = df['datetime'].dt.tz_localize('UTC')
df.dropna(inplace=True)

print("Checking Supabase for latest records...")
try:
    max_dt_query = "SELECT MAX(datetime) FROM aqi_features"
    max_dt_df = pd.read_sql(max_dt_query, engine)
    latest_db_time = pd.to_datetime(max_dt_df.iloc[0, 0], utc=True) if not max_dt_df.empty and max_dt_df.iloc[0, 0] else None
except Exception as e:
    latest_db_time = None

if latest_db_time:
    df = df[df['datetime'] > latest_db_time]

if not df.empty:
    print(f"Pushing {len(df)} new hourly records to Supabase...")
    
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    
    ai_insights = []
    
    for pm25 in df['pm2_5_ugm3']:
        cigarettes = round(pm25 / 22.0, 1)
        prompt = f"The current PM2.5 level in Islamabad is {pm25} ug/m3. Breathing this air for 24 hours is equivalent to smoking {cigarettes} cigarettes. Write a 2-sentence conversational alert for a dashboard. Keep it punchy, direct, and slightly urgent if the number is high. Do not use hashtags, bold text, or markdown formatting. Just output the raw text."
        
        try:
            response = client.models.generate_content(
                model = 'gemini-3.5-flash',
                contents = prompt
            )
            ai_insights.append(response.text.strip())
            print("Gemini AI insight generated successfully.")
        except Exception as e:
            print(f"Gemini API failed: {e}")
            ai_insights.append(f"Current PM2.5 levels are equivalent to {cigarettes} cigarettes. Check the AQI index for health guidelines.")
            
    df['ai_insight'] = ai_insights
    
    df.to_sql('aqi_features', con=engine, if_exists='append', index=False)
    print("Database sync complete.")
else:
    print("Database is already up to date. No new rows added.")