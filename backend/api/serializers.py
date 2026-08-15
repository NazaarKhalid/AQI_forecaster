from rest_framework import serializers
from predictions.models import AqiFeature, AqiForecast
from .utils import calculate_aqi_from_pm25
from alerts.models import Subscriber

class AqiFeatureSerializer(serializers.ModelSerializer):
    aqi = serializers.SerializerMethodField()
    
    class Meta:
        model = AqiFeature
        fields = [
            'datetime', 
            'pm2_5_ugm3', 
            'aqi', 
            'temp_celsius', 
            'humidity_pct', 
            'wind_u', 
            'wind_v'
        ]
        
    def get_aqi(self, obj):
        return calculate_aqi_from_pm25(obj.pm2_5_ugm3)

class AqiForecastSerializer(serializers.ModelSerializer):
    aqi = serializers.SerializerMethodField()
    
    class Meta:
        model = AqiForecast
        fields = ['target_horizon', 'predicted_pm25', 'aqi', 'created_at']
        
    def get_aqi(self, obj):
        return calculate_aqi_from_pm25(obj.predicted_pm25)

class SubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = ['email']