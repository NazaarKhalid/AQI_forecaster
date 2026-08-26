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

    ai_insight = models.TextField(null=True, blank=True)

    class Meta:
        managed = True
        db_table = 'aqi_features'
        ordering = ['-datetime']


class AqiForecast(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    target_time = models.DateTimeField(null=True)
    target_horizon = models.CharField(max_length=50)
    predicted_pm25 = models.FloatField()

    class Meta:
        db_table = 'predictions_aqiforecast'
        ordering = ['target_time', '-created_at']

    def __str__(self):
        t_time = self.target_time.strftime('%Y-%m-%d %H:00') if self.target_time else "Unknown Time"
        return f"{self.target_horizon} for {t_time} - {self.predicted_pm25} µg/m³"