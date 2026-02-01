import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Bell,
  FileText,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  Bot,
  Sparkles,
  FormInput,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES, ROLE_LABELS } from '../../utils/constants';
import Navbar from './Navbar';
import Logo from './Logo';
import AIChatInterface from '../state/AIChatInterface';

/**
 * Main Layout Component with Sidebar
 */
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  // Navigation items based on user role
  const getNavigationItems = () => {
    const role = user?.role;

    const navItems = {
      [USER_ROLES.WDC_SECRETARY]: [
        { path: '/wdc', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/wdc/reports', label: 'My Reports', icon: FileText },
        { path: '/wdc/notifications', label: 'Notifications', icon: Bell },
        { path: '/wdc/feedback', label: 'Messages', icon: MessageSquare },
      ],
      [USER_ROLES.LGA_COORDINATOR]: [
        { path: '/lga', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/lga/wards', label: 'Wards', icon: Users },
        { path: '/lga/reports', label: 'Reports', icon: FileText },
        { path: '/lga/notifications', label: 'Notifications', icon: Bell },
        { path: '/lga/feedback', label: 'Messages', icon: MessageSquare },
      ],
      [USER_ROLES.STATE_OFFICIAL]: [
        { path: '/state', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/state/analytics', label: 'Analytics', icon: BarChart3 },
        { path: '/state/submissions', label: 'Submissions', icon: FileText },
        { path: '/state/lgas', label: 'LGAs', icon: Users },
        { path: '/state/forms', label: 'Form Builder', icon: FormInput },
        { path: '/state/users', label: 'User Management', icon: UserCog },
        { path: '/state/investigations', label: 'Investigations', icon: Search },
        { path: '/state/notifications', label: 'Notifications', icon: Bell },
      ],
    };

    return navItems[role] || [];
  };

  const navItems = getNavigationItems();

  // Check if path is active
  const isActive = (path) => {
    if (path === location.pathname) return true;
    // Exact match for main dashboard paths
    if (path === '/wdc' || path === '/lga' || path === '/state') {
      return location.pathname === path;
    }
    // Check if current path starts with the nav item path (for sub-routes)
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    setMobileSidebarOpen(false);
    logout();
  };

  // Sidebar component
  const Sidebar = ({ mobile = false }) => (
    <div
      className={`
        ${mobile ? 'fixed inset-y-0 left-0 z-50' : 'hidden lg:block'}
        ${sidebarOpen || mobile ? 'w-64' : 'w-20'}
        glass-sidebar
        transition-all duration-300
        ${mobile && !mobileSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}
    >
      {/* Mobile backdrop */}
      {mobile && mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar content */}
      <div className="relative h-full flex flex-col z-50">
        {/* Toggle button (desktop only) */}
        {!mobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-6 w-6 h-6 bg-white/90 border border-neutral-100 rounded-full flex items-center justify-center hover:bg-white shadow-sm transition-all duration-200"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4 text-neutral-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            )}
          </button>
        )}

        {/* Logo */}
        <div className={`p-4 border-b border-white/30 flex ${sidebarOpen || mobile ? 'items-center' : 'items-center justify-center'}`}>
          <Logo size="sm" showText={sidebarOpen || mobile} linkTo="/" />
        </div>

        {/* User Info */}
        <div className="p-3 border-b border-white/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white font-bold text-lg">
                {user?.full_name?.[0] || 'U'}
              </span>
            </div>
            {(sidebarOpen || mobile) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-neutral-600 truncate">
                  {ROLE_LABELS[user?.role]}
                </p>
              </div>
            )}
          </div>
          {(sidebarOpen || mobile) && (user?.ward_name || user?.lga_name) && (
            <div className="mt-3 px-3 py-2 bg-white/50 border border-white/30 rounded-lg">
              <p className="text-xs font-medium text-primary-900">
                {user.ward_name ? `${user.ward_name} Ward` : user.lga_name}
              </p>
              {user.ward_name && user.lga_name && (
                <p className="text-xs text-primary-700">{user.lga_name} LGA</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => mobile && setMobileSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-colors duration-200
                      ${
                        active
                          ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm shadow-primary-500/20'
                          : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {(sidebarOpen || mobile) && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer with Chat AI (State Officials only), Settings and Logout */}
        <div className="p-3 border-t border-white/30 space-y-1">
          {/* AI Chat Button (State Officials Only) */}
          {user?.role === USER_ROLES.STATE_OFFICIAL && (
            <button
              onClick={() => {
                mobile && setMobileSidebarOpen(false);
                setShowAIChat(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-primary-600 text-white hover:from-purple-700 hover:to-primary-700 transition-all shadow-md hover:shadow-lg"
            >
              <Bot className="w-5 h-5 flex-shrink-0" />
              {(sidebarOpen || mobile) && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">Chat with AI</span>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </>
              )}
            </button>
          )}

          <Link
            to="/settings"
            onClick={() => mobile && setMobileSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
              location.pathname === '/settings'
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm shadow-primary-500/20'
                : 'text-neutral-700 hover:bg-primary-50 hover:text-primary-700'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {(sidebarOpen || mobile) && (
              <span className="text-sm font-medium">Settings</span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(sidebarOpen || mobile) && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top Navbar */}
      <Navbar onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar */}
        <Sidebar mobile />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* AI Chat Interface */}
      <AIChatInterface
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
    </div>
  );
};

export default Layout;
