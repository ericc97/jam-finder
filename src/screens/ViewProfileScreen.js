import React from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

export default function ViewProfileScreen({ route, navigation }) {
  const { profile } = route.params;
  const [currentHeaderIndex, setCurrentHeaderIndex] = React.useState(0);

  const handleNextImage = () => {
    if (profile.headerImages?.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === profile.headerImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (profile.headerImages?.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === 0 ? profile.headerImages.length - 1 : prevIndex - 1
      );
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.headerContainer}>
        {profile.headerImages?.[0] ? (
          <View style={styles.headerImageWrapper}>
            <FastImage 
              source={{ uri: profile.headerImages[currentHeaderIndex] }}
              style={styles.headerImage}
              resizeMode={FastImage.resizeMode.cover}
            />
            {profile.headerImages.length > 1 && (
              <>
                <TouchableOpacity 
                  style={[styles.headerNavButton, styles.headerNavButtonLeft]}
                  onPress={handlePrevImage}
                >
                  <Ionicons name="chevron-back" size={30} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.headerNavButton, styles.headerNavButtonRight]}
                  onPress={handleNextImage}
                >
                  <Ionicons name="chevron-forward" size={30} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={styles.headerPlaceholder}>
            <Ionicons name="image" size={40} color="#fff" />
            <Text style={styles.headerPlaceholderText}>No Images</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.name || 'No Name'}</Text>
          <Text style={styles.role}>{profile.role === 'artist' ? 'Artist' : 'Venue'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bio}>{profile.bio || 'No bio added yet'}</Text>
        </View>

        {profile.role === 'artist' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genre</Text>
            <Text style={styles.genre}>{profile.genre || 'No genre specified'}</Text>
          </View>
        )}

        {profile.role === 'venue' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.location}>{profile.address || 'No address added yet'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capacity</Text>
              <Text style={styles.capacity}>{profile.capacity || 'No capacity specified'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment</Text>
              <View style={styles.equipmentContainer}>
                <View style={styles.equipmentOption}>
                  <Ionicons 
                    name={profile.equipment?.availableToUse ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={profile.equipment?.availableToUse ? "#00adf5" : "#ff3b30"} 
                  />
                  <Text style={styles.equipmentText}>Available to Use</Text>
                </View>
                <View style={styles.equipmentOption}>
                  <Ionicons 
                    name={profile.equipment?.availableToRent ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={profile.equipment?.availableToRent ? "#00adf5" : "#ff3b30"} 
                  />
                  <Text style={styles.equipmentText}>Available to Rent</Text>
                </View>
                <View style={styles.equipmentOption}>
                  <Ionicons 
                    name={profile.equipment?.notIncluded ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={profile.equipment?.notIncluded ? "#00adf5" : "#ff3b30"} 
                  />
                  <Text style={styles.equipmentText}>Not Included</Text>
                </View>
                {profile.equipment?.details && (
                  <Text style={styles.equipmentDetails}>{profile.equipment.details}</Text>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImageWrapper: {
    width: '100%',
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerPlaceholder: {
    width: '100%',
    height: HEADER_HEIGHT,
    backgroundColor: '#00adf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholderText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  headerNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerNavButtonLeft: {
    left: 15,
  },
  headerNavButtonRight: {
    right: 15,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  genre: {
    fontSize: 16,
    color: '#444',
  },
  location: {
    fontSize: 16,
    color: '#444',
  },
  capacity: {
    fontSize: 16,
    color: '#444',
  },
  equipmentContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  equipmentText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
  },
  equipmentDetails: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
}); 