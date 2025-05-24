import * as ImagePicker from 'expo-image-picker';
import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { Alert, Button, Image, View } from 'react-native';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

const ImageUploader = forwardRef(({ onUploaded, disabled, hideButton }, ref) => {
  const [imageUri, setImageUri] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateUniqueId = () => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  };

  const uploadWithRetry = async (reference, blob, maxRetries = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt} of ${maxRetries}`);
        
        // Set metadata for the upload
        const metadata = {
          contentType: 'image/jpeg',
          customMetadata: {
            'uploadedBy': 'user'
          }
        };
        
        const uploadTask = reference.put(blob, metadata);
        
        // Monitor upload progress
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress.toFixed(2) + '%');
          },
          (error) => {
            console.error('Upload error:', error);
            throw error;
          }
        );
        
        await uploadTask;
        console.log('Upload completed successfully');
        
        // Get the download URL with a longer timeout
        const downloadURL = await Promise.race([
          reference.getDownloadURL(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout getting download URL')), 10000)
          )
        ]);
        
        return downloadURL;
      } catch (error) {
        console.error(`Upload attempt ${attempt} failed:`, error);
        lastError = error;
        if (attempt < maxRetries) {
          console.log('Retrying upload...');
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    throw lastError;
  };

  const pickImage = async () => {
    if (disabled || isUploading) return;

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please sign in to upload images');
        return;
      }

      console.log('Current user:', currentUser.uid);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (!result.canceled) {
        setIsUploading(true);
        const image = result.assets[0];
        console.log('Selected image details:', {
          uri: image.uri,
          width: image.width,
          height: image.height,
          type: image.type
        });
        
        const uniqueId = generateUniqueId();
        const reference = storage().ref(`header_images/${currentUser.uid}/${uniqueId}`);
        
        console.log('Upload path:', reference.fullPath);
        
        // Convert URI to blob
        console.log('Converting image to blob...');
        const response = await fetch(image.uri);
        const blob = await response.blob();
        console.log('Blob created, size:', blob.size);
        
        // Upload to Firebase Storage
        console.log('Starting upload...');
        const metadata = {
          contentType: blob.type || 'image/jpeg',
          customMetadata: {
            'uploadedBy': 'user'
          }
        };
        
        const uploadTask = reference.put(blob, metadata);
        
        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress.toFixed(2) + '%');
          },
          (error) => {
            console.error('Upload error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
          }
        );
        
        await uploadTask;
        console.log('Upload completed');
        
        // Get download URL
        console.log('Getting download URL...');
        const downloadURL = await reference.getDownloadURL();
        console.log('Download URL from Firebase:', downloadURL);
        
        setImageUri(downloadURL);
        onUploaded(downloadURL);
      }
    } catch (error) {
      console.error('Error in pickImage:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      Alert.alert('Upload failed', error.message);
    } finally {
      setIsUploading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    pickImage
  }));

  return (
    <View>
      {imageUri && (
        <Image 
          source={{ uri: imageUri }} 
          style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 10 }} 
        />
      )}
      {!hideButton && (
        <Button 
          title={isUploading ? "Uploading..." : "Upload Image"} 
          onPress={pickImage}
          disabled={disabled || isUploading}
        />
      )}
    </View>
  );
});

export default ImageUploader;
