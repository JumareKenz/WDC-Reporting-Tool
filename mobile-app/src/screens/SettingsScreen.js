import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert as RNAlert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, APP_CONFIG } from '../utils/constants';
import Button from '../components/Button';

const SettingsScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    RNAlert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'person-outline', label: 'Profile', onPress: () => {} },
    { icon: 'lock-closed-outline', label: 'Change Password', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notification Settings', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'information-circle-outline', label: 'About', onPress: () => {} },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.full_name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.userRole}>
            <Text style={styles.userRoleText}>{user?.role?.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={24} color={COLORS.neutral[600]} />
                <Text style={styles.menuItemLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.neutral[400]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{APP_CONFIG.APP_NAME}</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appSupport}>Support: {APP_CONFIG.SUPPORT_EMAIL}</Text>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <Button variant="danger" icon="log-out-outline" onPress={handleLogout} fullWidth>
            Logout
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral[50],
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.neutral[900],
  },
  userInfo: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.neutral[600],
    marginBottom: 12,
  },
  userRole: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.primary[100],
    borderRadius: 16,
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary[700],
  },
  menu: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemLabel: {
    fontSize: 16,
    color: COLORS.neutral[900],
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral[900],
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: COLORS.neutral[600],
    marginBottom: 4,
  },
  appSupport: {
    fontSize: 12,
    color: COLORS.neutral[500],
  },
  logoutSection: {
    padding: 20,
  },
});

export default SettingsScreen;
