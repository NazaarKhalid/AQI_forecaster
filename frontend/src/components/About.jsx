import React from 'react';

export default function About() {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-10 space-y-8 md:space-y-10">
      <section>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4 text-slate-900">How It Works</h2>
          <p className="text-slate-600 leading-relaxed font-medium text-sm md:text-base">
              This dashboard utilizes short-term risk management and 3-day forecasting to analyze environmental conditions. By processing historical weather patterns and current pollution metrics, the AI pipeline predicts upcoming AQI levels so you can adjust your outdoor plans accordingly.
          </p>
      </section>

      <hr className="border-slate-100" />

      <section>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-6 md:mb-8 text-slate-900">Understanding the Index</h2>
          <div className="space-y-6">
              <div className="flex items-start gap-4">
                  <div className="h-4 w-4 md:h-5 md:w-5 mt-1 shrink-0 rounded-full bg-green-500 shadow-sm"></div>
                  <div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 flex flex-wrap items-center gap-2">Good <span className="font-semibold text-slate-400 text-xs md:text-sm bg-slate-50 px-2 py-0.5 rounded-md">0-50</span></h4>
                      <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Air quality is satisfactory, and air pollution poses little or no risk. Perfect for outdoor activities.</p>
                  </div>
              </div>
              <div className="flex items-start gap-4">
                  <div className="h-4 w-4 md:h-5 md:w-5 mt-1 shrink-0 rounded-full bg-yellow-400 shadow-sm"></div>
                  <div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 flex flex-wrap items-center gap-2">Moderate <span className="font-semibold text-slate-400 text-xs md:text-sm bg-slate-50 px-2 py-0.5 rounded-md">51-100</span></h4>
                      <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.</p>
                  </div>
              </div>
              <div className="flex items-start gap-4">
                  <div className="h-4 w-4 md:h-5 md:w-5 mt-1 shrink-0 rounded-full bg-orange-500 shadow-sm"></div>
                  <div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 flex flex-wrap items-center gap-2">Sensitive Groups <span className="font-semibold text-slate-400 text-xs md:text-sm bg-slate-50 px-2 py-0.5 rounded-md">101-150</span></h4>
                      <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Members of sensitive groups (people with asthma, older adults, children) may experience health effects. The general public is less likely to be affected.</p>
                  </div>
              </div>
              <div className="flex items-start gap-4">
                  <div className="h-4 w-4 md:h-5 md:w-5 mt-1 shrink-0 rounded-full bg-red-500 shadow-sm"></div>
                  <div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 flex flex-wrap items-center gap-2">Unhealthy <span className="font-semibold text-slate-400 text-xs md:text-sm bg-slate-50 px-2 py-0.5 rounded-md">151-200</span></h4>
                      <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.</p>
                  </div>
              </div>
              <div className="flex items-start gap-4">
                  <div className="h-4 w-4 md:h-5 md:w-5 mt-1 shrink-0 rounded-full bg-purple-500 shadow-sm"></div>
                  <div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 flex flex-wrap items-center gap-2">Very Unhealthy <span className="font-semibold text-slate-400 text-xs md:text-sm bg-slate-50 px-2 py-0.5 rounded-md">201-300</span></h4>
                      <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Health alert: The risk of health effects is increased for everyone. Avoid prolonged outdoor exertion.</p>
                  </div>
              </div>
              <div className="flex items-start gap-4">
                  <div className="h-4 w-4 md:h-5 md:w-5 mt-1 shrink-0 rounded-full bg-rose-900 shadow-sm"></div>
                  <div>
                      <h4 className="font-bold text-base md:text-lg text-slate-900 flex flex-wrap items-center gap-2">Hazardous <span className="font-semibold text-slate-400 text-xs md:text-sm bg-slate-50 px-2 py-0.5 rounded-md">300+</span></h4>
                      <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Health warning of emergency conditions: everyone is more likely to be affected. Stay indoors.</p>
                  </div>
              </div>
          </div>
      </section>
    </div>
  );
}