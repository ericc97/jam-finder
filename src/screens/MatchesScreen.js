// screens/MatchesScreen.js
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { FlatList, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';

export default function MatchesScreen() {
  const [matches, setMatches] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchMatches = async () => {
      const querySnapshot = await firestore().collection('matches').get();
      const currentUser = auth().currentUser?.uid;

      const myMatches = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(match => match.users.includes(currentUser));

      // Fetch profile information for each match
      const matchesWithProfiles = await Promise.all(
        myMatches.map(async (match) => {
          const otherUserId = match.users.find(id => id !== currentUser);
          const userDoc = await firestore().collection('users').doc(otherUserId).get();
          return {
            ...match,
            profile: userDoc.data()
          };
        })
      );

      setMatches(matchesWithProfiles);
    };

    fetchMatches();
  }, []);

  const goToChat = (match) => {
    const otherUserId = match.users.find(id => id !== auth().currentUser.uid);
    navigation.navigate('Chat', {
      matchId: match.id,
      otherUserName: match.profile.name,
    });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => goToChat(item)}
            style={styles.matchItem}
          >
            <View style={styles.profileSection}>
              {item.profile?.profileImage ? (
                <FastImage 
                  source={{ 
                    uri: item.profile.profileImage,
                    priority: FastImage.priority.high,
                  }} 
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>No Photo</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{item.profile?.name || 'Unknown User'}</Text>
                <Text style={styles.genre}>{item.profile?.genre || 'No Genre'}</Text>
                <Text style={styles.role}>{item.profile?.role === 'artist' ? 'Artist' : 'Venue'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  matchItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  genre: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  role: {
    fontSize: 14,
    color: '#00adf5',
    textTransform: 'capitalize',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
  },
});
