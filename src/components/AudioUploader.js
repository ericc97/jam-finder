import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { Alert, Button, Text, View } from 'react-native';
import { v4 as uuid } from 'uuid';
import { storage } from '../services/firebase';

export default function AudioUploader({ onUploaded }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [sound, setSound] = useState();

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/mpeg',
      copyToCacheDirectory: true,
    });

    if (result.type === 'success' && result.size < 4 * 1024 * 1024) {
      const blob = await (await fetch(result.uri)).blob();
      const audioRef = ref(storage, `audio/${uuid()}`);

      try {
        await uploadBytes(audioRef, blob);
        const url = await getDownloadURL(audioRef);
        setAudioUrl(url);
        onUploaded(url);

        const { sound: loadedSound } = await Audio.Sound.createAsync({ uri: url });
        setSound(loadedSound);
        await loadedSound.playAsync();
      } catch (error) {
        Alert.alert('Upload failed', error.message);
      }
    } else {
      Alert.alert('Invalid file', 'Only MP3 under 4MB is allowed.');
    }
  };

  return (
    <View>
      <Button title="Upload MP3" onPress={pickAudio} />
      {audioUrl && <Text>MP3 uploaded ✅</Text>}
    </View>
  );
}
