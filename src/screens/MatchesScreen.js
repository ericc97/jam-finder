// screens/MatchesScreen.js
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function MatchesScreen() {
  const [matches, setMatches] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchMatches = async () => {
      const querySnapshot = await getDocs(collection(db, 'matches'));
      const currentUser = auth.currentUser?.uid;

      const myMatches = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(match => match.users.includes(currentUser));

      setMatches(myMatches);
    };

    fetchMatches();
  }, []);

  const goToChat = (match) => {
    const otherUserId = match.users.find(id => id !== auth.currentUser.uid);
    // Optional: load name/profile from `users` collection if desired
    navigation.navigate('Chat', {
      matchId: match.id,
      otherUserName: 'Your Match', // replace with real name if desired
    });
  };

  return (
    <View>
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => goToChat(item)}
            style={{ padding: 16, borderBottomWidth: 1 }}
          >
            <Text>Match: {item.id.replaceAll('_', ' & ')}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
