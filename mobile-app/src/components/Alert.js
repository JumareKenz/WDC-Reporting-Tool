import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

const Alert = ({ type = 'info', title, message, onClose, style }) => {
  const getAlertStyles = () => {
    const styles = {
      success: {
        backgroundColor: COLORS.success[50],
        borderColor: COLORS.success[200],
        iconColor: COLORS.success[600],
        textColor: COLORS.success[800],
        icon: 'checkmark-circle',
      },
      error: {
        backgroundColor: COLORS.error[50],
        borderColor: COLORS.error[200],
        iconColor: COLORS.error[600],
        textColor: COLORS.error[800],
        icon: 'alert-circle',
      },
      warning: {
        backgroundColor: COLORS.warning[50],
        borderColor: COLORS.warning[200],
        iconColor: COLORS.warning[600],
        textColor: COLORS.warning[800],
        icon: 'warning',
      },
      info: {
        backgroundColor: COLORS.info[50],
        borderColor: COLORS.info[200],
        iconColor: COLORS.info[600],
        textColor: COLORS.info[800],
        icon: 'information-circle',
      },
    };
    return styles[type] || styles.info;
  };

  const alertStyles = getAlertStyles();

  return (
    <View
      style={[
        localStyles.container,
        {
          backgroundColor: alertStyles.backgroundColor,
          borderColor: alertStyles.borderColor,
        },
        style,
      ]}
    >
      <Ionicons name={alertStyles.icon} size={24} color={alertStyles.iconColor} />
      <View style={localStyles.content}>
        {title && (
          <Text style={[localStyles.title, { color: alertStyles.textColor }]}>
            {title}
          </Text>
        )}
        {message && (
          <Text style={[localStyles.message, { color: alertStyles.textColor }]}>
            {message}
          </Text>
        )}
      </View>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={localStyles.closeButton}>
          <Ionicons name="close" size={20} color={alertStyles.iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
  },
  closeButton: {
    marginLeft: 8,
  },
});

export default Alert;
