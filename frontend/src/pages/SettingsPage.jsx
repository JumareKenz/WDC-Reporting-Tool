import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  LogOut,
  Save,
  Eye,
  EyeOff,
  Mail,
  Phone,
  MapPin,
  Building,
  CheckCircle,
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../utils/constants';
import { updateProfile, updateEmail, changePassword } from '../api/profile';

const SettingsPage = () => {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [alertMessage, setAlertMessage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: true,
    report_reminders: true,
    feedback_alerts: true,
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleProfileSave = async () => {
    try {
      setIsLoading(true);
      setAlertMessage(null);

      // Separate email update from profile update
      const hasEmailChanged = profileData.email !== user?.email;
      const hasProfileChanged = profileData.full_name !== user?.full_name || profileData.phone !== user?.phone;

      // Update profile (full_name, phone)
      if (hasProfileChanged) {
        const profileUpdate = {};
        if (profileData.full_name !== user?.full_name) profileUpdate.full_name = profileData.full_name;
        if (profileData.phone !== user?.phone) profileUpdate.phone = profileData.phone;

        await updateProfile(profileUpdate);
      }

      // Update email separately (might fail for ward/LGA users)
      if (hasEmailChanged) {
        await updateEmail(profileData.email);
      }

      // Update local user state
      if (updateUser) {
        updateUser({ ...user, ...profileData });
      }

      setAlertMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationSave = () => {
    setAlertMessage({ type: 'success', text: 'Notification preferences updated!' });
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setAlertMessage({ type: 'error', text: 'Passwords do not match!' });
      return;
    }
    if (passwordData.new_password.length < 6) {
      setAlertMessage({ type: 'error', text: 'Password must be at least 6 characters!' });
      return;
    }

    try {
      setIsLoading(true);
      setAlertMessage(null);

      await changePassword(passwordData.current_password, passwordData.new_password);

      setAlertMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setAlertMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.text}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <Card>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}

              <hr className="my-4" />

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card title="Profile Information" subtitle="Update your personal details">
              <div className="space-y-6">
                {/* User Info Display */}
                <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-700">
                      {user?.full_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">{user?.full_name}</h3>
                    <p className="text-sm text-primary-600 font-medium">{ROLE_LABELS[user?.role]}</p>
                    {user?.ward_name && (
                      <p className="text-sm text-neutral-500">{user.ward_name} Ward, {user.lga_name}</p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={profileData.full_name}
                        onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        disabled={user?.role === 'WDC_SECRETARY' || user?.role === 'LGA_COORDINATOR'}
                        className={`w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 ${
                          (user?.role === 'WDC_SECRETARY' || user?.role === 'LGA_COORDINATOR') ? 'bg-neutral-50 text-neutral-500' : ''
                        }`}
                      />
                    </div>
                    {(user?.role === 'WDC_SECRETARY' || user?.role === 'LGA_COORDINATOR') && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Contact state office to change your email address
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="0801 234 5678"
                        className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Role
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        value={ROLE_LABELS[user?.role] || ''}
                        disabled
                        className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-neutral-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Info (Read Only) */}
                {user?.ward_name && (
                  <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
                    <h4 className="text-sm font-semibold text-primary-800 mb-3">Assigned Location</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary-600" />
                        <span className="text-sm text-primary-700">Ward: {user.ward_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary-600" />
                        <span className="text-sm text-primary-700">LGA: {user.lga_name}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button icon={Save} onClick={handleProfileSave} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card title="Notification Preferences" subtitle="Choose how you want to be notified">
              <div className="space-y-6">
                {[
                  {
                    key: 'email_notifications',
                    label: 'Email Notifications',
                    description: 'Receive notifications via email',
                  },
                  {
                    key: 'sms_notifications',
                    label: 'SMS Notifications',
                    description: 'Receive notifications via SMS',
                  },
                  {
                    key: 'report_reminders',
                    label: 'Report Reminders',
                    description: 'Get reminded about pending report submissions',
                  },
                  {
                    key: 'feedback_alerts',
                    label: 'Feedback Alerts',
                    description: 'Be notified when you receive feedback',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{item.label}</p>
                      <p className="text-sm text-neutral-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings[item.key]}
                        onChange={(e) =>
                          setNotificationSettings({
                            ...notificationSettings,
                            [item.key]: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-300 peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button icon={Save} onClick={handleNotificationSave}>
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card title="Security Settings" subtitle="Manage your password and security">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-neutral-800 mb-4">Change Password</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordData.current_password}
                          onChange={(e) =>
                            setPasswordData({ ...passwordData, current_password: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, new_password: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirm_password}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirm_password: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    icon={Shield}
                    onClick={handlePasswordChange}
                    disabled={!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password || isLoading}
                  >
                    {isLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>

                <hr />

                {/* Danger Zone */}
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 mb-4">
                    Logging out will end your current session. You'll need to log in again to access the system.
                  </p>
                  <Button variant="danger" icon={LogOut} onClick={logout}>
                    Logout
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
