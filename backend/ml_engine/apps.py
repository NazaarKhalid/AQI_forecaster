import os
import joblib
import hopsworks
from django.apps import AppConfig
from dotenv import load_dotenv

load_dotenv()

class MlEngineConfig(AppConfig):
    name = 'ml_engine'
    default_auto_field = 'django.db.models.BigAutoField'
    
    ml_model = None

    def ready(self):
        if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('SERVER_GATEWAY'):
            print("Starting ML Engine: Connecting to Hopsworks...")
            try:
                project = hopsworks.login(api_key_value=os.environ.get("HOPSWORKS_API_KEY"))
                mr = project.get_model_registry()
                
                print("Downloading day_1 XGBoost model...")
                hw_model = mr.get_model("isb_aqi_day_1", version=1)
                
                model_dir = hw_model.download()
                model_path = os.path.join(model_dir, "day_1_model.pkl")
                
                self.ml_model = joblib.load(model_path)
                print("Model successfully locked into memory! Ready for fast inference.")
            except Exception as e:
                print(f"WARNING: Failed to load ML model on startup: {e}")
