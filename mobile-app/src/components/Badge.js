import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusBgColor, getStatusTextColor } from '../utils/formatters';

const Badge = ({ status, label, style }) => {
  const backgroundColor = getStatusBgColor(status);
  const color = getStatusTextColor(status);

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default Badge;
