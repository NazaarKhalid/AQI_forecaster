import os
import requests
import pandas as pd
import numpy as np
import hopsworks
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

ISB_LAT, ISB_LON = 33.6938, 73.0651
OWM_API_KEY = os.environ.get("OWM_API_KEY")

if not OWM_API_KEY:
    raise ValueError("Missing OpenWeatherMap API Key")

end_date = datetime.now()
start_date = end_date - timedelta(days=7)

start_str = start_date.strftime("%Y-%m-%d")
end_str = end_date.strftime("%Y-%m-%d")
start_unix = int(start_date.timestamp())
end_unix = int(end_date.timestamp())

print(f"Fetching OpenWeatherMap AQI: {start_str} to {end_str}")
owm_url = f"http://api.openweathermap.org/data/2.5/air_pollution/history?lat={ISB_LAT}&lon={ISB_LON}&start={start_unix}&end={end_unix}&appid={OWM_API_KEY}"
owm_res = requests.get(owm_url).json()

if 'list' not in owm_res:
    raise ValueError(f"OpenWeather API Error: {owm_res}")

aqi_records = [{
    'datetime': pd.to_datetime(item['dt'], unit='s'),
    'current_aqi': item['main']['aqi'],
    'pm2_5_ugm3': item['components']['pm2_5']
} for item in owm_res['list']]

df_aqi = pd.DataFrame(aqi_records)

print(f"Fetching Open-Meteo Weather: {start_str} to {end_str}")
w_url = "https://api.open-meteo.com/v1/forecast"
w_params = {
    "latitude": ISB_LAT, "longitude": ISB_LON,
    "start_date": start_str, "end_date": end_str,
    "hourly": ["temperature_2m", "relative_humidity_2m", "surface_pressure", "wind_speed_10m", "wind_direction_10m"],
    "timezone": "GMT"
}
w_res = requests.get(w_url, params=w_params).json()

if 'hourly' not in w_res:
    raise ValueError(f"Open-Meteo API Error: {w_res}")

df_w = pd.DataFrame({
    'datetime': pd.to_datetime(w_res['hourly']['time']),
    'temp_celsius': w_res['hourly']['temperature_2m'],
    'humidity_pct': w_res['hourly']['relative_humidity_2m'],
    'pressure_hpa': w_res['hourly']['surface_pressure'],
    'wind_speed': w_res['hourly']['wind_speed_10m'],
    'wind_dir': w_res['hourly']['wind_direction_10m']
})

df = pd.merge(df_w, df_aqi, on='datetime', how='inner')
df = df.drop_duplicates(subset=['datetime']).sort_values('datetime').reset_index(drop=True)

# Calculate wind vectors
df['wind_u'] = -df['wind_speed'] * np.sin(np.radians(df['wind_dir']))
df['wind_v'] = -df['wind_speed'] * np.cos(np.radians(df['wind_dir']))

# Calculate 24-hour PM2.5 momentum
df['pm25_rolling_24h'] = df['pm2_5_ugm3'].rolling(window=24, min_periods=1).mean()
df['pm25_lag_24h'] = df['pm2_5_ugm3'].shift(24)

# Calculate cyclical time encodings
df['hour_sin'] = np.sin(2 * np.pi * df['datetime'].dt.hour / 24)
df['hour_cos'] = np.cos(2 * np.pi * df['datetime'].dt.hour / 24)
df['month_sin'] = np.sin(2 * np.pi * df['datetime'].dt.month / 12)
df['month_cos'] = np.cos(2 * np.pi * df['datetime'].dt.month / 12)

df.dropna(inplace=True)

print("Pushing data to Hopsworks...")
project = hopsworks.login(api_key_value=os.environ.get("HOPSWORKS_API_KEY"))
fs = project.get_feature_store()

aqi_fg = fs.get_or_create_feature_group(
    name="isb_aqi_features_prod_v2",
    version=1,
    description="Production hourly weather and PM2.5 data for Islamabad",
    primary_key=["datetime"],
    event_time="datetime",
    online_enabled=True,
    time_travel_format="HUDI"
)

aqi_fg.insert(df, write_options={"wait_for_job": False})
print("Feature Pipeline Complete.")