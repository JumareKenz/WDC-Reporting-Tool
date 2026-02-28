import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_CREDENTIALS, COLORS, APP_CONFIG } from '../utils/constants';
import TextInput from '../components/TextInput';
import Button from '../components/Button';
import Alert from '../components/Alert';

const LoginScreen = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (credentials) => {
    setFormData({ email: credentials.email, password: credentials.password });
    setError(null);
    setLoading(true);

    try {
      await login(credentials.email, credentials.password);
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>K</Text>
          </View>
          <Text style={styles.title}>{APP_CONFIG.APP_NAME}</Text>
          <Text style={styles.subtitle}>{APP_CONFIG.APP_SUBTITLE}</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <TextInput
            label="Email Address"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            placeholder="your.email@kaduna.gov.ng"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            label="Password"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            placeholder="Enter your password"
            icon="lock-closed-outline"
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            secureTextEntry={!showPassword}
            autoComplete="password"
          />

          <Button
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            icon="log-in-outline"
            loading={loading}
            disabled={!formData.email || !formData.password}
            fullWidth
          >
            Sign In
          </Button>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Demo Access</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <View style={styles.demoInfo}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.neutral[600]} />
              <Text style={styles.demoInfoText}>
                Use these demo accounts to explore the system as different user types
              </Text>
            </View>

            {DEMO_CREDENTIALS.map((cred, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleDemoLogin(cred)}
                disabled={loading}
                style={styles.demoButton}
                activeOpacity={0.7}
              >
                <View style={styles.demoButtonContent}>
                  <Text style={styles.demoButtonTitle}>{cred.name}</Text>
                  <Text style={styles.demoButtonEmail}>{cred.email}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={COLORS.neutral[400]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {APP_CONFIG.STATE_NAME}, {APP_CONFIG.COUNTRY}
          </Text>
          <Text style={styles.footerSubtext}>For support: {APP_CONFIG.SUPPORT_EMAIL}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary[50],
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.neutral[600],
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.neutral[200],
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    color: COLORS.neutral[600],
  },
  demoContainer: {
    gap: 12,
  },
  demoInfo: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.info[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  demoInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.neutral[600],
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  demoButtonContent: {
    flex: 1,
  },
  demoButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral[900],
    marginBottom: 4,
  },
  demoButtonEmail: {
    fontSize: 12,
    color: COLORS.neutral[600],
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.neutral[600],
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.neutral[500],
  },
});

export default LoginScreen;
