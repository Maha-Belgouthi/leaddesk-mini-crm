import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Lock, Mail, ShieldCheck, Briefcase, Building, ArrowRight, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onOpenPublicForm: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenPublicForm }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Authentication failed. Please verify your credentials.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsSubmitting(true);
    try {
      await login(demoEmail, demoPass);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Authentication failed. Please verify your credentials.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-600/30 mb-4">
          LD
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          LeadDesk <span className="text-indigo-400">Mini-CRM</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Inquiry & pipeline management platform for Social Bano Technologies
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2.5">
              <span className="font-bold text-rose-800">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@leaddesk.local"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              1-Click Demo Accounts (Evaluator Quick Access)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@leaddesk.local', 'Admin@123456')}
                className="p-2.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <div className="font-bold">Super Admin</div>
                  <div className="text-[10px] text-purple-700">All permissions</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sales1@leaddesk.local', 'Sales@123456')}
                className="p-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold">Sales (Apex)</div>
                  <div className="text-[10px] text-blue-700">Assigned leads</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sales2@leaddesk.local', 'Sales@123456')}
                className="p-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold">Sales (Horizon)</div>
                  <div className="text-[10px] text-blue-700">Assigned leads</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('client@apex.local', 'Client@123456')}
                className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-medium text-left transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Client Portal</div>
                  <div className="text-[10px] text-emerald-700">Apex Dental</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Public Form Switcher */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onOpenPublicForm}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors cursor-pointer"
          >
            <span>Preview Client Public Inquiry Form</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

