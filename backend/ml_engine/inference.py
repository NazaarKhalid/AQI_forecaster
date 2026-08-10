import os
import hopsworks
import joblib
import pandas as pd

class AQIPredictor:
    def __init__(self):
        self.project = hopsworks.login(api_key_value=os.environ.get("HOPSWORKS_API_KEY"))
        self.fs = self.project.get_feature_store()
        self.mr = self.project.get_model_registry()
        
        self.feature_view = self.fs.get_feature_view("isb_aqi_feature_view", version=1)
        
        self.models = {}
        for day in ["day_1", "day_2", "day_3"]:
            model_meta = self.mr.get_model(f"isb_aqi_xgboost_{day}", version=2)
            model_dir = model_meta.download()
            self.models[day] = joblib.load(f"{model_dir}/multi_xgboost_aqi_model.pkl")

    def get_predictions(self):
        batch_data = self.feature_view.get_batch_data()
        
        latest_features = batch_data.sort_values('datetime').tail(24)
        latest_features['date'] = pd.to_datetime(latest_features['datetime']).dt.date
        daily_features = latest_features.drop(columns=['datetime']).groupby('date').mean(numeric_only=True).tail(1)
        
        predictions = {}
        for day, model in self.models.items():
            pred_array = model.predict(daily_features)[0]
            predictions[day] = {
                "mean": float(pred_array[0]),
                "max": float(pred_array[1])
            }
            
        return predictions