/**
 * Web entry point for Kaduna WDC Mobile App
 */
import './src/polyfills';
import { AppRegistry } from 'react-native';
import App from './App';

// Register the app
AppRegistry.registerComponent('kaduna-wdc-mobile', () => App);

// Run the app
AppRegistry.runApplication('kaduna-wdc-mobile', {
  rootTag: document.getElementById('root'),
});
