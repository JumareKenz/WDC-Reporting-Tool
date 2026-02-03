import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    const variants = {
      primary: {
        container: { backgroundColor: COLORS.primary[600] },
        text: { color: '#ffffff' },
      },
      secondary: {
        container: { backgroundColor: COLORS.neutral[100], borderWidth: 1, borderColor: COLORS.neutral[300] },
        text: { color: COLORS.neutral[700] },
      },
      success: {
        container: { backgroundColor: COLORS.success[600] },
        text: { color: '#ffffff' },
      },
      danger: {
        container: { backgroundColor: COLORS.error[600] },
        text: { color: '#ffffff' },
      },
      outline: {
        container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary[600] },
        text: { color: COLORS.primary[600] },
      },
      ghost: {
        container: { backgroundColor: 'transparent' },
        text: { color: COLORS.primary[600] },
      },
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      sm: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 14 },
      md: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 16 },
      lg: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 18 },
    };
    return sizes[size] || sizes.md;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        variantStyles.container,
        sizeStyles,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={sizeStyles.fontSize + 4} color={variantStyles.text.color} style={styles.iconLeft} />
          )}
          <Text style={[styles.text, variantStyles.text, { fontSize: sizeStyles.fontSize }, textStyle]}>
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={sizeStyles.fontSize + 4} color={variantStyles.text.color} style={styles.iconRight} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  text: {
    fontWeight: '600',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

export default Button;
