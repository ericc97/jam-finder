import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

import ArtistProfileScreen from '../screens/ArtistProfileScreen';
import VenueProfileScreen from '../screens/VenueProfileScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import MatchesScreen from '../screens/MatchesScreen';
import SwipeScreen from '../screens/SwipeScreen';

const Tab = createBottomTabNavigator();

export default function Tabs() {
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserRole = async () => {
      try {
        const user = auth().currentUser;
        if (user) {
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            setUserRole(userDoc.data().role);
          }
        }
      } catch (error) {
        console.error('Error loading user role:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserRole();
  }, []);

  if (isLoading) {
    return null; // Or a loading spinner
  }

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
        <Tab.Screen 
          name="Swipe" 
          component={SwipeScreen}
          options={{
            title: userRole === 'artist' ? 'Find Venues' : 'Find Artists'
          }}
        />
        <Tab.Screen name="Matches" component={MatchesScreen} />
        <Tab.Screen 
          name="Profile" 
          component={userRole === 'artist' ? ArtistProfileScreen : VenueProfileScreen}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
