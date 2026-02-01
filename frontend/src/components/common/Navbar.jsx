import { Bell, User, LogOut, Menu, Settings } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS, USER_ROLES } from '../../utils/constants';
import Logo from './Logo';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  return (
    <nav className="glass-nav sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Menu Toggle + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-xl hover:bg-neutral-100 transition-all duration-200"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5 text-neutral-600" />
            </button>
            <Logo size="default" showText={true} />
          </div>

          {/* Right: Notifications + User Menu */}
          <div className="flex items-center gap-1">
            {/* Notifications */}
            <Link
              to={getNotificationPath()}
              className="relative p-2.5 rounded-xl hover:bg-neutral-100 transition-all duration-200 group"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 text-neutral-600 group-hover:text-primary-600 transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-sm animate-pulse"></span>
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-neutral-100 transition-all duration-200"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.[0] || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-semibold text-neutral-900">
                    {user?.full_name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {ROLE_LABELS[user?.role]}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-64 glass-modal rounded-2xl z-20 animate-slide-down overflow-hidden">
                    {/* User Info Header */}
                    <div className="px-4 py-4 bg-gradient-to-br from-primary-50 to-emerald-50 border-b border-white/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-bold">
                            {user?.full_name?.[0] || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">
                            {user?.full_name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {user?.email}
                          </p>
                          <p className="text-xs text-primary-600 font-medium mt-0.5">
                            {ROLE_LABELS[user?.role]}
                          </p>
                          {(user?.ward_name || user?.lga_name) && (
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {user.ward_name ? `${user.ward_name} Ward, ` : ''}
                              {user.lga_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-neutral-500" />
                        </div>
                        <span>Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                          <Settings className="w-4 h-4 text-neutral-500" />
                        </div>
                        <span>Settings</span>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-neutral-100 py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                          <LogOut className="w-4 h-4 text-red-500" />
                        </div>
                        <span>Sign Out</span>
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
