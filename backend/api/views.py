from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from predictions.models import AQIPrediction

class PredictAQIView(APIView):
    def get(self, request):
        try:
            latest_predictions = {}
            for day in ["day_1", "day_2", "day_3"]:
                record = AQIPrediction.objects.filter(horizon=day).latest('timestamp')
                latest_predictions[day] = {
                    "mean": record.predicted_mean,
                    "max": record.predicted_max,
                    "timestamp": record.timestamp
                }
            
            return Response(latest_predictions, status=status.HTTP_200_OK)
        except AQIPrediction.DoesNotExist:
            return Response({"error": "No predictions found. Run background task first."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)