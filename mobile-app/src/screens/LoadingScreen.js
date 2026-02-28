import React from 'react';
import { View, StyleSheet } from 'react-native';
import LoadingSpinner from '../components/LoadingSpinner';

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <LoadingSpinner fullScreen text="Loading..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default LoadingScreen;
