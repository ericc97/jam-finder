import React, { useEffect, useState } from 'react';
import { Button, Image, StyleSheet, Text, View } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function SwipeCard({ user }) {
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const uid = auth().currentUser?.uid;
      if (!uid || !user?.id) return;

      const favDoc = await firestore().collection('favorites').doc(uid).get();
      if (favDoc.exists && favDoc.data()[user.id]) {
        setIsFavorited(true);
      }
    };

    checkFavorite();
  }, [user?.id]);

  const toggleFavorite = async () => {
    const uid = auth().currentUser?.uid;
    const ref = firestore().collection('favorites').doc(uid);

    if (isFavorited) {
      await ref.update({ [user.id]: null });
      setIsFavorited(false);
    } else {
      await ref.set({ [user.id]: true }, { merge: true });
      setIsFavorited(true);
    }
  };

  return (
    <View style={styles.card}>
      {user?.headerImages?.[0] ? (
        <Image 
          source={{ uri: user.headerImages[0] }} 
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.profileSection}>
        {user?.profileImage ? (
          <Image 
            source={{ uri: user.profileImage }} 
            style={styles.profileImage}
          />
        ) : (
          <View style={[styles.profileImage, styles.placeholderProfile]}>
            <Text style={styles.placeholderText}>No Photo</Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name || 'No Name'}</Text>
          <Text style={styles.genre}>{user?.genre || 'No Genre'}</Text>
        </View>
      </View>
      <Text style={styles.bio} numberOfLines={3}>{user?.bio || 'No Bio'}</Text>
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
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
  },
  placeholderProfile: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  genre: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    marginBottom: 12,
  },
});
