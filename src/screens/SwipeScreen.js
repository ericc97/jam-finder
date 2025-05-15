import React, { useEffect, useState } from 'react';
import { Alert, Text, View, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import SwipeCard from '../components/SwipeCard';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function SwipeScreen() {
  const [cards, setCards] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allCardsSwiped, setAllCardsSwiped] = useState(false);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          console.log('Loading profiles for user:', user.uid);
          // Get current user's role
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          
          if (!userDoc.exists) {
            console.log('Current user document not found');
            return;
          }

          const data = userDoc.data();
          console.log('User role:', data.role);
          setUserData(data);
          setCurrentUserRole(data.role);
          
          // Get all matches for current user
          const matchesSnapshot = await firestore()
            .collection('matches')
            .where('users', 'array-contains', user.uid)
            .get();

          // Get IDs of all matched users
          const matchedUserIds = new Set();
          matchesSnapshot.forEach(doc => {
            const matchData = doc.data();
            matchData.users.forEach(userId => {
              if (userId !== user.uid) {
                matchedUserIds.add(userId);
              }
            });
          });

          console.log('Matched user IDs:', Array.from(matchedUserIds));

          // Get all users with the opposite role, excluding matched users
          const oppositeRole = data.role === 'artist' ? 'venue' : 'artist';
          console.log('Looking for users with role:', oppositeRole);
          
          const querySnapshot = await firestore()
            .collection('users')
            .where('role', '==', oppositeRole)
            .get();
          
          const allUsers = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user => 
              user.id !== user.uid && 
              !matchedUserIds.has(user.id)
            );

          console.log(`Found ${allUsers.length} ${oppositeRole}s to show`);
          console.log('Setting cards:', allUsers);
          setCards(allUsers);
        } catch (error) {
          console.error('Error loading profiles:', error);
          Alert.alert('Error', 'Failed to load profiles');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSwipeRight = async (cardIndex) => {
    const swipedUser = cards[cardIndex];
    const currentUser = auth().currentUser.uid;

    try {
      // Save to favorites
      await firestore().collection('favorites').doc(currentUser).set({
        [swipedUser.id]: true
      }, { merge: true });

      // Check if mutual favorite
      const otherUserFavDoc = await firestore().collection('favorites').doc(swipedUser.id).get();
      if (otherUserFavDoc.exists && otherUserFavDoc.data()[currentUser]) {
        // Create match
        const matchId = [currentUser, swipedUser.id].sort().join('_');
        await firestore().collection('matches').doc(matchId).set({
          users: [currentUser, swipedUser.id],
          matchedAt: firestore.FieldValue.serverTimestamp(),
        });

        // Remove the matched user from the cards array
        setCards(prevCards => prevCards.filter(card => card.id !== swipedUser.id));
        
        // Check if this was the last card
        if (cards.length === 1) {
          setAllCardsSwiped(true);
        }

        Alert.alert("🎉 It's a match!", `You and ${swipedUser.name} can now chat.`);
      }
    } catch (error) {
      console.error('Error handling swipe right:', error);
      Alert.alert('Error', 'Failed to process swipe');
    }
  };

  const handleSwipeLeft = (cardIndex) => {
    // Check if this was the last card
    if (cards.length === 1) {
      setAllCardsSwiped(true);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00adf5" />
      </View>
    );
  }

  console.log('Current state:', { 
    cardsLength: cards?.length, 
    currentUserRole, 
    isLoading 
  });

  // Show empty state if no cards or all cards have been swiped
  if (!cards || cards.length === 0 || allCardsSwiped) {
    console.log('Showing empty state');
    const message = currentUserRole === 'artist' ? 'No venues to show' : 'No artists to show';
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <Ionicons name="musical-notes" size={80} color="#00adf5" />
          <Text style={styles.emptyText}>{message}</Text>
          <Text style={styles.emptySubtext}>We've shown you all available profiles for now.</Text>
          <Text style={styles.emptySubtext}>Check back later for new matches!</Text>
          <View style={styles.emptyDivider} />
          <Text style={styles.emptyTip}>
            Tip: Complete your profile to increase your chances of finding matches
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('Rendering swiper with cards:', cards.length);
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentUserRole === 'artist' ? 'Find Venues' : 'Find Artists'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Swipe right to favorite, left to skip
        </Text>
      </View>
      <View style={styles.swiperContainer}>
        <Swiper
          cards={cards}
          renderCard={(card) => <SwipeCard user={card} />}
          onSwipedRight={handleSwipeRight}
          onSwipedLeft={handleSwipeLeft}
          stackSize={3}
          backgroundColor="transparent"
          cardStyle={styles.swiperCard}
          containerStyle={styles.swiperContainerStyle}
          cardIndex={0}
          animateOverlayLabelsOpacity
          marginBottom={100}
          overlayLabels={{
            left: {
              title: 'SKIP',
              style: {
                label: {
                  textAlign: 'right',
                  color: '#ff3b30',
                  fontSize: 24,
                  fontWeight: 'bold',
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: -30,
                },
              },
            },
            right: {
              title: 'FAVORITE',
              style: {
                label: {
                  textAlign: 'left',
                  color: '#00adf5',
                  fontSize: 24,
                  fontWeight: 'bold',
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: 30,
                },
              },
            },
          }}
        />
      </View>
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
    backgroundColor: '#f8f9fa',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDivider: {
    width: '80%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  emptyTip: {
    fontSize: 14,
    color: '#00adf5',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
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
  swiperContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperContainerStyle: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swiperCard: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
});
