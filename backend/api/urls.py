from django.urls import path
from .views import PredictAQIView

urlpatterns = [
    path('predict/', PredictAQIView.as_view(), name='predict_aqi'),
]