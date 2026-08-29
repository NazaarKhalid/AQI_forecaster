import React from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, menuOpen, setMenuOpen }) {
  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm relative">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-500" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <img src="/favicon.svg" alt="AQI Forecaster Logo" className="w-7 h-7 md:w-8 md:h-8 object-contain" />
            <h1 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase">
              AQI<span className="font-medium text-slate-500 ml-1">Forecaster</span>
            </h1>
          </div>
          
          <div className="hidden md:flex items-center gap-6 font-medium text-sm">
            <button 
                onClick={() => setActiveTab('dashboard')} 
                className={activeTab === 'dashboard' ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900 transition-colors"}
            >
                Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('developer')} 
                className={activeTab === 'developer' ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900 transition-colors"}
            >
                Developer
            </button>
            <button 
                onClick={() => setActiveTab('about')} 
                className={activeTab === 'about' ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900 transition-colors"}
            >
                About
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className={`md:hidden fixed inset-y-0 left-0 w-64 bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
            Menu
          </h2>
          <button 
            className="text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full transition-colors" 
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2">
           <button 
                onClick={() => {setActiveTab('dashboard'); setMenuOpen(false);}} 
                className={`block w-full text-left font-bold text-lg px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                Dashboard
            </button>
            <button 
                onClick={() => {setActiveTab('developer'); setMenuOpen(false);}} 
                className={`block w-full text-left font-bold text-lg px-4 py-3 rounded-xl transition-all ${activeTab === 'developer' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                Developer
            </button>
            <button 
                onClick={() => {setActiveTab('about'); setMenuOpen(false);}} 
                className={`block w-full text-left font-bold text-lg px-4 py-3 rounded-xl transition-all ${activeTab === 'about' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                About
            </button>
        </div>
      </div>
    </>
  );
}