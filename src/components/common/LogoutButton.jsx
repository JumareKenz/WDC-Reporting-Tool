/**
 * LogoutButton — Explicit Logout Action
 *
 * This is the ONLY way to end a persistent session.
 * Shows confirmation dialog and warning about shared devices.
 */

import React, { useState } from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRoleLabel } from '../../utils/constants';
import Button from './Button';
import Modal from './Modal';

const LogoutButton = ({ 
  variant = 'ghost',
  size = 'default',
  fullWidth = false,
  showIcon = true,
  className = '',
}) => {
  const { logout, user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Redirect to login page after logout
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if server call failed
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        icon={showIcon ? LogOut : undefined}
        onClick={() => setShowConfirm(true)}
        className={className}
      >
        Log Out
      </Button>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Log Out"
        size="md"
      >
        <div className="space-y-4">
          {/* Warning about persistent login */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Security Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                This app keeps you logged in permanently for convenience. 
                {user?.device_shared && (
                  <span className="font-medium block mt-1">
                    This appears to be a shared device. Logging out is recommended when finished.
                  </span>
                )}
              </p>
            </div>
          </div>

          <p className="text-gray-600">
            Are you sure you want to log out? You will need to enter your credentials again to access the app.
          </p>

          {/* User info reminder */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Currently logged in as:</p>
              <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
              <p className="text-gray-500 text-xs mt-0.5">{getUserRoleLabel(user)}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowConfirm(false)}
              icon={X}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLogout}
              icon={LogOut}
              loading={isLoggingOut}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Log Out
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

/**
 * Compact logout button for headers/navbars
 */
export const LogoutIconButton = ({ className = '' }) => {
  const { logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ${className}`}
        aria-label="Log out"
        title="Log out"
      >
        <LogOut className="w-5 h-5" />
      </button>

      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Log Out?"
        size="sm"
      >
        <p className="text-gray-600 mb-4">
          This will end your session and require login next time.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700"
          >
            Log Out
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default LogoutButton;
