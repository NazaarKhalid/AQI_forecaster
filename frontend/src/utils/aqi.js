export const getAqiColor = (aqi) => {
  if (aqi <= 50) return 'bg-green-500';
  if (aqi <= 100) return 'bg-yellow-400';
  if (aqi <= 150) return 'bg-orange-500';
  if (aqi <= 200) return 'bg-red-500';
  if (aqi <= 300) return 'bg-purple-500';
  return 'bg-rose-900';
};

export const getAqiShadow = (aqi) => {
  if (aqi <= 50) return 'shadow-[0_8px_30px_rgb(34,197,94,0.3)]';
  if (aqi <= 100) return 'shadow-[0_8px_30px_rgb(250,204,21,0.3)]';
  if (aqi <= 150) return 'shadow-[0_8px_30px_rgb(249,115,22,0.3)]';
  if (aqi <= 200) return 'shadow-[0_8px_30px_rgb(239,68,68,0.3)]';
  if (aqi <= 300) return 'shadow-[0_8px_30px_rgb(168,85,247,0.3)]';
  return 'shadow-[0_8px_30px_rgb(136,19,55,0.3)]';
};

export const getAqiTextColor = (aqi) => {
  if (aqi <= 50) return 'text-green-600';
  if (aqi <= 100) return 'text-yellow-600';
  if (aqi <= 150) return 'text-orange-500';
  if (aqi <= 200) return 'text-red-500';
  if (aqi <= 300) return 'text-purple-500';
  return 'text-rose-900';
};

export const getAqiLabel = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

export const formatForecastDate = (horizonStr) => {
  const daysToAdd = parseInt(horizonStr.replace("Day ", ""));
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const getActivityRecommendations = (aqi) => {
  return {
    exercise: aqi <= 100,
    windows: aqi <= 50,
    outdoors: aqi <= 150,
  };
};

export const calculateAqi = (pm25) => {
  if (pm25 <= 12) return Math.round((50/12)*pm25);
  if (pm25 <= 35.4) return Math.round(((100-51)/(35.4-12.1))*(pm25-12.1)+51);
  if (pm25 <= 55.4) return Math.round(((150-101)/(55.4-35.5))*(pm25-35.5)+101);
  return Math.round(((200-151)/(150.4-55.5))*(pm25-55.5)+151); 
};