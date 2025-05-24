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
    Platform,
    Linking,
} from 'react-native';
import AudioUploader from '../components/AudioUploader';
import ImageUploader from '../components/ImageUploader';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const PROFILE_IMAGE_SIZE = 120;

export default function ArtistProfileScreen() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [genre, setGenre] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [headerImages, setHeaderImages] = useState([]);
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [bioHeight, setBioHeight] = useState(40);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const MAX_RETRIES = 3;

  useEffect(() => {
    // Listen for auth state changes
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
          setGenre(data.genre || '');
          setProfileImage(data.profileImage || '');
          setHeaderImages(data.headerImages || []);
          setAudioUrl(data.audioUrl || '');
          setSpotifyUrl(data.spotifyUrl || '');
          setInstagramUrl(data.instagramUrl || '');
          
          console.log('Profile state updated with values:', {
            name: data.name,
            bio: data.bio,
            genre: data.genre,
            profileImage: data.profileImage,
            headerImagesCount: data.headerImages?.length,
            hasAudioUrl: !!data.audioUrl,
            spotifyUrl: data.spotifyUrl,
            instagramUrl: data.instagramUrl
          });
        } else {
          console.log('No profile found, creating new profile...');
          // Create initial profile
          const publicId = uid.slice(0, 8);
          await docRef.set({
            publicId,
            role: 'artist',
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

  const addHeaderImage = (url) => {
    if (headerImages.length < 5) {
      setHeaderImages([...headerImages, url]);
    } else {
      Alert.alert('Limit Reached', 'Max 5 header images allowed.');
    }
  };

  const saveProfile = async () => {
    // Prevent multiple saves
    if (isSaving) {
      console.log('Save already in progress, ignoring...');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!uid) {
      console.error('No user ID available for saving profile');
      Alert.alert('Error', 'Please sign in to save your profile');
      return;
    }

    setIsSaving(true);
    let docRef;

    try {
      console.log('Starting to save profile...');
      console.log('Current user:', auth().currentUser?.uid);
      console.log('Profile uid:', uid);
      console.log('Current audioUrl state:', audioUrl);
      
      const publicId = uid.slice(0, 8);
      const profileData = {
        name: name.trim(),
        bio: bio.trim(),
        genre: genre.trim(),
        profileImage,
        headerImages,
        audioUrl: audioUrl || '', // Ensure audioUrl is never undefined
        spotifyUrl: spotifyUrl.trim(),
        instagramUrl: instagramUrl.trim(),
        publicId,
        role: 'artist',
        profileUpdatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      console.log('Saving profile data:', JSON.stringify(profileData, null, 2));
      docRef = firestore().collection('users').doc(uid);
      console.log('Document reference created for path:', docRef.path);
      
      // Use a promise with timeout
      const savePromise = docRef.set(profileData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      console.log('Profile saved successfully with audioUrl:', profileData.audioUrl);

      // Reset saving state before showing alert
      setIsSaving(false);
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Reset saving state before showing error
      setIsSaving(false);
      
      // Handle specific Firestore errors
      let errorMessage = 'Failed to save profile';
      if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to save this profile. Please make sure you are signed in.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection and try again';
      } else if (error.message === 'Save operation timed out') {
        errorMessage = 'Save operation took too long. Please try again';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const sharePublicProfile = async () => {
    const publicId = uid.slice(0, 8);
    const url = `https://jamfinder.app/public/artist/${publicId}`;

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

  const handleSignOut = async () => {
    try {
      await auth().signOut();
      // Navigation will be handled by the auth state listener in App.js
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleNextImage = () => {
    if (headerImages.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === headerImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (headerImages.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === 0 ? headerImages.length - 1 : prevIndex - 1
      );
    }
  };

  const playDemoSong = async () => {
    if (!audioUrl) {
      Alert.alert('No Demo', 'Please upload a demo song first.');
      return;
    }

    try {
      console.log('Attempting to play audio from URL:', audioUrl);
      
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        console.log('Creating new sound object...');
        // Configure audio mode for better compatibility
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Check if we're running in simulator
        const isSimulator = Platform.OS === 'ios' && !Platform.isPad && !Platform.isTV;
        
        if (isSimulator) {
          Alert.alert(
            'Simulator Detected',
            'Audio playback in the iOS simulator may not work properly. Would you like to:',
            [
              {
                text: 'Try Anyway',
                onPress: async () => {
                  try {
                    const { sound: newSound } = await Audio.Sound.createAsync(
                      { uri: audioUrl },
                      { 
                        shouldPlay: true,
                        progressUpdateIntervalMillis: 1000,
                        positionMillis: 0,
                        volume: 1.0,
                        rate: 1.0,
                        shouldCorrectPitch: true,
                      }
                    );
                    setSound(newSound);
                    setIsPlaying(true);
                  } catch (error) {
                    console.error('Simulator playback failed:', error);
                    Alert.alert(
                      'Playback Failed',
                      'This is a known issue with the iOS simulator. The audio works on real devices and in browsers.',
                      [
                        {
                          text: 'Open in Browser',
                          onPress: () => Linking.openURL(audioUrl)
                        },
                        {
                          text: 'Copy URL',
                          onPress: () => {
                            Clipboard.setString(audioUrl);
                            Alert.alert('Copied', 'Audio URL copied to clipboard');
                          }
                        },
                        {
                          text: 'OK',
                          style: 'cancel'
                        }
                      ]
                    );
                  }
                }
              },
              {
                text: 'Open in Browser',
                onPress: () => Linking.openURL(audioUrl)
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
          return;
        }

        // For real devices, proceed normally
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { 
            shouldPlay: true,
            progressUpdateIntervalMillis: 1000,
            positionMillis: 0,
            volume: 1.0,
            rate: 1.0,
            shouldCorrectPitch: true,
          }
        );
        console.log('Sound object created successfully');
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          console.log('Playback status:', status);
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (error) {
      console.error('Error playing demo song:', error);
      console.error('Audio URL:', audioUrl);
      Alert.alert(
        'Playback Error',
        `Failed to play demo song.\n\nURL: ${audioUrl}\n\nError: ${error.message}`,
        [
          {
            text: 'Open in Browser',
            onPress: () => {
              Linking.openURL(audioUrl);
            }
          },
          {
            text: 'Copy URL',
            onPress: () => {
              Clipboard.setString(audioUrl);
              Alert.alert('Copied', 'Audio URL copied to clipboard');
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
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
        {headerImages.length > 0 ? (
          <View style={styles.headerImageWrapper}>
            <FastImage 
              source={{ uri: headerImages[currentHeaderIndex] }}
              style={styles.headerImage}
              resizeMode={FastImage.resizeMode.cover}
            />
            {headerImages.length > 1 && (
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
          <Text style={styles.label}>Name</Text>
          <TextInput 
            value={name} 
            onChangeText={setName} 
            style={styles.input}
            placeholder="Enter your name"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Genre</Text>
          <TextInput 
            value={genre} 
            onChangeText={setGenre} 
            style={styles.input}
            placeholder="Enter your genre"
            editable={!isSaving}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput 
            value={bio} 
            onChangeText={setBio} 
            multiline 
            style={[styles.input, { height: Math.max(40, bioHeight) }]}
            placeholder="Tell us about yourself"
            editable={!isSaving}
            onContentSizeChange={(event) => {
              setBioHeight(event.nativeEvent.contentSize.height);
            }}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Spotify URL</Text>
          <TextInput 
            value={spotifyUrl} 
            onChangeText={setSpotifyUrl} 
            style={styles.input}
            placeholder="https://open.spotify.com/artist/..."
            editable={!isSaving}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instagram URL</Text>
          <TextInput 
            value={instagramUrl} 
            onChangeText={setInstagramUrl} 
            style={styles.input}
            placeholder="https://instagram.com/..."
            editable={!isSaving}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Demo Track</Text>
          <AudioUploader 
            onUploaded={setAudioUrl} 
            disabled={isSaving} 
            existingAudioUrl={audioUrl}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving..." : "Save Profile"}
          </Text>
        </TouchableOpacity>

        <View style={{ marginVertical: 10 }}>
          <Button 
            title="Share Public Profile" 
            onPress={sharePublicProfile}
            disabled={isSaving}
          />
        </View>

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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerNavButtonLeft: {
    left: 15,
  },
  headerNavButtonRight: {
    right: 15,
  },
  contentContainer: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerImageContainer: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  playButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
});
