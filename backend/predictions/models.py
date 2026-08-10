from django.db import models

class AQIPrediction(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    horizon = models.CharField(max_length=10, default="day_1")
    predicted_mean = models.FloatField(null=True)
    predicted_max = models.FloatField(null=True)

    def __str__(self):
        return f"{self.timestamp} ({self.horizon}) - Mean: {self.predicted_mean}, Max: {self.predicted_max}"