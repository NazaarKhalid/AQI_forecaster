import os
import json
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import hopsworks
import shap
from hsml.schema import Schema
from hsml.model_schema import ModelSchema
from sqlalchemy import create_engine
from dotenv import load_dotenv
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)

print("Pulling full historical dataset from Supabase...")
df = pd.read_sql("SELECT * FROM aqi_features ORDER BY datetime ASC", engine)
df['datetime'] = pd.to_datetime(df['datetime'])

print("Connecting to Hopsworks Model Registry...")
project = hopsworks.login(api_key_value=os.environ.get("HOPSWORKS_API_KEY"))
mr = project.get_model_registry()

horizons = {
    "day_1": (24, "Day 1"),
    "day_2": (48, "Day 2"),
    "day_3": (72, "Day 3"),
}

all_metrics = []

for day_label, (k_hours, label) in horizons.items():
    print(f"\n--- Training {label} (+{k_hours}h) ---")
    df_h = df.copy()
    
    df_h['target_pm25'] = df_h['pm25_rolling_24h'].shift(-k_hours)
    df_h['pm25_lag_24h'] = df_h['pm2_5_ugm3'].shift(24)
    df_h['future_temp'] = df_h['temp_celsius'].shift(-k_hours)
    df_h['future_humidity'] = df_h['humidity_pct'].shift(-k_hours)
    df_h['future_pressure'] = df_h['pressure_hpa'].shift(-k_hours)
    df_h['future_wind_u'] = df_h['wind_u'].shift(-k_hours)
    df_h['future_wind_v'] = df_h['wind_v'].shift(-k_hours)
    
    df_h.dropna(inplace=True)
    df_h.reset_index(drop=True, inplace=True)
    
    features = [
        'pm2_5_ugm3', 'pm25_lag_24h', 'pm25_rolling_24h',
        'future_temp', 'future_humidity', 'future_pressure',
        'future_wind_u', 'future_wind_v',
        'hour_sin', 'hour_cos', 'month_sin', 'month_cos'
    ]
    
    split_idx = int(len(df_h) * 0.8)
    X_tr, X_te = df_h.loc[:split_idx-1, features], df_h.loc[split_idx:, features]
    y_tr, y_te = df_h.loc[:split_idx-1, 'target_pm25'], df_h.loc[split_idx:, 'target_pm25']
    
    model = xgb.XGBRegressor(n_estimators=200, learning_rate=0.04, max_depth=6, random_state=42, n_jobs=-1)
    model.fit(X_tr, y_tr)
    
    preds = model.predict(X_te)
    r2 = r2_score(y_te, preds)
    mae = mean_absolute_error(y_te, preds)
    rmse = float(np.sqrt(mean_squared_error(y_te, preds)))          
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_te)
    mean_abs_shap = np.abs(shap_values).mean(axis=0)
    
    shap_list = [{"feature": f, "importance": float(v)} for f, v in zip(features, mean_abs_shap)]
    shap_list = sorted(shap_list, key=lambda x: x["importance"], reverse=True)
    
    all_metrics.append({
        "horizon": day_label,
        "model_type": "XGBoost Regressor",
        "r2": float(r2),
        "mae": float(mae),
        "rmse": float(rmse),
        "shap_data": json.dumps(shap_list)
    })
    
    print(f"R² Score: {r2:.4f} | MAE: {mae:.2f}")
    
    model_dir = f"models/{day_label}"
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, f"{day_label}_model.pkl")
    joblib.dump(model, model_path)
    
    input_schema = Schema(X_tr)
    output_schema = Schema(y_tr)
    model_schema = ModelSchema(input_schema, output_schema)
    
    hw_model = mr.python.create_model(
        name=f"isb_aqi_{day_label}", 
        metrics={"r2": r2, "mae": mae, "rmse": rmse},
        model_schema=model_schema,
        description=f"XGBoost predicting PM2.5 for {label} ahead"
    )
    hw_model.save(model_dir)
    print(f"Successfully pushed {day_label} model to Hopsworks!")

print("Pushing model metrics and SHAP data to Supabase...")
metrics_df = pd.DataFrame(all_metrics)
metrics_df.to_sql("model_metrics", engine, if_exists="replace", index=False)
print("Pipeline complete.")