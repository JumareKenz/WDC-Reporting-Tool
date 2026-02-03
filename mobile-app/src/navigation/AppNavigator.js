import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { USER_ROLES, COLORS } from '../utils/constants';

// Screens
import LoginScreen from '../screens/LoginScreen';
import LoadingScreen from '../screens/LoadingScreen';
import WDCDashboardScreen from '../screens/wdc/WDCDashboardScreen';
import SubmitReportScreen from '../screens/wdc/SubmitReportScreen';
import MyReportsScreen from '../screens/wdc/MyReportsScreen';
import LGADashboardScreen from '../screens/lga/LGADashboardScreen';
import LGAWardsScreen from '../screens/lga/LGAWardsScreen';
import LGAReportsScreen from '../screens/lga/LGAReportsScreen';
import StateDashboardScreen from '../screens/state/StateDashboardScreen';
import StateAnalyticsScreen from '../screens/state/StateAnalyticsScreen';
import StateLGAsScreen from '../screens/state/StateLGAsScreen';
import StateInvestigationsScreen from '../screens/state/StateInvestigationsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ReportDetailsScreen from '../screens/ReportDetailsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// WDC Secretary Tabs
const WDCTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Submit') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Reports') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'More') iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary[600],
        tabBarInactiveTintColor: COLORS.neutral[500],
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={WDCDashboardScreen} />
      <Tab.Screen name="Submit" component={SubmitReportScreen} options={{ title: 'Submit Report' }} />
      <Tab.Screen name="Reports" component={MyReportsScreen} options={{ title: 'My Reports' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// LGA Coordinator Tabs
const LGATabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Wards') iconName = focused ? 'location' : 'location-outline';
          else if (route.name === 'Reports') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'More') iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary[600],
        tabBarInactiveTintColor: COLORS.neutral[500],
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={LGADashboardScreen} />
      <Tab.Screen name="Wards" component={LGAWardsScreen} />
      <Tab.Screen name="Reports" component={LGAReportsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// State Official Tabs
const StateTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'LGAs') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'Investigations') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'More') iconName = focused ? 'menu' : 'menu-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary[600],
        tabBarInactiveTintColor: COLORS.neutral[500],
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={StateDashboardScreen} />
      <Tab.Screen name="Analytics" component={StateAnalyticsScreen} />
      <Tab.Screen name="LGAs" component={StateLGAsScreen} />
      <Tab.Screen name="Investigations" component={StateInvestigationsScreen} />
      <Tab.Screen name="More" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

// Main Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {user?.role === USER_ROLES.WDC_SECRETARY && (
              <>
                <Stack.Screen name="WDCDashboard" component={WDCTabs} />
                <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} options={{ headerShown: true, title: 'Report Details' }} />
              </>
            )}
            {user?.role === USER_ROLES.LGA_COORDINATOR && (
              <>
                <Stack.Screen name="LGADashboard" component={LGATabs} />
                <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} options={{ headerShown: true, title: 'Report Details' }} />
              </>
            )}
            {user?.role === USER_ROLES.STATE_OFFICIAL && (
              <>
                <Stack.Screen name="StateDashboard" component={StateTabs} />
                <Stack.Screen name="ReportDetails" component={ReportDetailsScreen} options={{ headerShown: true, title: 'Report Details' }} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
