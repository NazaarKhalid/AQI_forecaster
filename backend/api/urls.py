from django.urls import path
from .views import DashboardAPIView, SubscribeAPIView

urlpatterns = [
    path('dashboard/', DashboardAPIView.as_view(), name='api-dashboard'),
    path('subscribe/', SubscribeAPIView.as_view(), name='api-subscribe'),
]