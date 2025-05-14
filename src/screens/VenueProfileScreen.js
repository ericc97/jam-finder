import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    ScrollView,
    Text,
    TextInput,
    View,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import ImageUploader from '../components/ImageUploader';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const PROFILE_IMAGE_SIZE = 120;

export default function VenueProfileScreen() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [venueType, setVenueType] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [headerImages, setHeaderImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState(null);
  const [profileData, setProfileData] = useState({
    name: '',
    address: '',
    capacity: '',
    description: '',
    profileImage: null,
    headerImage: null,
    equipment: {
      availableToUse: false,
      availableToRent: false,
      notIncluded: false,
      details: ''
    }
  });

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      console.log('Auth state changed, user:', user?.uid);
      setUid(user?.uid);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      console.log('Starting to load profile...');
      if (!uid) {
        console.log('Waiting for user ID...');
        return;
      }

      setIsLoading(true);
      try {
        console.log('Fetching profile from Firestore...');
        const docRef = firestore().collection('users').doc(uid);
        console.log('Document reference created for path:', docRef.path);
        
        const snap = await docRef.get();
        console.log('Document snapshot received, exists:', snap.exists);
        
        if (snap.exists) {
          const data = snap.data();
          console.log('Profile data loaded:', data);
          console.log('Profile image URL from Firestore:', data.profileImage);
          
          setName(data.name || '');
          setBio(data.bio || '');
          setVenueType(data.venueType || '');
          setProfileImage(data.profileImage || '');
          setHeaderImages(data.headerImages || []);
          setProfileData(data);
        } else {
          console.log('No profile found, creating new profile...');
          const publicId = uid.slice(0, 8);
          await docRef.set({
            publicId,
            role: 'venue',
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
          console.log('Initial profile created');
        }
      } catch (error) {
        console.error('Error in loadProfile:', error);
        Alert.alert('Error', 'Failed to load profile: ' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [uid]);

  const handleSaveProfile = async () => {
    if (!profileData.name || !profileData.address || !profileData.capacity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const user = auth().currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save your profile');
        return;
      }

      const profileRef = firestore().collection('users').doc(user.uid);
      await profileRef.update({
        ...profileData,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleSignOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00adf5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.headerContainer}>
        {headerImages[0] ? (
          <FastImage 
            source={{ uri: headerImages[0] }}
            style={styles.headerImage}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={styles.headerPlaceholder}>
            <Ionicons name="image" size={40} color="#fff" />
            <Text style={styles.headerPlaceholderText}>Add Header Image</Text>
          </View>
        )}
        <View style={styles.profileImageContainer}>
          {profileImage ? (
            <FastImage 
              source={{ uri: profileImage }}
              style={styles.profileImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Ionicons name="business" size={40} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.imageUploadButtons}>
          <TouchableOpacity 
            style={styles.imageUploadButton}
            onPress={() => {
              // Trigger header image upload
              const uploader = document.createElement('input');
              uploader.type = 'file';
              uploader.accept = 'image/*';
              uploader.click();
            }}
          >
            <Ionicons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.imageUploadButton, { marginLeft: 10 }]}
            onPress={() => {
              // Trigger profile image upload
              const uploader = document.createElement('input');
              uploader.type = 'file';
              uploader.accept = 'image/*';
              uploader.click();
            }}
          >
            <Ionicons name="camera" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Venue Name</Text>
          <TextInput 
            value={profileData.name} 
            onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))} 
            style={styles.input}
            placeholder="Enter venue name"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Venue Type</Text>
          <TextInput 
            value={venueType} 
            onChangeText={setVenueType} 
            style={styles.input}
            placeholder="Enter venue type (e.g., Bar, Club, Concert Hall)"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput 
            value={profileData.address} 
            onChangeText={(text) => setProfileData(prev => ({ ...prev, address: text }))} 
            style={styles.input}
            placeholder="Enter venue address"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Capacity</Text>
          <TextInput 
            value={profileData.capacity} 
            onChangeText={(text) => setProfileData(prev => ({ ...prev, capacity: text }))} 
            style={styles.input}
            placeholder="Enter venue capacity"
            editable={!isSaving}
          />
        </View>

        <Text style={styles.sectionTitle}>Equipment</Text>
        <View style={styles.equipmentContainer}>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfileData(prev => ({
                ...prev,
                equipment: {
                  ...prev.equipment,
                  availableToUse: !prev.equipment.availableToUse
                }
              }))}
            >
              <View style={[
                styles.checkboxBox,
                profileData.equipment.availableToUse && styles.checkboxChecked
              ]}>
                {profileData.equipment.availableToUse && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Equipment Available to Use</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfileData(prev => ({
                ...prev,
                equipment: {
                  ...prev.equipment,
                  availableToRent: !prev.equipment.availableToRent
                }
              }))}
            >
              <View style={[
                styles.checkboxBox,
                profileData.equipment.availableToRent && styles.checkboxChecked
              ]}>
                {profileData.equipment.availableToRent && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Equipment Available to Rent</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfileData(prev => ({
                ...prev,
                equipment: {
                  ...prev.equipment,
                  notIncluded: !prev.equipment.notIncluded
                }
              }))}
            >
              <View style={[
                styles.checkboxBox,
                profileData.equipment.notIncluded && styles.checkboxChecked
              ]}>
                {profileData.equipment.notIncluded && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Equipment Not Included</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.equipmentDetails}
            placeholder="Provide details about available equipment..."
            value={profileData.equipment.details}
            onChangeText={(text) => setProfileData(prev => ({
              ...prev,
              equipment: {
                ...prev.equipment,
                details: text
              }
            }))}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>About</Text>
          <TextInput 
            value={bio} 
            onChangeText={setBio} 
            multiline 
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about your venue"
            editable={!isSaving}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  headerContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: HEADER_HEIGHT,
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
  profileImageContainer: {
    position: 'absolute',
    bottom: -PROFILE_IMAGE_SIZE / 2,
    left: (width - PROFILE_IMAGE_SIZE) / 2,
    width: PROFILE_IMAGE_SIZE,
    height: PROFILE_IMAGE_SIZE,
    borderRadius: PROFILE_IMAGE_SIZE / 2,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadButtons: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
  },
  imageUploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    marginTop: PROFILE_IMAGE_SIZE / 2,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#00adf5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  signOutButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  equipmentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkboxRow: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#00adf5',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00adf5',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  equipmentDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginTop: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
