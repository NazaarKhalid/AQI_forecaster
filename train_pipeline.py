import os
import hopsworks
import pandas as pd
import xgboost as xgb
import joblib
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.multioutput import MultiOutputRegressor

load_dotenv()

print("Connecting to Hopsworks...")
project = hopsworks.login(api_key_value=os.environ.get("HOPSWORKS_API_KEY"))
fs = project.get_feature_store()
mr = project.get_model_registry()

print("Retrieving Feature View...")
feature_view = fs.get_feature_view("isb_aqi_feature_view", version=1)

print("Fetching training data...")
X, y = feature_view.training_data(description="Full dataset for training")

X['date'] = pd.to_datetime(X['datetime']).dt.date
y['date'] = X['date']

X_daily = X.drop(columns=['datetime']).groupby('date').mean(numeric_only=True)
y_daily = y.groupby('date').agg(
    aqi_mean=('current_aqi', 'mean'), 
    aqi_max=('current_aqi', 'max')
)

horizons = {
    "day_1": 1,
    "day_2": 2,
    "day_3": 3
}

base_model_dir = "aqi_model_dir"

for day_label, shift_days in horizons.items():
    print(f"\n--- Training Model for {day_label} (+{shift_days} days) ---")
    
    target = y_daily.shift(-shift_days)
    
    valid_indices = target.dropna().index
    X_valid = X_daily.loc[valid_indices]
    y_valid = target.loc[valid_indices]
    
    X_train, X_test, y_train, y_test = train_test_split(X_valid, y_valid, test_size=0.2, shuffle=False)
    
    base_model = xgb.XGBRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        random_state=42
    )
    
    model = MultiOutputRegressor(base_model)
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    
    mse_mean = mean_squared_error(y_test['aqi_mean'], preds[:, 0])
    mae_mean = mean_absolute_error(y_test['aqi_mean'], preds[:, 0])
    r2_mean = r2_score(y_test['aqi_mean'], preds[:, 0])
    
    mse_max = mean_squared_error(y_test['aqi_max'], preds[:, 1])
    mae_max = mean_absolute_error(y_test['aqi_max'], preds[:, 1])
    r2_max = r2_score(y_test['aqi_max'], preds[:, 1])
    
    print(f"Metrics for {day_label}:")
    print(f"  Mean AQI - MSE: {mse_mean:.2f}, MAE: {mae_mean:.2f}, R2: {r2_mean:.2f}")
    print(f"  Max AQI  - MSE: {mse_max:.2f}, MAE: {mae_max:.2f}, R2: {r2_max:.2f}")
    
    model_path = os.path.join(base_model_dir, day_label)
    os.makedirs(model_path, exist_ok=True)
    joblib.dump(model, f"{model_path}/multi_xgboost_aqi_model.pkl")
    
    model_name = f"isb_aqi_xgboost_{day_label}"
    aqi_model = mr.python.create_model(
        name=model_name, 
        metrics={"mse_mean": mse_mean, "mse_max": mse_max},
        description=f"MultiOutput XGBRegressor predicting mean & max AQI {shift_days} days ahead"
    )
    aqi_model.save(model_path)

print("\nTraining Pipeline Complete. All 3 multi-output models uploaded successfully.")