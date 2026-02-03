import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../utils/constants';
import { IconCard } from '../../components/Card';
import Button from '../../components/Button';

const StateDashboardScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>State Official</Text>
          <Text style={styles.headerSubtitle}>{user?.full_name || 'State Dashboard'}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.statsGrid}>
            <IconCard icon="map" iconColor="primary" title="Total LGAs" value="23" subtitle="In Kaduna State" />
            <IconCard icon="location" iconColor="info" title="Total Wards" value="255" subtitle="Across all LGAs" />
            <IconCard icon="document-text" iconColor="success" title="Reports" value="189" subtitle="This month" />
          </View>

          <View style={styles.actions}>
            <Button icon="bar-chart-outline" variant="outline" fullWidth>
              View Analytics
            </Button>
            <Button icon="map-outline" variant="outline" fullWidth>
              View All LGAs
            </Button>
            <Button icon="search-outline" variant="outline" fullWidth>
              Investigations
            </Button>
          </View>
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
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.neutral[600],
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
  },
});

export default StateDashboardScreen;
