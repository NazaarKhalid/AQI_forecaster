import React, { useState } from 'react';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Share2, Check, ShieldAlert, Bike, Trees, LayoutGrid } from 'lucide-react';
import { 
  getAqiColor, getAqiShadow, getAqiTextColor, getAqiLabel, 
  formatForecastDate, getActivityRecommendations 
} from '../utils/aqi';

export default function Dashboard({ data }) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState({ type: '', message: '' });
  
  const [selectedHours, setSelectedHours] = useState({ 0: -1, 1: -1, 2: -1 });

  const currentAqi = data.current.aqi;
  const currentAqiColor = getAqiColor(currentAqi);
  const currentAqiShadow = getAqiShadow(currentAqi);
  const recommendations = getActivityRecommendations(currentAqi);
  const lastUpdated = new Date(data.current.datetime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const chartData = data.history;

  const rawMax = chartData.length > 0 ? Math.max(...chartData.map(d => d.aqi)) : 100;
  const rawMin = chartData.length > 0 ? Math.min(...chartData.map(d => d.aqi)) : 0;
  const yMax = rawMax + 15;
  const yMin = Math.max(0, rawMin - 15);
  
  let gradientOffset = 0;
  if (rawMax === rawMin) {
    gradientOffset = rawMax > 100 ? 1 : 0;
  } else if (rawMax <= 100) {
    gradientOffset = 0; 
  } else if (rawMin >= 100) {
    gradientOffset = 1; 
  } else {
    gradientOffset = (rawMax - 100) / (rawMax - rawMin);
  }

  const handleShare = () => {
    const insight = data.current.ai_insight ? `\n\nAI Insight: ${data.current.ai_insight}` : '';
    const text = `Islamabad Air Quality Update\nAQI: ${data.current.aqi} (${getAqiLabel(data.current.aqi)})${insight}\n\nSee the 3-day AI forecast at: https://aqi-forecaster-epgh.onrender.com`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSubscribeStatus({ type: 'loading', message: 'Subscribing...' });
    
    try {
      const response = await api.post('/api/subscribe/', { email });
      setSubscribeStatus({ type: 'success', message: response.data.message });
      setEmail('');
    } catch (error) {
      setSubscribeStatus({ type: 'error', message: 'Please enter a valid email address.' });
    }
    
    setTimeout(() => setSubscribeStatus({ type: '', message: '' }), 5000);
  };

  const getForecastForCard = (idx, fallbackDay) => {
    const hourlyData = data.hourly_forecast || [];
    
    const chunk = hourlyData.filter(d => d.horizon === fallbackDay.target_horizon).sort((a, b) => {
      const getMinutes = (timeString) => {
        const [time, modifier] = timeString.split(' ');
        let [hours, minutes] = time.split(':');
        
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10) || 0;
        
        if (hours === 12) {
          hours = modifier === 'AM' ? 0 : 12;
        } else if (modifier === 'PM') {
          hours += 12;
        }
        
        return (hours * 60) + minutes;
      };
      
      return getMinutes(a.timeLabel) - getMinutes(b.timeLabel);
    });

    if (chunk.length === 0) {
      return {
        aqi: fallbackDay.aqi,
        target_horizon: fallbackDay.target_horizon,
        chunk: []
      };
    }

    const selectedIdx = selectedHours[idx] !== -1 ? selectedHours[idx] : chunk.length - 1;
    const selectedData = chunk[selectedIdx] || chunk[chunk.length - 1];

    return {
      aqi: selectedData.aqi,
      target_horizon: fallbackDay.target_horizon,
      chunk: chunk
    };
  };

  return (
    <>
      <div className="flex flex-row items-start justify-between gap-2 mb-2">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-slate-900">Islamabad Air Quality</h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm font-medium">Data synced at {lastUpdated}</p>
        </div>
        
        <button 
          onClick={handleShare}
          className="flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-2.5 bg-slate-100 text-slate-700 rounded-lg md:rounded-xl font-bold hover:bg-slate-200 transition-colors shadow-sm shrink-0"
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          <span className="text-xs md:text-base">{copied ? "Copied!" : "Share"}</span>
        </button>
      </div>

      {currentAqi > 150 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3 shadow-sm">
              <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20}/>
              <div>
                  <h3 className="text-red-800 font-bold text-sm">Health Alert Active</h3>
                  <p className="text-red-700 text-sm mt-1 leading-relaxed">Air quality is currently unsafe. Sensitive groups should wear an N95 mask outdoors and avoid prolonged exertion.</p>
              </div>
          </div>
      )}

      <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start text-left">
          <div className="flex flex-row gap-5 md:gap-8 items-center md:items-start w-full md:flex-1">
            <div className="shrink-0 flex flex-col items-center">
              <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full ${currentAqiColor} flex items-center justify-center text-4xl md:text-5xl font-bold text-white ${currentAqiShadow}`}>
                {currentAqi}
              </div>
            </div>

            <div className="flex-1 w-full">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">{getAqiLabel(currentAqi)}</h2>
              
              <div className="mt-1 flex items-center justify-start gap-1">
                {data.delta > 0 && <p className="text-sm font-semibold text-red-500">+{data.delta} since yesterday</p>}
                {data.delta < 0 && <p className="text-sm font-semibold text-green-500">{data.delta} since yesterday</p>}
                {data.delta === 0 && <p className="text-sm font-semibold text-slate-400">Same as yesterday</p>}
              </div>

              {data.current.ai_insight && (
                <div className="hidden md:block mt-6 border-l-4 border-slate-800 bg-slate-50/50 p-4 rounded-r-xl transition-all hover:bg-slate-50 text-left">
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {data.current.ai_insight}
                  </p>
                </div>
              )}
            </div>
          </div>

          {data.current.ai_insight && (
            <div className="md:hidden border-l-4 border-slate-800 bg-slate-50/50 p-4 rounded-r-xl transition-all hover:bg-slate-50 text-left w-full">
              <p className="text-slate-700 text-xs leading-relaxed font-medium">
                {data.current.ai_insight}
              </p>
            </div>
          )}

          <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto justify-center md:justify-start shrink-0">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 md:px-5 flex flex-col items-center justify-center min-w-[90px] md:min-w-[100px]">
              <span className="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Temp</span>
              <span className="text-slate-800 font-bold text-base md:text-lg">{data.current.temp_celsius}°C</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 md:px-5 flex flex-col items-center justify-center min-w-[90px] md:min-w-[100px]">
              <span className="text-slate-400 text-[10px] md:text-xs font-semibold uppercase tracking-wider mb-1">Humidity</span>
              <span className="text-slate-800 font-bold text-base md:text-lg">{data.current.humidity_pct}%</span>
            </div>
          </div>
        </div>

        <hr className="border-slate-100 my-6 md:my-8" />

        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div className="flex flex-col items-center">
            <Bike className={`w-5 h-5 md:w-6 md:h-6 mb-2 ${recommendations.exercise ? 'text-green-500' : 'text-red-400'}`} strokeWidth={2.5} />
            <span className="text-slate-800 font-bold text-[11px] md:text-sm">Outdoor Exercise</span>
            <span className="text-slate-500 text-[10px] md:text-xs font-medium">{recommendations.exercise ? 'Recommended' : 'Avoid'}</span>
          </div>
          <div className="flex flex-col items-center">
            <Trees className={`w-5 h-5 md:w-6 md:h-6 mb-2 ${recommendations.outdoors ? 'text-green-500' : 'text-red-400'}`} strokeWidth={2.5} />
            <span className="text-slate-800 font-bold text-[11px] md:text-sm">General Outdoors</span>
            <span className="text-slate-500 text-[10px] md:text-xs font-medium">{recommendations.outdoors ? 'Acceptable' : 'Limit Time'}</span>
          </div>
          <div className="flex flex-col items-center">
            <LayoutGrid className={`w-5 h-5 md:w-6 md:h-6 mb-2 ${recommendations.windows ? 'text-green-500' : 'text-red-400'}`} strokeWidth={2.5} />
            <span className="text-slate-800 font-bold text-[11px] md:text-sm">Open Windows</span>
            <span className="text-slate-500 text-[10px] md:text-xs font-medium">{recommendations.windows ? 'Safe' : 'Keep Closed'}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 mb-4">
        <h3 className="text-base md:text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <Calendar size={18} className="text-slate-400"/> Upcoming Outlook
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            {data.forecast.map((day, idx) => {
              const cardData = getForecastForCard(idx, day);
              return (
                <div key={idx} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 p-3 md:p-5 border-l-4 transition-all hover:shadow-md flex flex-col justify-center" style={{borderLeftColor: getAqiColor(cardData.aqi).replace('bg-', '')}}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] md:text-sm text-slate-400 font-semibold uppercase tracking-wider truncate">
                        {formatForecastDate(cardData.target_horizon)}
                      </p>
                      {cardData.chunk.length > 0 ? (
                        <div className="relative">
                          <select 
                            className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] md:text-[11px] font-bold py-1 pl-2 pr-6 rounded-md cursor-pointer outline-none transition-colors border border-slate-200"
                            value={selectedHours[idx] !== -1 ? selectedHours[idx] : cardData.chunk.length - 1}
                            onChange={(e) => setSelectedHours({...selectedHours, [idx]: parseInt(e.target.value)})}
                          >
                            {cardData.chunk.map((h, i) => (
                              <option key={i} value={i}>For {h.timeLabel}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      ) : (
                        <span className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] font-bold py-0.5 px-1.5 rounded">Latest</span>
                      )}
                    </div>
                    <h4 className="text-lg md:text-3xl font-extrabold text-slate-800 flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
                        {cardData.aqi} <span className={`text-[10px] md:text-sm font-bold ${getAqiTextColor(cardData.aqi)}`}>{getAqiLabel(cardData.aqi)}</span>
                    </h4>
                </div>
              );
            })}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-8 mt-4">
        <div className="flex justify-between items-end mb-4 md:mb-6">
          <h3 className="text-base md:text-lg font-bold text-slate-800">Trend over the past 24 hours</h3>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-[10px] md:text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Unsafe</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Safe</div>
          </div>
        </div>
        <div className="h-60 md:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={1} />
                    <stop offset={gradientOffset} stopColor="#22c55e" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timeLabel" tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[yMin, yMax]} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} tickLine={false} axisLine={false} dx={-10}/>
                <Tooltip 
                  contentStyle={{
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                    fontSize: '12px'
                  }}
                  labelStyle={{fontWeight: 'bold', marginBottom: '4px', color: '#64748b'}}
                />
                <Line type="monotone" dataKey="aqi" name="AQI" stroke="url(#splitColor)" strokeWidth={3} dot={false} activeDot={{r: 5, fill: '#0f172a', stroke: '#ffffff', strokeWidth: 2}} />
            </LineChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 mt-6">
        <div className="max-w-md text-center md:text-left">
          <h3 className="text-xl md:text-2xl font-extrabold mb-2 flex items-center justify-center md:justify-start gap-2 text-slate-900">
            <ShieldAlert size={24} className="text-slate-400"/> Get Health Alerts
          </h3>
          <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed">
            Sign up to receive automated email warnings when the Air Quality Index in Islamabad reaches hazardous levels.
          </p>
        </div>
        
        <form onSubmit={handleSubscribe} className="w-full md:w-auto flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="px-5 py-3 md:py-3.5 rounded-xl text-slate-900 w-full sm:w-72 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all text-sm md:text-base"
            />
            <button 
              type="submit" 
              disabled={subscribeStatus.type === 'loading'}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 md:py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 whitespace-nowrap shadow-sm text-sm md:text-base"
            >
              Subscribe
            </button>
          </div>
          {subscribeStatus.message && (
            <p className={`text-xs md:text-sm font-semibold pl-1 ${subscribeStatus.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {subscribeStatus.message}
            </p>
          )}
        </form>
      </div>
    </>
  );
}