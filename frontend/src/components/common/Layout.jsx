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
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES, ROLE_LABELS } from '../../utils/constants';
import Navbar from './Navbar';

/**
 * Main Layout Component with Sidebar
 */
const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
        { path: '/state/lgas', label: 'LGAs', icon: Users },
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
        bg-white border-r border-neutral-200
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
      <div className="relative h-full flex flex-col bg-white z-50">
        {/* Toggle button (desktop only) */}
        {!mobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-3 top-6 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center hover:bg-neutral-50 transition-colors"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4 text-neutral-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            )}
          </button>
        )}

        {/* User Info */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-700 font-bold text-lg">
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
            <div className="mt-3 px-3 py-2 bg-primary-50 rounded-lg">
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
                          ? 'bg-primary-600 text-white'
                          : 'text-neutral-700 hover:bg-neutral-100'
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

        {/* Footer with Settings and Logout */}
        <div className="p-3 border-t border-neutral-200 space-y-1">
          <Link
            to="/settings"
            onClick={() => mobile && setMobileSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              location.pathname === '/settings'
                ? 'bg-primary-600 text-white'
                : 'text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {(sidebarOpen || mobile) && (
              <span className="text-sm font-medium">Settings</span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
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
    </div>
  );
};

export default Layout;
