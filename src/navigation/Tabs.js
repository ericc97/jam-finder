import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import ArtistProfileScreen from '../screens/ArtistProfileScreen'; // or VenueProfileScreen if dynamic
import FavoritesScreen from '../screens/FavoritesScreen';
import MatchesScreen from '../screens/MatchesScreen';
import SwipeScreen from '../screens/SwipeScreen';

const Tab = createBottomTabNavigator();

export default function Tabs() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Swipe':
              iconName = 'musical-notes';
              break;
            case 'Matches':
              iconName = 'chatbubble-ellipses';
              break;
            case 'Favorites':
              iconName = 'heart';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'apps';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#00adf5',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            paddingBottom: 5,
            paddingTop: 5,
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
      })}
    >
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ArtistProfileScreen} />
    </Tab.Navigator>
    </SafeAreaView>
  );
}
