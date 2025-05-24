import { useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function PublicProfileScreen() {
  const route = useRoute();
  const { publicId } = route.params;

  const [profile, setProfile] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Fetching profile for publicId:', publicId);
        const q = query(collection(firestore(), 'users'), where('publicId', '==', publicId));
        const snapshot = await getDocs(q);
  
        if (snapshot.empty) {
          console.warn('No profile found for publicId:', publicId);
          Alert.alert('Not Found', 'No public profile found.');
          setProfile(null); // ensures UI doesn't hang
          return;
        }
  
        const data = snapshot.docs[0].data();
        console.log('Fetched profile:', data);
        setProfile(data);
  
        if (data.audioUrl) {
          const { sound } = await Audio.Sound.createAsync({ uri: data.audioUrl });
          setSound(sound);
          await sound.playAsync();
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        Alert.alert('Error', err.message);
      }
    };
  
    fetchProfile();
  
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [publicId]);
  

  if (!profile) return <Text>Loading profile...</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Image
        source={{ uri: profile.headerImages?.[0] }}
        style={{ height: 200, borderRadius: 10, marginBottom: 16 }}
      />
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{profile.name}</Text>
      <Text style={{ fontStyle: 'italic', color: '#555' }}>{profile.genre}</Text>
      <Text style={{ marginVertical: 12 }}>{profile.bio}</Text>

      {/* Social Links */}
      <Text>🎵 Spotify: {profile.spotify}</Text>
      <Text>📸 Instagram: {profile.instagram}</Text>
      <Text>📺 YouTube: {profile.youtube}</Text>

      {/* Reviews could be listed here later */}
    </ScrollView>
  );
}
