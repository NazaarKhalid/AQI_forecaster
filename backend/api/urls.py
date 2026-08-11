from django.urls import path
from . import views
urlpatterns = [
    path('predict/', views.get_latest_forecast, name='get_latest_forecast'),
]