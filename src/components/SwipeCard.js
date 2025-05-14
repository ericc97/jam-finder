import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function SwipeCard({ user }) {
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid || !user?.id) return;

      const favDoc = await getDoc(doc(db, 'favorites', uid));
      if (favDoc.exists() && favDoc.data()[user.id]) {
        setIsFavorited(true);
      }
    };

    checkFavorite();
  }, [user?.id]);

  const toggleFavorite = async () => {
    const uid = auth.currentUser?.uid;
    const ref = doc(db, 'favorites', uid);

    if (isFavorited) {
      await updateDoc(ref, { [user.id]: null });
      setIsFavorited(false);
    } else {
      await setDoc(ref, { [user.id]: true }, { merge: true });
      setIsFavorited(true);
    }
  };

  return (
    <View style={styles.card}>
      <Image
        source={{
          uri: user?.profileImage || user?.headerImages?.[0]
        }}
        style={styles.image}
      />
      <Text style={styles.name}>{user.name}</Text>
      <Text>{user.genre}</Text>
      <Text numberOfLines={3}>{user.bio}</Text>
      <Button
        title={isFavorited ? 'Unfavorite' : 'Favorite'}
        onPress={toggleFavorite}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 16,
    elevation: 5,
    margin: 8,
  },
  image: {
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
