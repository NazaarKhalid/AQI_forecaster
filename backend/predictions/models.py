from django.db import models

class AqiFeature(models.Model):
    datetime = models.DateTimeField(primary_key=True)
    pm2_5_ugm3 = models.FloatField()
    temp_celsius = models.FloatField()
    humidity_pct = models.FloatField()
    pressure_hpa = models.FloatField()
    wind_u = models.FloatField()
    wind_v = models.FloatField()
    pm25_rolling_24h = models.FloatField(null=True, blank=True)
    
    hour_sin = models.FloatField()
    hour_cos = models.FloatField()
    month_sin = models.FloatField()
    month_cos = models.FloatField()

    class Meta:
        managed = False
        db_table = 'aqi_features'
        ordering = ['-datetime']


class AqiForecast(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    target_horizon = models.CharField(max_length=50)
    predicted_pm25 = models.FloatField()

    class Meta:
        db_table = 'predictions_aqiforecast'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.target_horizon} Forecast ({self.created_at.strftime('%Y-%m-%d %H:%00')}) - {self.predicted_pm25} µg/m³"