import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  FileText,
  Users,
  MessageSquare,
  Settings,
  Bot,
  Sparkles,
  FormInput,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../utils/constants';
import Navbar from './Navbar';
import AIChatInterface from '../state/AIChatInterface';

/**
 * Main Layout
 *
 * Top: branding Navbar (logo + user menu + notifications).
 * Bottom: floating glass tab bar with role-aware navigation.
 *
 * The bottom bar is shown on every authenticated page. Main content gets
 * bottom padding (pb-24) so the last row of content is never covered.
 */
const Layout = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [showAIChat, setShowAIChat] = useState(false);

  // Role-aware nav items. Limited to 4 + Settings so the bottom bar stays
  // legible on the smallest phones. Less critical destinations live in the
  // user dropdown (Navbar).
  const getNavigationItems = () => {
    const role = user?.role;
    const navItems = {
      [USER_ROLES.WDC_SECRETARY]: [
        { path: '/wdc', label: 'Home', icon: LayoutDashboard },
        { path: '/wdc/reports', label: 'Reports', icon: FileText },
        { path: '/wdc/notifications', label: 'Alerts', icon: Bell },
        { path: '/wdc/feedback', label: 'Messages', icon: MessageSquare },
      ],
      [USER_ROLES.LGA_COORDINATOR]: [
        { path: '/lga', label: 'Home', icon: LayoutDashboard },
        { path: '/lga/wards', label: 'Wards', icon: Users },
        { path: '/lga/reports', label: 'Reports', icon: FileText },
        { path: '/lga/notifications', label: 'Alerts', icon: Bell },
      ],
      [USER_ROLES.STATE_OFFICIAL]: [
        { path: '/state', label: 'Home', icon: LayoutDashboard },
        { path: '/state/submissions', label: 'Reports', icon: FileText },
        { path: '/state/forms', label: 'Forms', icon: FormInput },
        { path: '/state/users', label: 'Users', icon: UserCog },
      ],
    };
    const items = navItems[role] || [];
    return [...items, { path: '/settings', label: 'Settings', icon: Settings }];
  };

  const navItems = getNavigationItems();

  const isActive = (path) => {
    if (path === location.pathname) return true;
    if (path === '/wdc' || path === '/lga' || path === '/state') {
      return location.pathname === path;
    }
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="min-w-0 pb-24">
        {children}
      </main>

      {/* AI Chat FAB — sits above the bottom nav on the right.
          State officials only. */}
      {user?.role === USER_ROLES.STATE_OFFICIAL && (
        <button
          onClick={() => setShowAIChat(true)}
          aria-label="Chat with AI"
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:scale-105 transition-all"
        >
          <Bot className="w-5 h-5" />
          <Sparkles className="w-4 h-4 animate-pulse" />
        </button>
      )}

      {/* Bottom navigation — floating glass card with active pill. */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="mx-auto max-w-2xl px-3 pb-3">
          <ul
            className="flex items-center justify-around gap-1 p-1.5 rounded-2xl border border-white/40 shadow-[0_18px_40px_-10px_rgba(15,46,32,0.35)] backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.85)' }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <li key={item.path} className="flex-1">
                  <Link
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/30'
                        : 'text-neutral-600 hover:text-primary-700 hover:bg-primary-50'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    <span className={`text-[10px] font-semibold leading-none ${active ? 'opacity-100' : 'opacity-80'}`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <AIChatInterface
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
    </div>
  );
};

export default Layout;
