import React, { useState, useEffect } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, BarChart3, Info } from 'lucide-react';

export default function Developer() {
  const [metricsData, setMetricsData] = useState(null);
  const [selectedHorizon, setSelectedHorizon] = useState('Day 1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/model-metrics/')
      .then(response => {
        setMetricsData(response.data.models);
        setLoading(false);
      })
      .catch(error => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500 font-semibold">Loading Model Analytics...</div>;
  if (!metricsData) return <div className="p-8 text-center text-red-500 font-semibold">Failed to load analytics.</div>;

  const currentModel = metricsData[selectedHorizon];

  return (
    <div className="space-y-6 md:space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Model Diagnostics</h1>
          <p className="text-slate-500 mt-1 text-xs md:text-sm font-medium">Evaluation metrics and SHAP feature importance explainability</p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto">
          {['Day 1', 'Day 2', 'Day 3'].map((horizon) => (
            <button
              key={horizon}
              onClick={() => setSelectedHorizon(horizon)}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                selectedHorizon === horizon
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {horizon}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
        <Info className="text-slate-500 mt-0.5 shrink-0" size={18} />
        <p className="text-sm text-slate-700 font-medium leading-relaxed">
          <span className="font-bold text-slate-900">Note:</span> This diagnostic view is maintained specifically for the 10p Shine team and developers to monitor pipeline health, evaluate real-time forecasting performance, and audit feature attribution in production.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Activity size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">MAE</span>
          </div>
          <h4 className="text-2xl md:text-3xl font-black text-slate-900">{currentModel.mae} <span className="text-xs font-medium text-slate-400">µg/m³</span></h4>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Activity size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">RMSE</span>
          </div>
          <h4 className="text-2xl md:text-3xl font-black text-slate-900">{currentModel.rmse} <span className="text-xs font-medium text-slate-400">µg/m³</span></h4>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <BarChart3 size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">R² Score</span>
          </div>
          <h4 className={`text-2xl md:text-3xl font-black ${currentModel.r2 < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{currentModel.r2}</h4>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg md:text-xl font-bold text-slate-900">SHAP Feature Attribution ({selectedHorizon})</h3>
          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Mean absolute SHAP value representing average impact on model output</p>
        </div>

        <div className="h-72 md:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={currentModel.shap_importance}
              margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
            >
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="feature" type="category" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                  fontSize: '12px'
                }}
                formatter={(value) => [`${value} Impact`, 'Mean |SHAP|']}
              />
              <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
                {currentModel.shap_importance.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#0f172a' : '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}