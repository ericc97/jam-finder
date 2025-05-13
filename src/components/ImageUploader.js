import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import { Alert, Button, Image, View } from 'react-native';
import { v4 as uuid } from 'uuid';
import { storage } from '../services/firebase';

export default function ImageUploader({ onUploaded }) {
  const [imageUri, setImageUri] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const image = result.assets[0];
      const blob = await (await fetch(image.uri)).blob();
      const storageRef = ref(storage, `images/${uuid()}`);

      try {
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        setImageUri(downloadURL);
        onUploaded(downloadURL);
      } catch (error) {
        Alert.alert('Upload failed', error.message);
      }
    }
  };

  return (
    <View>
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 100, height: 100 }} />}
      <Button title="Upload Image" onPress={pickImage} />
    </View>
  );
}
