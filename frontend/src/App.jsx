import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Droplets, Thermometer, Calendar, Menu, X, Wind, Activity, Home, ShieldAlert, Share2, Check } from 'lucide-react';

// Utility Functions
const getAqiColor = (aqi) => {
  if (aqi <= 50) return 'bg-green-500';
  if (aqi <= 100) return 'bg-yellow-400';
  if (aqi <= 150) return 'bg-orange-500';
  if (aqi <= 200) return 'bg-red-500';
  if (aqi <= 300) return 'bg-purple-500';
  return 'bg-rose-900';
};

const getAqiTextColor = (aqi) => {
  if (aqi <= 50) return 'text-green-600';
  if (aqi <= 100) return 'text-yellow-600';
  if (aqi <= 150) return 'text-orange-500';
  if (aqi <= 200) return 'text-red-500';
  if (aqi <= 300) return 'text-purple-500';
  return 'text-rose-900';
};

const getAqiLabel = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

const formatForecastDate = (horizonStr) => {
  const daysToAdd = parseInt(horizonStr.replace("Day ", ""));
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const getActivityRecommendations = (aqi) => {
  return {
    exercise: aqi <= 100,
    windows: aqi <= 50,
    outdoors: aqi <= 150,
  };
};

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/dashboard/')
      .then(response => {
        const rawHistory = response.data.history;
        let trendDelta = 0;
        
        if (rawHistory.length === 24) {
             const currentAqi = calculateAqi(rawHistory[0].pm2_5_ugm3);
             const yesterdayAqi = calculateAqi(rawHistory[23].pm2_5_ugm3);
             trendDelta = currentAqi - yesterdayAqi;
        }

        const formattedHistory = rawHistory.reverse().map(item => {
          const d = new Date(item.datetime);
          const today = new Date();
          const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
          const timeString = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          const timeLabel = isToday ? `Today, ${timeString}` : `Yesterday, ${timeString}`;
          return { timeLabel: timeLabel, aqi: item.aqi };
        });
        
        setData({ 
            ...response.data, 
            history: formattedHistory,
            delta: trendDelta 
        });
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  const calculateAqi = (pm25) => {
      if (pm25 <= 12) return Math.round((50/12)*pm25);
      if (pm25 <= 35.4) return Math.round(((100-51)/(35.4-12.1))*(pm25-12.1)+51);
      if (pm25 <= 55.4) return Math.round(((150-101)/(55.4-35.5))*(pm25-35.5)+101);
      return Math.round(((200-151)/(150.4-55.5))*(pm25-55.5)+151); 
  };

  const handleShare = () => {
    const text = `Islamabad AQI is currently ${data.current.aqi} (${getAqiLabel(data.current.aqi)}). See the 3-day AI forecast at [put website link here later]`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscribeStatus({ type: 'loading', message: 'Subscribing...' });
    
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/subscribe/', { email });
      setSubscribeStatus({ type: 'success', message: response.data.message });
      setEmail('');
    } catch (error) {
      setSubscribeStatus({ type: 'error', message: 'Please enter a valid email address.' });
    }
    
    setTimeout(() => setSubscribeStatus({ type: '', message: '' }), 5000);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-xl font-semibold">Loading AI Forecast...</div>;
  if (!data || !data.current) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-500">Error connecting to backend.</div>;

  const currentAqi = data.current.aqi;
  const currentAqiColor = getAqiColor(currentAqi);
  const recommendations = getActivityRecommendations(currentAqi);
  const lastUpdated = new Date(data.current.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">AQI Forecaster</h1>
          
          <div className="hidden md:flex items-center gap-6 font-medium text-sm">
            <button 
                onClick={() => setActiveTab('dashboard')} 
                className={activeTab === 'dashboard' ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('about')} 
                className={activeTab === 'about' ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}
            >
                About
            </button>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button className="text-gray-500" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 py-4 space-y-4 absolute w-full z-40 shadow-sm">
           <button 
                onClick={() => {setActiveTab('dashboard'); setMenuOpen(false);}} 
                className="block w-full text-left font-medium text-gray-700"
            >
                Dashboard
            </button>
            <button 
                onClick={() => {setActiveTab('about'); setMenuOpen(false);}} 
                className="block w-full text-left font-medium text-gray-700"
            >
                About
            </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        
        {/* Dashboard View */}
        {activeTab === 'dashboard' ? (
          <>
            {/* Title & Share */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Islamabad Air Quality</h1>
                <p className="text-gray-500 mt-1">Data synced at {lastUpdated}</p>
              </div>
              
              <button 
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                {copied ? <Check size={18} /> : <Share2 size={18} />}
                {copied ? "Copied!" : "Share Warning"}
              </button>
            </div>

            {/* Health Alert Banner */}
            {currentAqi > 150 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
                    <ShieldAlert className="text-red-500 shrink-0" size={24}/>
                    <div>
                        <h3 className="text-red-800 font-bold">Health Alert Active</h3>
                        <p className="text-red-700 text-sm mt-1">Air quality is currently unsafe. Sensitive groups should wear an N95 mask outdoors and avoid prolonged exertion.</p>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="flex items-center gap-6">
                    <div className={`h-28 w-28 shrink-0 rounded-full flex items-center justify-center text-white shadow-lg ${currentAqiColor}`}>
                      <span className="text-4xl font-bold">{currentAqi}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Status</p>
                      <h2 className="text-3xl font-bold mt-1">{getAqiLabel(currentAqi)}</h2>
                      {data.delta > 0 && <p className="text-sm font-semibold text-red-500 mt-1">+{data.delta} since yesterday</p>}
                      {data.delta < 0 && <p className="text-sm font-semibold text-green-500 mt-1">{data.delta} since yesterday</p>}
                      {data.delta === 0 && <p className="text-sm font-semibold text-gray-500 mt-1">Same as yesterday</p>}
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-gray-50 px-4 py-3 rounded-xl flex items-center gap-3 border border-gray-200">
                    <Thermometer className="text-gray-500" size={24} />
                    <div>
                        <p className="text-xs text-gray-500">Temp</p>
                        <p className="font-semibold">{data.current.temp_celsius}°C</p>
                    </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 rounded-xl flex items-center gap-3 border border-gray-200">
                    <Droplets className="text-gray-500" size={24} />
                    <div>
                        <p className="text-xs text-gray-500">Humidity</p>
                        <p className="font-semibold">{data.current.humidity_pct}%</p>
                    </div>
                    </div>
                  </div>
              </div>

              {/* Actionable Activity Matrix */}
              <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                  <div>
                      <Activity className={`mx-auto mb-2 ${recommendations.exercise ? 'text-green-500' : 'text-red-400'}`} size={24}/>
                      <p className="text-sm font-semibold">Outdoor Exercise</p>
                      <p className="text-xs text-gray-500">{recommendations.exercise ? 'Recommended' : 'Avoid'}</p>
                  </div>
                  <div>
                      <Home className={`mx-auto mb-2 ${recommendations.outdoors ? 'text-green-500' : 'text-red-400'}`} size={24}/>
                      <p className="text-sm font-semibold">General Outdoors</p>
                      <p className="text-xs text-gray-500">{recommendations.outdoors ? 'Acceptable' : 'Limit Time'}</p>
                  </div>
                  <div>
                      <Wind className={`mx-auto mb-2 ${recommendations.windows ? 'text-green-500' : 'text-red-400'}`} size={24}/>
                      <p className="text-sm font-semibold">Open Windows</p>
                      <p className="text-xs text-gray-500">{recommendations.windows ? 'Safe' : 'Keep Closed'}</p>
                  </div>
              </div>
            </div>

            {/* Forecast Section */}
            <div>
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Calendar size={20} className="text-gray-500"/> Upcoming Outlook
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.forecast.map((day, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 border-l-4" style={{borderLeftColor: getAqiColor(day.aqi).replace('bg-', '')}}>
                    <p className="text-sm text-gray-500 font-medium mb-1">{formatForecastDate(day.target_horizon)}</p>
                    <h4 className="text-2xl font-bold">
                        {day.aqi} <span className={`text-sm ${getAqiTextColor(day.aqi)}`}>({getAqiLabel(day.aqi)})</span>
                    </h4>
                </div>
                ))}
            </div>
            </div>

            {/* 24-Hour Trend Graph */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold mb-6">Trend over the past 24 hours</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#6b7280'}} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{
                        borderRadius: '8px', 
                        border: '1px solid #e5e7eb', 
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      labelStyle={{fontWeight: 'bold', marginBottom: '4px'}}
                    />
                    <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Safe Limit', fill: '#ef4444', fontSize: 12 }} />
                    <Line type="monotone" dataKey="aqi" name="AQI" stroke="#4b5563" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                </LineChart>
                </ResponsiveContainer>
            </div>
            </div>

            {/* Email Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-8 mt-8">
              <div className="max-w-md text-center md:text-left">
                <h3 className="text-2xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2 text-gray-900">
                  <ShieldAlert size={24} className="text-gray-500"/> Get Health Alerts
                </h3>
                <p className="text-gray-600">
                  Some descriptive text here, change later
                </p>
              </div>
              
              <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col gap-3 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="px-4 py-3 rounded-lg text-gray-900 w-full sm:w-64 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                  <button 
                    type="submit" 
                    disabled={subscribeStatus.type === 'loading'}
                    className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </div>
                {subscribeStatus.message && (
                  <p className={`text-sm font-medium ${subscribeStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {subscribeStatus.message}
                  </p>
                )}
              </form>
            </div>
          </>
        ) : (
          /* About Section */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
              
              <section>
                  <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                  <p className="text-gray-600 leading-relaxed">
                      some sort of explanation, change later
                  </p>
              </section>

              <hr className="border-gray-200" />

              <section>
                  <h2 className="text-2xl font-bold mb-6">Understanding the Air Quality Index (AQI)</h2>
                  <div className="space-y-4">
                      
                      <div className="flex items-start gap-3">
                          <div className="h-4 w-4 mt-1 shrink-0 rounded-full bg-green-500"></div>
                          <div>
                              <h4 className="font-bold flex items-center gap-2">Good <span className="font-normal text-gray-500 text-sm">0-50</span></h4>
                              <p className="text-sm text-gray-600">Air quality is satisfactory, and air pollution poses little or no risk. Perfect for outdoor activities.</p>
                          </div>
                      </div>

                      <div className="flex items-start gap-3">
                          <div className="h-4 w-4 mt-1 shrink-0 rounded-full bg-yellow-400"></div>
                          <div>
                              <h4 className="font-bold flex items-center gap-2">Moderate <span className="font-normal text-gray-500 text-sm">51-100</span></h4>
                              <p className="text-sm text-gray-600">Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.</p>
                          </div>
                      </div>

                      <div className="flex items-start gap-3">
                          <div className="h-4 w-4 mt-1 shrink-0 rounded-full bg-orange-500"></div>
                          <div>
                              <h4 className="font-bold flex items-center gap-2">Sensitive Groups <span className="font-normal text-gray-500 text-sm">101-150</span></h4>
                              <p className="text-sm text-gray-600">Members of sensitive groups (people with asthma, older adults, children) may experience health effects. The general public is less likely to be affected.</p>
                          </div>
                      </div>

                      <div className="flex items-start gap-3">
                          <div className="h-4 w-4 mt-1 shrink-0 rounded-full bg-red-500"></div>
                          <div>
                              <h4 className="font-bold flex items-center gap-2">Unhealthy <span className="font-normal text-gray-500 text-sm">151-200</span></h4>
                              <p className="text-sm text-gray-600">Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.</p>
                          </div>
                      </div>

                      <div className="flex items-start gap-3">
                          <div className="h-4 w-4 mt-1 shrink-0 rounded-full bg-purple-500"></div>
                          <div>
                              <h4 className="font-bold flex items-center gap-2">Very Unhealthy <span className="font-normal text-gray-500 text-sm">201-300</span></h4>
                              <p className="text-sm text-gray-600">Health alert: The risk of health effects is increased for everyone. Avoid prolonged outdoor exertion.</p>
                          </div>
                      </div>

                      <div className="flex items-start gap-3">
                          <div className="h-4 w-4 mt-1 shrink-0 rounded-full bg-rose-900"></div>
                          <div>
                              <h4 className="font-bold flex items-center gap-2">Hazardous <span className="font-normal text-gray-500 text-sm">300+</span></h4>
                              <p className="text-sm text-gray-600">Health warning of emergency conditions: everyone is more likely to be affected. Stay indoors.</p>
                          </div>
                      </div>

                  </div>
              </section>

          </div>
        )}

      </div>
    </div>
  );
}