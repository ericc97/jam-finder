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
    Image,
} from 'react-native';
import AudioUploader from '../components/AudioUploader';
import ImageUploader from '../components/ImageUploader';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';

export default function ArtistProfileScreen() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [genre, setGenre] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [headerImages, setHeaderImages] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
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
          
          console.log('Profile state updated with values:', {
            name: data.name,
            bio: data.bio,
            genre: data.genre,
            profileImage: data.profileImage,
            headerImagesCount: data.headerImages?.length,
            hasAudioUrl: !!data.audioUrl
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
      
      const publicId = uid.slice(0, 8);
      const profileData = {
        name: name.trim(),
        bio: bio.trim(),
        genre: genre.trim(),
        profileImage,
        headerImages,
        audioUrl,
        publicId,
        role: 'artist',
        profileUpdatedAt: firestore.FieldValue.serverTimestamp(),
      };
      
      console.log('Saving profile data:', profileData);
      docRef = firestore().collection('users').doc(uid);
      console.log('Document reference created for path:', docRef.path);
      
      // Use a promise with timeout
      const savePromise = docRef.set(profileData, { merge: true });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timed out')), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      console.log('Profile saved successfully');

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

    await Clipboard.setStringAsync(url);
    Alert.alert('Copied!', 'Public profile link copied to clipboard.');

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(url);
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Edit Artist Profile
      </Text>

      <Text>Profile Picture</Text>
      {profileImage ? (
        <View style={{ alignItems: 'center' }}>
          <Image 
            source={{ uri: profileImage }} 
            style={{ 
              width: 100, 
              height: 100, 
              borderRadius: 50,
              marginBottom: 10,
            }}
            onError={(error) => {
              console.error('Error loading profile image:', error.nativeEvent);
              console.log('Failed URL:', profileImage);
            }}
            onLoad={() => {
              console.log('Profile image loaded successfully');
            }}
          />
        </View>
      ) : (
        <View style={{ 
          width: 100, 
          height: 100, 
          borderRadius: 50,
          backgroundColor: '#e0e0e0',
          marginBottom: 10,
          alignSelf: 'center',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: '#666' }}>No Photo</Text>
        </View>
      )}
      <ImageUploader onUploaded={setProfileImage} disabled={isSaving} />

      <Text>Name</Text>
      <TextInput 
        value={name} 
        onChangeText={setName} 
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 4 }} 
        placeholder="Enter your name"
        editable={!isSaving}
      />

      <Text>Bio</Text>
      <TextInput 
        value={bio} 
        onChangeText={setBio} 
        multiline 
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 4, minHeight: 100 }} 
        placeholder="Tell us about yourself"
        editable={!isSaving}
      />

      <Text>Genre</Text>
      <TextInput 
        value={genre} 
        onChangeText={setGenre} 
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 4 }} 
        placeholder="Enter your genre"
        editable={!isSaving}
      />

      <Text>Header Images (max 5)</Text>
      {headerImages.length > 0 && (
        <ScrollView horizontal style={{ marginBottom: 10 }}>
          {headerImages.map((url, index) => (
            <Image 
              key={index}
              source={{ uri: url }} 
              style={{ 
                width: 100, 
                height: 100, 
                marginRight: 10,
                borderRadius: 10
              }} 
            />
          ))}
        </ScrollView>
      )}
      <ImageUploader onUploaded={addHeaderImage} disabled={isSaving} />

      <Text>Upload MP3 (autoplay)</Text>
      <AudioUploader onUploaded={setAudioUrl} disabled={isSaving} />

      <Button 
        title={isSaving ? "Saving..." : "Save Profile"} 
        onPress={saveProfile}
        disabled={isSaving}
        style={{ opacity: isSaving ? 0.5 : 1 }}
      />

      <View style={{ marginVertical: 10 }}>
        <Button 
          title="Share Public Profile" 
          onPress={sharePublicProfile}
          disabled={isSaving}
        />
      </View>

      <View style={{ marginVertical: 10 }}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          color="#666"
          disabled={isSaving}
        />
      </View>

      <View style={{ marginVertical: 10 }}>
        <Button
          title="Delete My Account"
          onPress={deleteMyAccount}
          color="red"
          disabled={isSaving}
        />
      </View>
    </ScrollView>
  );
}
