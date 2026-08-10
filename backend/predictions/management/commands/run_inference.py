from django.core.management.base import BaseCommand
from ml_engine.inference import AQIPredictor
from predictions.models import AQIPrediction

class Command(BaseCommand):
    help = 'Fetches latest features, runs multi-output models, and saves predictions to SQLite'

    def handle(self, *args, **kwargs):
        self.stdout.write("Initializing AQIPredictor...")
        predictor = AQIPredictor()
        
        self.stdout.write("Running inference...")
        predictions = predictor.get_predictions()
        
        for horizon, vals in predictions.items():
            AQIPrediction.objects.create(
                horizon=horizon, 
                predicted_mean=vals['mean'],
                predicted_max=vals['max']
            )
            
        self.stdout.write(self.style.SUCCESS("Background inference complete and saved to database."))