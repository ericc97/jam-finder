import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Dimensions, Linking, Clipboard, Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

export default function SwipeCard({ user }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playDemoSong = async () => {
    if (!user.audioUrl) {
      Alert.alert('No Demo', 'This artist has not uploaded a demo song yet.');
      return;
    }

    try {
      console.log('Attempting to play audio from URL:', user.audioUrl);
      
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
                      { uri: user.audioUrl },
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
                          onPress: () => Linking.openURL(user.audioUrl)
                        },
                        {
                          text: 'Copy URL',
                          onPress: () => {
                            Clipboard.setString(user.audioUrl);
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
                onPress: () => Linking.openURL(user.audioUrl)
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
          { uri: user.audioUrl },
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
      console.error('Audio URL:', user.audioUrl);
      Alert.alert(
        'Playback Error',
        `Failed to play demo song.\n\nURL: ${user.audioUrl}\n\nError: ${error.message}`,
        [
          {
            text: 'Open in Browser',
            onPress: () => {
              Linking.openURL(user.audioUrl);
            }
          },
          {
            text: 'Copy URL',
            onPress: () => {
              Clipboard.setString(user.audioUrl);
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

  const renderEquipmentInfo = () => {
    if (!user.equipment) return null;

    const { availableToUse, availableToRent, notIncluded, details } = user.equipment;
    const options = [];

    if (availableToUse) options.push('Available to Use');
    if (availableToRent) options.push('Available to Rent');
    if (notIncluded) options.push('Not Included');

    return (
      <View style={styles.equipmentContainer}>
        <Text style={styles.equipmentTitle}>Equipment</Text>
        {options.length > 0 && (
          <View style={styles.equipmentOptions}>
            {options.map((option, index) => (
              <View key={index} style={styles.equipmentOption}>
                <Ionicons 
                  name={option === 'Not Included' ? 'close-circle' : 'checkmark-circle'} 
                  size={16} 
                  color={option === 'Not Included' ? '#ff3b30' : '#00adf5'} 
                />
                <Text style={styles.equipmentOptionText}>{option}</Text>
              </View>
            ))}
          </View>
        )}
        {details && (
          <Text style={styles.equipmentDetails} numberOfLines={1} ellipsizeMode="tail">
            {details}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {user?.headerImages?.[0] ? (
        <FastImage 
          source={{ 
            uri: user.headerImages[0],
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable
          }} 
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
          onError={(error) => {
            console.error('Error loading header image:', error);
            console.log('Failed URL:', user.headerImages[0]);
            console.log('Image dimensions:', {
              width: width * 0.9,
              height: 200
            });
            setImageError(true);
          }}
          onLoad={(event) => {
            console.log('Header image loaded successfully:', {
              url: user.headerImages[0],
              width: event.nativeEvent.width,
              height: event.nativeEvent.height
            });
            setImageError(false);
          }}
        />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.nameContainer}>
        <Text style={styles.name}>{user?.name || 'No Name'}</Text>
      </View>

      {user.role === 'artist' && user.genre && (
        <View style={styles.genreContainer}>
          <Ionicons name="musical-notes" size={16} color="#00adf5" />
          <Text style={styles.genreText}>{user.genre}</Text>
        </View>
      )}

      <View style={styles.bioContainer}>
        <Text style={styles.bio} numberOfLines={3}>{user?.bio || 'No Bio'}</Text>
      </View>

      {user.role === 'venue' && (
        <View style={styles.venueInfo}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.infoText} numberOfLines={1}>
                {user.address || 'No address provided'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people" size={16} color="#666" />
              <Text style={styles.infoText}>
                {user.capacity ? `${user.capacity} capacity` : 'No capacity info'}
              </Text>
            </View>
          </View>
          {(user.spotifyUrl || user.instagramUrl) && (
            <View style={styles.socialLinks}>
              {user.spotifyUrl && (
                <TouchableOpacity 
                  style={styles.socialLink}
                  onPress={() => Linking.openURL(user.spotifyUrl)}
                >
                  <Ionicons name="logo-spotify" size={20} color="#1DB954" />
                  <Text style={styles.socialLinkText}>Spotify</Text>
                </TouchableOpacity>
              )}
              {user.instagramUrl && (
                <TouchableOpacity 
                  style={styles.socialLink}
                  onPress={() => Linking.openURL(user.instagramUrl)}
                >
                  <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                  <Text style={styles.socialLinkText}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {renderEquipmentInfo()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 5,
    margin: 8,
    marginLeft: 20,
    marginTop: 13,
    marginBottom: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: width * 0.9,
    height: 500,
    alignSelf: 'flex-start',
  },
  image: {
    height: 200,
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  bioContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  venueInfo: {
    padding: 12,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  equipmentContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  equipmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  equipmentOptions: {
    marginBottom: 6,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  equipmentOptionText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  equipmentDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  genreText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 6,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  demoButtonText: {
    fontSize: 16,
    color: '#00adf5',
    marginLeft: 6,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 8,
    gap: 16,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  socialLinkText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
});
