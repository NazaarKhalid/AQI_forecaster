from rest_framework.views import APIView
from rest_framework.response import Response
from predictions.models import AqiFeature, AqiForecast
from .serializers import AqiFeatureSerializer, AqiForecastSerializer, SubscriberSerializer
from rest_framework import status

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