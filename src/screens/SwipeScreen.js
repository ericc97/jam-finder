import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import SwipeCard from '../components/SwipeCard';
import { auth, db } from '../services/firebase';

export default function SwipeScreen() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const loadProfiles = async () => {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const currentUser = auth.currentUser?.uid;

      const allUsers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUser); // Exclude self

      setCards(allUsers);
    };

    loadProfiles();
  }, []);

  const handleSwipeRight = async (cardIndex) => {
    const swipedUser = cards[cardIndex];
    const currentUser = auth.currentUser.uid;

    // Save "like"
    await setDoc(doc(db, `likes/${currentUser}_${swipedUser.id}`), {
      from: currentUser,
      to: swipedUser.id,
      timestamp: new Date().toISOString(),
    });

    // Check if mutual like
    const reverseLikeDoc = await getDoc(doc(db, `likes/${swipedUser.id}_${currentUser}`));
    if (reverseLikeDoc.exists()) {
      // Create match
      const matchId = [currentUser, swipedUser.id].sort().join('_');
      await setDoc(doc(db, `matches/${matchId}`), {
        users: [currentUser, swipedUser.id],
        matchedAt: new Date().toISOString(),
      });

      Alert.alert('🎉 It’s a match!', `You and ${swipedUser.name} can now chat.`);
    }
  };

  if (!cards.length) {
    return <Text>Loading profiles...</Text>;
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
