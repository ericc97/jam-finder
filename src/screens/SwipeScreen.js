import React, { useEffect, useState } from 'react';
import { Alert, Text, View, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import SwipeCard from '../components/SwipeCard';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function SwipeScreen() {
  const [cards, setCards] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get current user's role
          const userDoc = await firestore().collection('users').doc(user.uid).get();
          
          if (!userDoc.exists) {
            console.log('Current user document not found');
            return;
          }

          const data = userDoc.data();
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

          // Get all users with the opposite role, excluding matched users
          const oppositeRole = data.role === 'artist' ? 'venue' : 'artist';
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

        Alert.alert("🎉 It's a match!", `You and ${swipedUser.name} can now chat.`);
      }
    } catch (error) {
      console.error('Error handling swipe right:', error);
      Alert.alert('Error', 'Failed to process swipe');
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!cards.length) {
    const message = currentUserRole === 'artist' ? 'No venues to show' : 'No artists to show';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{message}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Swiper
        cards={cards}
        renderCard={(card) => <SwipeCard user={card} />}
        onSwipedRight={handleSwipeRight}
        stackSize={3}
        backgroundColor="transparent"
      />
    </View>
  );
}
