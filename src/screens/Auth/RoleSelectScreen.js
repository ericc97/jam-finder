import React from 'react';
import { Button, Text, View } from 'react-native';

export default function RoleSelectScreen({ navigation }) {
  return (
    <View>
      <Text>Select Your Role:</Text>
      <Button title="Artist" onPress={() => navigation.navigate('Signup', { role: 'artist' })} />
      <Button title="Venue" onPress={() => navigation.navigate('Signup', { role: 'venue' })} />
    </View>
  );
}
