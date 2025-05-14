import React, { useEffect, useState } from 'react';
import { Button, Image, StyleSheet, Text, View, Alert, TouchableOpacity } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';

export default function SwipeCard({ user }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

      const otherUserFavDoc = await firestore().collection('favorites').doc(user.id).get();
      if (otherUserFavDoc.exists && otherUserFavDoc.data()[uid]) {
        const matchId = [uid, user.id].sort().join('_');
        await firestore().collection('matches').doc(matchId).set({
          users: [uid, user.id],
          matchedAt: firestore.FieldValue.serverTimestamp(),
        });

        Alert.alert("🎉 It's a match!", `You and ${user.name} can now chat.`);
      }
    }
  };

  const renderEquipmentInfo = () => {
    if (!user.equipment) return null;

    const { availableToUse, availableToRent, notIncluded, details } = user.equipment;
    const options = [];

    if (availableToUse) options.push('Available to Use');
    if (availableToRent) options.push('Available to Rent');
    if (notIncluded) options.push('Not Included');

    return (
      <View style={styles.equipmentContainer}>
        <Text style={styles.equipmentTitle}>Equipment</Text>
        {options.length > 0 && (
          <View style={styles.equipmentOptions}>
            {options.map((option, index) => (
              <View key={index} style={styles.equipmentOption}>
                <Ionicons 
                  name={option === 'Not Included' ? 'close-circle' : 'checkmark-circle'} 
                  size={16} 
                  color={option === 'Not Included' ? '#ff3b30' : '#00adf5'} 
                />
                <Text style={styles.equipmentOptionText}>{option}</Text>
              </View>
            ))}
          </View>
        )}
        {details && (
          <Text style={styles.equipmentDetails}>{details}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {user?.headerImages?.[0] ? (
        <FastImage 
          source={{ 
            uri: user.headerImages[0],
            priority: FastImage.priority.high,
          }} 
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
          onError={(error) => {
            console.error('Error loading header image:', error);
            console.log('Failed URL:', user.headerImages[0]);
          }}
          onLoad={() => {
            console.log('Header image loaded successfully:', user.headerImages[0]);
          }}
        />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.profileSection}>
        {user?.profileImage ? (
          <FastImage 
            source={{ 
              uri: user.profileImage,
              priority: FastImage.priority.high,
            }} 
            style={styles.profileImage}
            onError={(error) => {
              console.error('Error loading profile image:', error);
              console.log('Failed URL:', user.profileImage);
            }}
            onLoad={() => {
              console.log('Profile image loaded successfully:', user.profileImage);
            }}
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
        <TouchableOpacity 
          style={[styles.favoriteButton, isFavorited && styles.favoritedButton]} 
          onPress={toggleFavorite}
        >
          <Ionicons 
            name={isFavorited ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorited ? "#fff" : "#00adf5"} 
          />
        </TouchableOpacity>
      </View>
      <View style={styles.bioContainer}>
        <Text style={styles.bio} numberOfLines={3}>{user?.bio || 'No Bio'}</Text>
      </View>
      {user.role === 'venue' && (
        <>
          {user.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.infoText}>{user.address}</Text>
            </View>
          )}
          {user.capacity && (
            <View style={styles.infoRow}>
              <Ionicons name="people" size={20} color="#666" />
              <Text style={styles.infoText}>Capacity: {user.capacity}</Text>
            </View>
          )}
          {renderEquipmentInfo()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 16,
    elevation: 5,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    height: 250,
    borderRadius: 15,
    marginBottom: 15,
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#00adf5',
  },
  placeholderProfile: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ccc',
  },
  profileInfo: {
    flex: 1,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  genre: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bioContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginTop: 5,
  },
  bio: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00adf5',
    marginLeft: 10,
  },
  favoritedButton: {
    backgroundColor: '#00adf5',
    borderColor: '#00adf5',
  },
  equipmentContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  equipmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  equipmentOptions: {
    marginBottom: 8,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  equipmentOptionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  equipmentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
});
