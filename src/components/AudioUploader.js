import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useEffect } from 'react';
import { Alert, Button, Text, View, ActivityIndicator, TouchableOpacity, StyleSheet, TextInput, Linking } from 'react-native';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function AudioUploader({ onUploaded, disabled, existingAudioUrl }) {
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || null);
  const [sound, setSound] = useState();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedFileName, setEditedFileName] = useState('');

  // Update audioUrl when existingAudioUrl changes
  useEffect(() => {
    setAudioUrl(existingAudioUrl || null);
    if (existingAudioUrl) {
      // Extract filename from URL
      const urlParts = existingAudioUrl.split('/');
      const fullFileName = urlParts[urlParts.length - 1];
      // Remove timestamp prefix if it exists
      const cleanFileName = fullFileName.replace(/^\d+_/, '');
      setFileName(decodeURIComponent(cleanFileName));
      setEditedFileName(decodeURIComponent(cleanFileName));
    }
  }, [existingAudioUrl]);

  const handleSaveFileName = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'Please sign in to update the filename');
        return;
      }

      // Update the filename in Firestore
      const userRef = firestore().collection('users').doc(currentUser.uid);
      await userRef.update({
        audioFileName: editedFileName,
        profileUpdatedAt: firestore.FieldValue.serverTimestamp()
      });

      setFileName(editedFileName);
      setIsEditingName(false);
      Alert.alert('Success', 'Filename updated successfully');
    } catch (error) {
      console.error('Error updating filename:', error);
      Alert.alert('Error', 'Failed to update filename. Please try again.');
    }
  };

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
        type: ['audio/mpeg', 'audio/mp3', 'audio/*'],
        copyToCacheDirectory: true,
        multiple: false,
        presentationStyle: 'fullScreen'
      });

      if (result.type === 'success') {
        console.log('File selected:', result.name, 'Size:', result.size, 'URI:', result.uri);
        
        // Validate file type
        const validExtensions = ['.mp3', '.mpeg', '.mpga'];
        const fileExtension = result.name.toLowerCase().slice(result.name.lastIndexOf('.'));
        if (!validExtensions.includes(fileExtension)) {
          Alert.alert('Invalid File Type', 'Please select an MP3 file');
          return;
        }
        
        // Validate file size (10MB limit)
        if (result.size > 10 * 1024 * 1024) {
          Alert.alert('File too large', 'Please select an MP3 file under 10MB');
          return;
        }

        // Validate minimum file size (1KB)
        if (result.size < 1024) {
          Alert.alert('File too small', 'The selected file appears to be empty or corrupted');
          return;
        }

        // Validate file URI
        if (!result.uri) {
          Alert.alert('Error', 'Could not access the selected file. Please try again.');
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

          // Convert URI to blob with retry and timeout
          console.log('Converting file to blob...');
          let blob;
          let retryCount = 0;
          const maxRetries = 3;
          const timeout = 30000; // 30 second timeout

          while (retryCount < maxRetries) {
            try {
              // For iOS, we need to handle the file differently
              const response = await fetch(result.uri);
              if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
              }

              // Get the file as an ArrayBuffer first
              const arrayBuffer = await response.arrayBuffer();
              if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error('Received empty file data');
              }

              // Convert ArrayBuffer to Blob
              blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
              if (!blob || blob.size === 0) {
                throw new Error('Failed to create valid blob from file');
              }

              console.log('Blob created, size:', blob.size);
              break;
            } catch (error) {
              retryCount++;
              console.error(`Attempt ${retryCount} failed:`, error);
              
              if (retryCount === maxRetries) {
                throw new Error(`Failed to process file after ${maxRetries} attempts: ${error.message}`);
              }
              
              console.log(`Retry ${retryCount} of ${maxRetries} for blob creation`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }

          // Set metadata for the upload
          const metadata = {
            contentType: 'audio/mpeg',
            customMetadata: {
              'uploadedBy': currentUser.uid,
              'originalName': result.name,
              'uploadTimestamp': timestamp.toString(),
              'fileExtension': fileExtension
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
              if (!url) throw new Error('Received empty URL');
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
                throw new Error('Failed to save audio URL to profile');
              }
            }
          } else {
            console.error('onUploaded is not a function:', onUploaded);
            throw new Error('Invalid callback function');
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
                throw new Error('Failed to play uploaded audio');
              }
            }
          );
          setSound(newSound);

        } catch (error) {
          console.error('Error during upload process:', error);
          let errorMessage = 'There was an error uploading your audio.';
          
          if (error.code === 'storage/unauthorized') {
            errorMessage = 'You do not have permission to upload audio. Please sign in again.';
          } else if (error.code === 'storage/canceled') {
            errorMessage = 'Upload was canceled. Please try again.';
          } else if (error.code === 'storage/retry-limit-exceeded') {
            errorMessage = 'Upload failed after multiple attempts. Please check your internet connection and try again.';
          } else if (error.message.includes('Failed to play uploaded audio')) {
            errorMessage = 'The audio file appears to be corrupted or in an unsupported format.';
          } else if (error.message.includes('Failed to process file')) {
            errorMessage = 'Could not process the selected file. Please try a different file.';
          }
          
          Alert.alert('Upload Failed', errorMessage);
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    } catch (error) {
      console.error('Error in pickAudio:', error);
      let errorMessage = error.message;
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'You do not have permission to upload audio. Please sign in again.';
      } else if (error.code === 'storage/canceled') {
        errorMessage = 'Upload was canceled. Please try again.';
      } else if (error.message.includes('Could not access the selected file')) {
        errorMessage = 'Could not access the selected file. Please try again.';
      }
      
      Alert.alert('Upload failed', errorMessage);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Cleanup sound when component unmounts
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playAudio = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        console.log('Loading audio from URL:', audioUrl);
        
        // Verify the URL is accessible
        try {
          const response = await fetch(audioUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('audio/')) {
            throw new Error('Invalid content type: ' + contentType);
          }
        } catch (error) {
          console.error('URL validation failed:', error);
          Alert.alert(
            'Network Error',
            'Unable to connect to the audio file. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Play in Browser', 
                onPress: () => {
                  Linking.openURL(audioUrl);
                }
              },
              { 
                text: 'Retry', 
                onPress: () => {
                  setSound(null);
                  setIsPlaying(false);
                  playAudio();
                }
              }
            ]
          );
          return;
        }

        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Create and load the sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { 
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            positionMillis: 0,
            volume: 1.0,
            rate: 1.0,
            shouldCorrectPitch: true,
          },
          (status) => {
            console.log('Playback status:', status);
            if (status.isLoaded) {
              if (status.didJustFinish) {
                setIsPlaying(false);
              }
            } else {
              const errorMessage = status.error || 'Unknown error loading audio';
              console.error('Audio failed to load:', errorMessage);
              Alert.alert(
                'Error',
                'Failed to load audio. Would you like to try again?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Play in Browser', 
                    onPress: () => {
                      Linking.openURL(audioUrl);
                    }
                  },
                  { 
                    text: 'Retry', 
                    onPress: () => {
                      setSound(null);
                      setIsPlaying(false);
                      playAudio();
                    }
                  }
                ]
              );
              setIsPlaying(false);
            }
          }
        );

        // Verify the sound was created successfully
        if (!newSound) {
          throw new Error('Failed to create sound object');
        }

        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert(
        'Error',
        'Failed to play audio. Would you like to try again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Retry', 
            onPress: () => {
              if (sound) {
                sound.unloadAsync();
              }
              setSound(null);
              setIsPlaying(false);
              playAudio();
            }
          }
        ]
      );
      setIsPlaying(false);
      // Cleanup sound object if it exists
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
    }
  };

  return (
    <View>
      {audioUrl && !isUploading && (
        <View style={styles.uploadedContainer}>
          <View style={styles.uploadedHeader}>
            <Ionicons name="musical-notes" size={20} color="#00adf5" />
            <Text style={styles.uploadedTitle}>Demo Track</Text>
          </View>
          
          <View style={styles.fileInfo}>
            {isEditingName ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.fileNameInput}
                  value={editedFileName}
                  onChangeText={setEditedFileName}
                  placeholder="Enter track name"
                  autoFocus
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity 
                    onPress={() => {
                      setEditedFileName(fileName);
                      setIsEditingName(false);
                    }}
                    style={styles.editButton}
                  >
                    <Text style={styles.editButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSaveFileName}
                    style={[styles.editButton, styles.saveButton]}
                  >
                    <Text style={[styles.editButtonText, styles.saveButtonText]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.fileNameContainer}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {fileName}
                </Text>
                <TouchableOpacity 
                  onPress={() => setIsEditingName(true)}
                  style={styles.editIconButton}
                >
                  <Ionicons name="pencil" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.controls}>
              <TouchableOpacity 
                onPress={playAudio}
                style={styles.playButton}
              >
                <Ionicons 
                  name={isPlaying ? "pause-circle" : "play-circle"} 
                  size={24} 
                  color="#00adf5" 
                />
                <Text style={styles.playButtonText}>
                  {isPlaying ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.uploadContainer}>
        <Button 
          title={isUploading ? "Uploading..." : "Upload MP3"} 
          onPress={pickAudio}
          disabled={disabled || isUploading}
          style={audioUrl ? styles.smallButton : undefined}
        />
        {audioUrl && (
          <TouchableOpacity 
            onPress={() => {
              if (sound) {
                sound.unloadAsync();
                setSound(null);
              }
              setAudioUrl(null);
              setFileName('');
              setIsPlaying(false);
              if (typeof onUploaded === 'function') {
                onUploaded(null);
              }
            }}
            style={styles.removeButton}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {isUploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Uploading: {uploadProgress.toFixed(1)}%
          </Text>
          <ActivityIndicator size="small" color="#00adf5" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  uploadedContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0f2ff',
  },
  uploadedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00adf5',
    marginLeft: 8,
  },
  fileInfo: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  editIconButton: {
    padding: 4,
    marginLeft: 8,
  },
  editNameContainer: {
    marginBottom: 8,
  },
  fileNameInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#00adf5',
  },
  editButtonText: {
    color: '#666',
    fontSize: 14,
  },
  saveButtonText: {
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButtonText: {
    color: '#00adf5',
    marginLeft: 4,
    fontSize: 14,
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallButton: {
    width: 120,
  },
  removeButton: {
    marginLeft: 10,
    padding: 8,
  },
  removeButtonText: {
    color: '#ff3b30',
    fontSize: 14,
  },
  progressContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  progressText: {
    color: '#666',
    marginBottom: 4,
  },
});
