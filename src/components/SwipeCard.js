import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Dimensions } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SwipeCard({ user }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
          <Text style={styles.equipmentDetails} numberOfLines={1} ellipsizeMode="tail">
            {details}
          </Text>
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

      <View style={styles.nameContainer}>
        <Text style={styles.name}>{user?.name || 'No Name'}</Text>
      </View>

      {user.role === 'artist' && user.genre && (
        <View style={styles.genreContainer}>
          <Ionicons name="musical-notes" size={16} color="#00adf5" />
          <Text style={styles.genreText}>{user.genre}</Text>
        </View>
      )}

      <View style={styles.bioContainer}>
        <Text style={styles.bio} numberOfLines={3}>{user?.bio || 'No Bio'}</Text>
      </View>

      {user.role === 'venue' && (
        <View style={styles.venueInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {user.address || 'No address provided'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.infoText}>
                {user.capacity ? `${user.capacity} capacity` : 'No capacity info'}
              </Text>
            </View>
          </View>
          {renderEquipmentInfo()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 5,
    margin: 8,
    marginLeft: 20,
    marginTop: 13,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: width * 0.9,
    maxHeight: '95%',
    alignSelf: 'flex-start',
  },
  image: {
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  bioContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  venueInfo: {
    padding: 12,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  equipmentContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  equipmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  equipmentOptions: {
    marginBottom: 6,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  equipmentOptionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  equipmentDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  genreText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
});
