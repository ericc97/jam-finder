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
      console.log('\n\n');
      console.log('========================================');
      console.log('AUTH STATE CHANGED:');
      console.log('User:', user?.uid);
      console.log('========================================');
      console.log('\n\n');

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
          
          // Make role message more prominent
          console.log('\n\n');
          console.log('========================================');
          console.log(`CURRENT USER ROLE: ${data.role.toUpperCase()}`);
          console.log('========================================');
          console.log('\n\n');

          // Get all users with the opposite role
          const querySnapshot = await firestore().collection('users').get();
          const oppositeRole = data.role === 'artist' ? 'venue' : 'artist';
          
          console.log('Looking for users with role:', oppositeRole);
          console.log('Total users in collection:', querySnapshot.docs.length);
          
          const allUsers = querySnapshot.docs
            .map(doc => {
              const data = doc.data();
              console.log('User data:', { 
                id: doc.id, 
                role: data.role, 
                name: data.name,
                publicId: data.publicId 
              });
              return { id: doc.id, ...data };
            })
            .filter(user => {
              const matches = user.id !== user.uid && user.role === oppositeRole;
              console.log(`User ${user.id} (${user.role}): ${matches ? 'matches' : 'filtered out'}`);
              return matches;
            });

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

    // Save "like"
    await firestore().collection('likes').doc(`${currentUser}_${swipedUser.id}`).set({
      from: currentUser,
      to: swipedUser.id,
      timestamp: new Date().toISOString(),
    });

    // Check if mutual like
    const reverseLikeDoc = await firestore().collection('likes').doc(`${swipedUser.id}_${currentUser}`).get();
    if (reverseLikeDoc.exists) {
      // Create match
      const matchId = [currentUser, swipedUser.id].sort().join('_');
      await firestore().collection('matches').doc(matchId).set({
        users: [currentUser, swipedUser.id],
        matchedAt: new Date().toISOString(),
      });

      Alert.alert("🎉 It's a match!", `You and ${swipedUser.name} can now chat.`);
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
