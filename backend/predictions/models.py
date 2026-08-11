from django.db import models

class AqiForecast(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    target_horizon = models.CharField(max_length=50, default="Day 1")
    predicted_pm25 = models.FloatField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.target_horizon} - {self.predicted_pm25} µg/m³"