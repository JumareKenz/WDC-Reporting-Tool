import { Bell, User, LogOut, Menu, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { APP_CONFIG, ROLE_LABELS, USER_ROLES } from '../../utils/constants';

/**
 * Top Navbar Component
 */
const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Get notification path based on user role
  const getNotificationPath = () => {
    switch (user?.role) {
      case USER_ROLES.WDC_SECRETARY:
        return '/wdc/notifications';
      case USER_ROLES.LGA_COORDINATOR:
        return '/lga/notifications';
      case USER_ROLES.STATE_OFFICIAL:
        return '/state/notifications';
      default:
        return '/notifications';
    }
  };

  // Get settings path based on user role
  const getSettingsPath = () => {
    return '/settings';
  };

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center gap-4">
            {/* Mobile menu toggle */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-neutral-700" />
            </button>

            {/* Logo */}
            <Link to="/" className="gov-seal">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-bold text-primary-700 leading-tight">
                    {APP_CONFIG.APP_NAME}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {APP_CONFIG.APP_SUBTITLE}
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Notifications + User Menu */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link
              to={getNotificationPath()}
              className="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-neutral-700" />
              {/* Badge for unread notifications */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-700" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-neutral-900">
                    {user?.full_name}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {ROLE_LABELS[user?.role]}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  ></div>

                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 z-20 animate-slide-down">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-neutral-200">
                      <p className="text-sm font-medium text-neutral-900">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {user?.email}
                      </p>
                      <p className="text-xs text-primary-600 font-medium mt-1">
                        {ROLE_LABELS[user?.role]}
                      </p>
                      {(user?.ward_name || user?.lga_name) && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {user.ward_name ? `${user.ward_name} Ward, ` : ''}{user.lga_name}
                        </p>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to={getSettingsPath()}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        to={getSettingsPath()}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-neutral-200 py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
