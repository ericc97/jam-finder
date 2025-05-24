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
const HEADER_HEIGHT = 300;

export default function VenueProfileScreen() {
  const [profileData, setProfileData] = useState({
    name: '',
    address: '',
    capacity: '',
    bio: '',
    headerImages: [],
    equipment: {
      availableToUse: false,
      availableToRent: false,
      notIncluded: false,
      details: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState(null);
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
    capacity: false
  });

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUid(user?.uid);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!uid) return;

      setIsLoading(true);
      try {
        const docRef = firestore().collection('users').doc(uid);
        const snap = await docRef.get();
        
        if (snap.exists) {
          const data = snap.data();
          setProfileData({
            name: data.name || '',
            address: data.address || '',
            capacity: data.capacity || '',
            bio: data.bio || '',
            headerImages: data.headerImages || [],
            equipment: {
              availableToUse: data.equipment?.availableToUse || false,
              availableToRent: data.equipment?.availableToRent || false,
              notIncluded: data.equipment?.notIncluded || false,
              details: data.equipment?.details || ''
            }
          });
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
    const newValidationErrors = {
      name: !profileData.name?.trim(),
      address: !profileData.address?.trim(),
      capacity: !profileData.capacity?.trim()
    };
    
    setValidationErrors(newValidationErrors);

    if (Object.values(newValidationErrors).some(error => error)) {
      return;
    }

    setIsSaving(true);
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteMyAccount = async () => {
    Alert.alert(
      'Confirm Delete',
      'This will permanently delete your account and data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = auth().currentUser;

              // Delete profile
              await firestore().collection('users').doc(user.uid).delete();

              // Optional: delete related docs
              await firestore().collection('favorites').doc(user.uid).delete();
              await firestore().collection('availability').doc(user.uid).delete();

              // Delete auth user
              await user.delete();

              Alert.alert('Deleted', 'Your account has been removed.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleNextImage = () => {
    if (profileData.headerImages.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === profileData.headerImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (profileData.headerImages.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === 0 ? profileData.headerImages.length - 1 : prevIndex - 1
      );
    }
  };

  const sharePublicProfile = async () => {
    const publicId = uid.slice(0, 8);
    const url = `https://jamfinder.app/public/venue/${publicId}`;

    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', 'Public profile link copied to clipboard.');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url);
      }
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Failed to share profile');
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
        {profileData.headerImages?.[0] ? (
          <View style={styles.headerImageWrapper}>
            <FastImage 
              source={{ uri: profileData.headerImages[currentHeaderIndex] }}
              style={styles.headerImage}
              resizeMode={FastImage.resizeMode.cover}
            />
            {profileData.headerImages.length > 1 && (
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
            <Text style={styles.headerPlaceholderText}>Add Header Image</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, validationErrors.name && styles.errorLabel]}>
            Venue Name {validationErrors.name && '*'}
          </Text>
          <TextInput 
            value={profileData.name} 
            onChangeText={(text) => {
              setProfileData(prev => ({ ...prev, name: text }));
              if (validationErrors.name) {
                setValidationErrors(prev => ({ ...prev, name: false }));
              }
            }} 
            style={[styles.input, validationErrors.name && styles.errorInput]}
            placeholder="Enter venue name"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, validationErrors.address && styles.errorLabel]}>
            Address {validationErrors.address && '*'}
          </Text>
          <TextInput 
            value={profileData.address} 
            onChangeText={(text) => {
              setProfileData(prev => ({ ...prev, address: text }));
              if (validationErrors.address) {
                setValidationErrors(prev => ({ ...prev, address: false }));
              }
            }} 
            style={[styles.input, validationErrors.address && styles.errorInput]}
            placeholder="Enter venue address"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, validationErrors.capacity && styles.errorLabel]}>
            Capacity {validationErrors.capacity && '*'}
          </Text>
          <TextInput 
            value={profileData.capacity} 
            onChangeText={(text) => {
              setProfileData(prev => ({ ...prev, capacity: text }));
              if (validationErrors.capacity) {
                setValidationErrors(prev => ({ ...prev, capacity: false }));
              }
            }} 
            style={[styles.input, validationErrors.capacity && styles.errorInput]}
            placeholder="Enter venue capacity"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>About</Text>
          <TextInput 
            value={profileData.bio} 
            onChangeText={(text) => setProfileData(prev => ({ ...prev, bio: text }))} 
            multiline 
            style={[styles.input, styles.bioInput]}
            placeholder="Tell us about your venue"
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

        <View style={{ marginVertical: 10 }}>
          <Button
            title="Delete My Account"
            onPress={deleteMyAccount}
            color="red"
            disabled={isSaving}
          />
        </View>

        <View style={{ marginVertical: 10 }}>
          <Button
            title="Share Public Profile"
            onPress={sharePublicProfile}
            color="blue"
            disabled={isSaving}
          />
        </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  equipmentContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
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
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 12,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorLabel: {
    color: '#ff3b30',
  },
  errorInput: {
    borderColor: '#ff3b30',
    borderWidth: 2,
  },
});
