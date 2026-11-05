import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { LoginPage } from './pages/LoginPage.js';
import { PublicInquiryPage } from './pages/PublicInquiryPage.js';
import { LeadsBoard } from './pages/LeadsBoard.js';
import { NotificationsDrawer } from './components/NotificationsDrawer.js';
import { apiClient } from './api/client.js';

const CURRENT_YEAR = new Date().getFullYear();

function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'board' | 'public-inquiry'>('board');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await apiClient.get('/notifications/unread-count');
      setUnreadNotificationsCount(data.count || 0);
    } catch {
      // Ignore if unauthenticated or network error
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void fetchUnreadCount();
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading LeadDesk...</p>
        </div>
      </div>
    );
  }

  // If viewing public inquiry portal
  if (currentView === 'public-inquiry') {
    return (
      <PublicInquiryPage
        onBackToLogin={() => setCurrentView('board')}
      />
    );
  }

  // If not logged in, show login page
  if (!isAuthenticated) {
    return (
      <LoginPage
        onOpenPublicForm={() => setCurrentView('public-inquiry')}
      />
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Header
        unreadCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenPublicForm={() => setCurrentView('public-inquiry')}
      />

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
        <LeadsBoard />
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        LeadDesk Mini-CRM &copy; {CURRENT_YEAR} Social Bano Technologies. All rights reserved.
      </footer>

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onCountUpdated={fetchUnreadCount}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
