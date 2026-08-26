import React, { useState, useEffect } from 'react';
import api from './api';
import { calculateAqi } from './utils/aqi';
import ParticleBackground from './components/ParticleBackground';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Developer from './components/Developer';
import About from './components/About';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    api.get('/api/dashboard/')
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xl font-semibold text-slate-700">Loading...</div>;
  if (!data || !data.current) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-500">Error connecting to backend.</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-slate-200 relative overflow-x-hidden">
      <ParticleBackground aqi={data.current.aqi} />
      
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        menuOpen={menuOpen} 
        setMenuOpen={setMenuOpen} 
      />

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 md:space-y-8 relative z-10">
        {activeTab === 'dashboard' && <Dashboard data={data} />}
        {activeTab === 'developer' && <Developer />}
        {activeTab === 'about' && <About />}
      </div>
    </div>
  );
}