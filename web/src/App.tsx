import { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'welcome' | 'status'>('welcome');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            LD
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">LeadDesk</h1>
            <p className="text-xs text-slate-500 font-medium">Mini-CRM & Inquiry Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Phase 1 Ready
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 text-center mt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">LeadDesk Frontend Initialized</h2>
          <p className="text-slate-600 max-w-md mx-auto mb-6 text-sm">
            React + Vite + TypeScript with TailwindCSS is configured and ready for component development.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'welcome'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer ${
                activeTab === 'status'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              System Health
            </button>
          </div>

          {activeTab === 'status' && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg text-left text-xs font-mono text-slate-700 border border-slate-200 max-w-sm mx-auto">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>API Gateway:</span>
                <span className="text-emerald-600 font-semibold">Ready (:4000/api)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>Swagger Docs:</span>
                <span className="text-emerald-600 font-semibold">:4000/api/docs</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Frontend:</span>
                <span className="text-emerald-600 font-semibold">Active (:3000)</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-100">
        LeadDesk Mini-CRM &copy; Social Bano Technologies
      </footer>
    </div>
  );
}
