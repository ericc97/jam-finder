import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { auth } from './src/services/firebase';

import Tabs from './src/navigation/Tabs';
import LoginScreen from './src/screens/Auth/LoginScreen';
import RoleSelectScreen from './src/screens/Auth/RoleSelectScreen';
import SignupScreen from './src/screens/Auth/SignupScreen';
import ChatScreen from './src/screens/ChatScreen';
import ViewProfileScreen from './src/screens/ViewProfileScreen';
import PublicProfileScreen from './src/screens/PublicProfileScreen';

const Stack = createNativeStackNavigator();

// Deep linking configuration
const linking = {
  prefixes: ['https://jamfinder.app', 'jamfinder://'],
  config: {
    screens: {
      PublicProfile: {
        path: 'public/:role/:publicId',
        parse: {
          publicId: (publicId) => publicId,
          role: (role) => role,
        },
      },
    },
  },
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <SafeAreaView style={{ flex: 1 }}>
        <NavigationContainer linking={linking}>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'white' }
            }}
          >
            {user ? (
              <>
                <Stack.Screen name="Tabs" component={Tabs} />
                <Stack.Screen
                  name="Chat"
                  component={ChatScreen}
                  options={{ headerShown: true, title: 'Chat' }}
                />
                <Stack.Screen
                  name="ViewProfileScreen"
                  component={ViewProfileScreen}
                  options={({ navigation }) => ({ 
                    headerShown: true, 
                    title: 'Profile',
                    headerBackTitle: 'Matches'
                  })}
                />
                <Stack.Screen
                  name="PublicProfile"
                  component={PublicProfileScreen}
                  options={{ headerShown: true, title: 'Profile' }}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen
                  name="PublicProfile"
                  component={PublicProfileScreen}
                  options={{ headerShown: true, title: 'Profile' }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
