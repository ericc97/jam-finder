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
} from 'react-native';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import ImageUploader from '../components/ImageUploader';
import { auth, db } from '../firebase';

export default function VenueProfileScreen() {
  const [venueName, setVenueName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [hours, setHours] = useState('');
  const [equipment, setEquipment] = useState('');
  const [images, setImages] = useState([]);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    const fetchVenueData = async () => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setVenueName(data.name || '');
          setCapacity(data.capacity || '');
          setHours(data.hours || '');
          setEquipment(data.equipment || '');
          setImages(data.headerImages || []);
        }
      } catch (error) {
        console.error('Error loading venue data:', error);
      }
    };

    fetchVenueData();
  }, [uid]);

  const addImage = (url) => {
    if (images.length < 5) {
      setImages([...images, url]);
    } else {
      Alert.alert('Limit Reached', 'Max 5 header images allowed.');
    }
  };

  const saveProfile = async () => {
    try {
      const publicId = uid.slice(0, 8);
      await setDoc(doc(db, 'users', uid), {
        name: venueName,
        capacity,
        hours,
        equipment,
        headerImages: images,
        publicId,
        role: 'venue',
        profileUpdatedAt: new Date().toISOString(),
      }, { merge: true });

      Alert.alert('Success', 'Venue profile saved!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const sharePublicProfile = async () => {
    const publicId = uid.slice(0, 8);
    const url = `https://jamfinder.app/public/venue/${publicId}`;

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

              // Delete Firestore profile and extras
              await deleteDoc(doc(db, 'users', user.uid));
              await deleteDoc(doc(db, 'favorites', user.uid));
              await deleteDoc(doc(db, 'availability', user.uid));

              // Delete Firebase Auth account
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
        Edit Venue Profile
      </Text>

      <Text>Venue Name</Text>
      <TextInput value={venueName} onChangeText={setVenueName} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />

      <Text>Capacity</Text>
      <TextInput value={capacity} onChangeText={setCapacity} keyboardType="numeric" style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />

      <Text>Hours of Operation</Text>
      <TextInput value={hours} onChangeText={setHours} style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />

      <Text>Sound Equipment Info</Text>
      <TextInput value={equipment} onChangeText={setEquipment} placeholder="e.g., PA system, monitors, drum kit" style={{ borderWidth: 1, padding: 8, marginBottom: 8 }} />

      <Text>Upload Header Images (max 5)</Text>
      <ImageUploader onUploaded={addImage} />

      <View style={{ marginVertical: 20 }}>
        <AvailabilityCalendar />
      </View>

      <Button title="Save Venue Profile" onPress={saveProfile} />

      <View style={{ marginVertical: 10 }}>
        <Button title="Share Public Profile" onPress={sharePublicProfile} />
      </View>

      <View style={{ marginVertical: 10 }}>
        <Button title="Delete My Account" onPress={deleteMyAccount} color="red" />
      </View>
    </ScrollView>
  );
}
