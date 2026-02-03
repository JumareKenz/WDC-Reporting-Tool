import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export const Card = ({ title, subtitle, children, style, action }) => {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle || action) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {action && <View style={styles.action}>{action}</View>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

export const IconCard = ({
  icon,
  iconColor = 'primary',
  title,
  value,
  subtitle,
  trend,
  style,
}) => {
  const getIconColor = () => {
    const colors = {
      primary: COLORS.primary[600],
      success: COLORS.success[600],
      warning: COLORS.warning[600],
      error: COLORS.error[600],
      info: COLORS.info[600],
      neutral: COLORS.neutral[500],
    };
    return colors[iconColor] || colors.primary;
  };

  const getIconBgColor = () => {
    const colors = {
      primary: COLORS.primary[100],
      success: COLORS.success[100],
      warning: COLORS.warning[100],
      error: COLORS.error[100],
      info: COLORS.info[100],
      neutral: COLORS.neutral[100],
    };
    return colors[iconColor] || colors.primary;
  };

  return (
    <View style={[styles.card, styles.iconCard, style]}>
      <View style={[styles.iconContainer, { backgroundColor: getIconBgColor() }]}>
        <Ionicons name={icon} size={24} color={getIconColor()} />
      </View>
      <View style={styles.iconCardContent}>
        <Text style={styles.iconCardTitle}>{title}</Text>
        <Text style={styles.iconCardValue}>{value}</Text>
        {subtitle && <Text style={styles.iconCardSubtitle}>{subtitle}</Text>}
        {trend && <View style={styles.trend}>{trend}</View>}
      </View>
    </View>
  );
};

export const StatCard = ({ label, value, icon, color = COLORS.primary[600], style }) => {
  return (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.neutral[600],
  },
  action: {
    marginLeft: 8,
  },
  content: {
    // Content styles
  },
  iconCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconCardContent: {
    flex: 1,
  },
  iconCardTitle: {
    fontSize: 12,
    color: COLORS.neutral[600],
    marginBottom: 4,
  },
  iconCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 2,
  },
  iconCardSubtitle: {
    fontSize: 12,
    color: COLORS.neutral[500],
  },
  trend: {
    marginTop: 4,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.neutral[900],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.neutral[600],
  },
});

export default Card;
