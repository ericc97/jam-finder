import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { deleteUser } from 'firebase/auth';
import {
    deleteDoc,
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    ScrollView,
    Text,
    TextInput,
    View,
    ActivityIndicator,
} from 'react-native';
import AudioUploader from '../components/AudioUploader';
import ImageUploader from '../components/ImageUploader';
import { auth, db } from '../services/firebase';

export default function ArtistProfileScreen() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [genre, setGenre] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [headerImages, setHeaderImages] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const ref = doc(db, 'users', uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setName(data.name || '');
          setBio(data.bio || '');
          setGenre(data.genre || '');
          setProfileImage(data.profileImage || '');
          setHeaderImages(data.headerImages || []);
          setAudioUrl(data.audioUrl || '');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const addHeaderImage = (url) => {
    if (headerImages.length < 5) {
      setHeaderImages([...headerImages, url]);
    } else {
      Alert.alert('Limit Reached', 'Max 5 header images allowed.');
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsSaving(true);
    try {
      const publicId = uid.slice(0, 8);
      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        bio: bio.trim(),
        genre: genre.trim(),
        profileImage,
        headerImages,
        audioUrl,
        publicId,
        role: 'artist',
        profileUpdatedAt: new Date().toISOString(),
      }, { merge: true });

      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsSaving(false);
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
              const user = auth.currentUser;

              // Delete profile
              await deleteDoc(doc(db, 'users', user.uid));

              // Optional: delete related docs
              await deleteDoc(doc(db, 'favorites', user.uid));
              await deleteDoc(doc(db, 'availability', user.uid));

              // Delete auth user
              await deleteUser(user);

              Alert.alert('Deleted', 'Your account has been removed.');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
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

      <Text>Name</Text>
      <TextInput 
        value={name} 
        onChangeText={setName} 
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 4 }} 
        placeholder="Enter your name"
      />

      <Text>Bio</Text>
      <TextInput 
        value={bio} 
        onChangeText={setBio} 
        multiline 
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 4, minHeight: 100 }} 
        placeholder="Tell us about yourself"
      />

      <Text>Genre</Text>
      <TextInput 
        value={genre} 
        onChangeText={setGenre} 
        style={{ borderWidth: 1, padding: 8, marginBottom: 8, borderRadius: 4 }} 
        placeholder="Enter your genre"
      />

      <Text>Profile Picture</Text>
      <ImageUploader onUploaded={setProfileImage} />

      <Text>Header Images (max 5)</Text>
      <ImageUploader onUploaded={addHeaderImage} />

      <Text>Upload MP3 (autoplay)</Text>
      <AudioUploader onUploaded={setAudioUrl} />

      <Button 
        title={isSaving ? "Saving..." : "Save Profile"} 
        onPress={saveProfile}
        disabled={isSaving}
      />

      <View style={{ marginVertical: 10 }}>
        <Button title="Share Public Profile" onPress={sharePublicProfile} />
      </View>

      <View style={{ marginVertical: 10 }}>
        <Button
          title="Delete My Account"
          onPress={deleteMyAccount}
          color="red"
        />
      </View>
    </ScrollView>
  );
}
