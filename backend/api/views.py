import json
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from predictions.models import AqiFeature, AqiForecast
from .serializers import AqiFeatureSerializer, AqiForecastSerializer, SubscriberSerializer

class DashboardAPIView(APIView):
    def get(self, request):
        recent_features = AqiFeature.objects.all()[:24]
        current_condition = recent_features[0] if recent_features else None
        
        forecasts = []
        for horizon in ['Day 1', 'Day 2', 'Day 3']:
            latest_forecast = AqiForecast.objects.filter(target_horizon=horizon).first()
            if latest_forecast:
                forecasts.append(latest_forecast)
                
        current_data = AqiFeatureSerializer(current_condition).data if current_condition else None
        history_data = AqiFeatureSerializer(recent_features, many=True).data
        forecast_data = AqiForecastSerializer(forecasts, many=True).data
        
        return Response({
            "current": current_data,
            "forecast": forecast_data,
            "history": history_data
        })

class SubscribeAPIView(APIView):
    def post(self, request):
        serializer = SubscriberSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Successfully subscribed to alerts!"}, status=status.HTTP_201_CREATED)
            
        if 'email' in serializer.errors and serializer.errors['email'][0].code == 'unique':
            return Response({"message": "You are already on the alert list!"}, status=status.HTTP_200_OK)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ModelMetricsAPIView(APIView):
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT horizon, model_type, r2, mae, rmse, shap_data FROM model_metrics")
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()

        metrics_data = {}
        horizon_map = {'day_1': 'Day 1', 'day_2': 'Day 2', 'day_3': 'Day 3'}

        for row in rows:
            data = dict(zip(columns, row))
            shap_data = json.loads(data['shap_data']) if isinstance(data['shap_data'], str) else data['shap_data']
            mapped_horizon = horizon_map.get(data['horizon'], data['horizon'])
            
            metrics_data[mapped_horizon] = {
                "model_type": data['model_type'],
                "mae": round(data['mae'], 2),
                "rmse": round(data['rmse'], 2),
                "r2": round(data['r2'], 2),
                "shap_importance": shap_data
            }

        return Response({"models": metrics_data})