import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { UserRole } from '../types/index.js';
import {
  Bell,
  LogOut,
  ShieldCheck,
  Briefcase,
  Building,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenPublicForm: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  unreadCount,
  onOpenNotifications,
  onOpenPublicForm,
}) => {
  const { user, logout } = useAuth();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            Super Admin
          </span>
        );
      case UserRole.SALES_EXECUTIVE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            Sales Rep
          </span>
        );
      case UserRole.CLIENT:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            Client Portal
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            LD
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
              LeadDesk <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-slate-100 text-slate-600">Mini-CRM</span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">Social Bano Client Intelligence</p>
          </div>
        </div>

        {/* Right: Actions, Notifications & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Public Inquiry Portal Quick Link */}
          <button
            onClick={onOpenPublicForm}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public Form Preview
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            aria-label="View notifications"
            className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-none mb-1">
                {user?.fullName}
              </div>
              <div className="text-xs text-slate-500 leading-none">
                {user?.email}
              </div>
            </div>

            {getRoleBadge(user?.role)}

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
