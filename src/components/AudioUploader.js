import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, Button, Text, View, ActivityIndicator } from 'react-native';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function AudioUploader({ onUploaded, disabled }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [sound, setSound] = useState();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickAudio = async () => {
    if (disabled || isUploading) return;

    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please sign in to upload audio');
        return;
      }

      console.log('Starting audio file selection...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/mpeg',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        console.log('File selected:', result.name, 'Size:', result.size);
        
        if (result.size > 10 * 1024 * 1024) { // 10MB limit
          Alert.alert('File too large', 'Please select an MP3 file under 10MB');
          return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
          // Create a reference to the file location in Firebase Storage
          const timestamp = Date.now();
          const safeFileName = result.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const audioRef = storage().ref(`audio/${currentUser.uid}/${timestamp}_${safeFileName}`);
          console.log('Storage reference created:', audioRef.fullPath);

          // Convert URI to blob with retry
          console.log('Converting file to blob...');
          let blob;
          let retryCount = 0;
          const maxRetries = 3;

          while (retryCount < maxRetries) {
            try {
              const response = await fetch(result.uri);
              if (!response.ok) throw new Error('Failed to fetch file');
              blob = await response.blob();
              console.log('Blob created, size:', blob.size);
              break;
            } catch (error) {
              retryCount++;
              if (retryCount === maxRetries) throw error;
              console.log(`Retry ${retryCount} of ${maxRetries} for blob creation`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }

          // Set metadata for the upload
          const metadata = {
            contentType: 'audio/mpeg',
            customMetadata: {
              'uploadedBy': currentUser.uid,
              'originalName': result.name
            }
          };

          // Upload the file with progress monitoring
          console.log('Starting file upload...');
          const uploadTask = audioRef.put(blob, metadata);

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
              console.log('Upload progress:', progress.toFixed(2) + '%');
            },
            (error) => {
              console.error('Upload error:', error);
              throw error;
            }
          );

          // Wait for upload to complete
          await uploadTask;
          console.log('Upload completed successfully');

          // Get download URL with retry
          console.log('Getting download URL...');
          let url;
          retryCount = 0;

          while (retryCount < maxRetries) {
            try {
              url = await audioRef.getDownloadURL();
              console.log('Audio URL obtained:', url);
              break;
            } catch (error) {
              retryCount++;
              if (retryCount === maxRetries) throw error;
              console.log(`Retry ${retryCount} of ${maxRetries} for getting download URL`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }

          if (!url) throw new Error('Failed to get download URL after retries');

          // Store the URL in state and call the callback
          console.log('Setting audio URL in state:', url);
          setAudioUrl(url);
          
          // Ensure the URL is passed to the parent component
          console.log('About to call onUploaded with URL:', url);
          if (typeof onUploaded === 'function') {
            try {
              onUploaded(url);
              console.log('onUploaded callback executed successfully');
            } catch (error) {
              console.error('Error in onUploaded callback:', error);
              // Try to save the URL directly to Firestore as a fallback
              try {
                const userRef = firestore().collection('users').doc(currentUser.uid);
                await userRef.update({
                  audioUrl: url,
                  profileUpdatedAt: firestore.FieldValue.serverTimestamp()
                });
                console.log('URL saved directly to Firestore as fallback');
              } catch (firestoreError) {
                console.error('Failed to save URL directly to Firestore:', firestoreError);
              }
            }
          } else {
            console.error('onUploaded is not a function:', onUploaded);
          }

          // Load and play the audio using the simpler approach
          console.log('Loading audio for playback...');
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: true },
            (error) => {
              if (!error) {
                console.log('Audio playback started');
              } else {
                console.error('Error playing audio:', error);
              }
            }
          );
          setSound(newSound);

        } catch (error) {
          console.error('Error during upload process:', error);
          Alert.alert(
            'Upload Failed',
            'There was an error uploading your audio. Please check your internet connection and try again.'
          );
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    } catch (error) {
      console.error('Error in pickAudio:', error);
      Alert.alert('Upload failed', error.message);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Cleanup sound when component unmounts
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View>
      <Button 
        title={isUploading ? "Uploading..." : "Upload MP3"} 
        onPress={pickAudio}
        disabled={disabled || isUploading}
      />
      {isUploading && (
        <View style={{ marginTop: 10 }}>
          <Text>Uploading: {uploadProgress.toFixed(1)}%</Text>
          <ActivityIndicator size="small" color="#00adf5" />
        </View>
      )}
      {audioUrl && !isUploading && <Text>MP3 uploaded ✅</Text>}
    </View>
  );
}
