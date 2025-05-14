// screens/MatchesScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Image
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadMatches = async () => {
      try {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        const matchesSnapshot = await firestore()
          .collection('matches')
          .where('users', 'array-contains', currentUser.uid)
          .get();

        const matchesData = [];
        for (const doc of matchesSnapshot.docs) {
          const matchData = doc.data();
          const otherUserId = matchData.users.find(id => id !== currentUser.uid);
          
          if (otherUserId) {
            const userDoc = await firestore().collection('users').doc(otherUserId).get();
            if (userDoc.exists) {
              matchesData.push({
                id: doc.id,
                profile: userDoc.data(),
                matchedAt: matchData.matchedAt,
              });
            }
          }
        }

        // Sort matches by most recent
        matchesData.sort((a, b) => b.matchedAt?.toDate() - a.matchedAt?.toDate());
        setMatches(matchesData);
      } catch (error) {
        console.error('Error loading matches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, []);

  const goToChat = (match) => {
    navigation.navigate('Chat', { 
      matchId: match.id,
      otherUser: match.profile
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00adf5" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses" size={64} color="#00adf5" />
        <Text style={styles.emptyText}>No matches yet</Text>
        <Text style={styles.emptySubtext}>
          Start swiping to find your perfect match!
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <Text style={styles.headerSubtitle}>
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </Text>
      </View>
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => goToChat(item)}
            style={styles.matchCard}
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
                <View style={styles.roleContainer}>
                  <Ionicons 
                    name={item.profile?.role === 'artist' ? 'musical-notes' : 'business'} 
                    size={16} 
                    color="#00adf5" 
                  />
                  <Text style={styles.role}>
                    {item.profile?.role === 'artist' ? 'Artist' : 'Venue'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </View>
            {item.profile?.headerImages?.[0] && (
              <FastImage 
                source={{ 
                  uri: item.profile.headerImages[0],
                  priority: FastImage.priority.normal,
                }} 
                style={styles.headerImage}
              />
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#00adf5',
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ccc',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  genre: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  role: {
    fontSize: 14,
    color: '#00adf5',
    marginLeft: 4,
  },
  headerImage: {
    width: '100%',
    height: 120,
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
});
