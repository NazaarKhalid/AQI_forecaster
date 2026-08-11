from django.http import JsonResponse
from predictions.models import AqiForecast

def get_latest_forecast(request):
    latest_forecast = AqiForecast.objects.first()
    
    if not latest_forecast:
        return JsonResponse({"error": "No forecasts available yet."}, status=404)
        
    return JsonResponse({
        "status": "success",
        "data": {
            "horizon": latest_forecast.target_horizon,
            "predicted_pm25": latest_forecast.predicted_pm25,
            "generated_at": latest_forecast.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
    })