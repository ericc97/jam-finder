import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert, TouchableOpacity, Dimensions, Linking, Clipboard, Platform, Image } from 'react-native';
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
  const [currentHeaderIndex, setCurrentHeaderIndex] = useState(0);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  if (!user) {
    return null;
  }

  const handleCardPress = () => {
    if (isBioExpanded) {
      setIsBioExpanded(false);
    }
  };

  const handleNextImage = () => {
    if (user.headerImages?.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === user.headerImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (user.headerImages?.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === 0 ? user.headerImages.length - 1 : prevIndex - 1
      );
    }
  };

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
    <TouchableOpacity 
      style={styles.card} 
      onPress={handleCardPress}
      activeOpacity={1}
    >
      {user?.headerImages?.[0] ? (
        <View style={styles.imageContainer}>
          <FastImage 
            source={{ 
              uri: user.headerImages[currentHeaderIndex],
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable
            }} 
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
            onError={(error) => {
              console.error('Error loading header image:', error);
              console.log('Failed URL:', user.headerImages[currentHeaderIndex]);
              console.log('Image dimensions:', {
                width: width * 0.9,
                height: 200
              });
              setImageError(true);
            }}
            onLoad={(event) => {
              console.log('Header image loaded successfully:', {
                url: user.headerImages[currentHeaderIndex],
                width: event.nativeEvent.width,
                height: event.nativeEvent.height
              });
              setImageError(false);
            }}
          />
          {user.headerImages.length > 1 && (
            <>
              <TouchableOpacity 
                style={[styles.headerNavButton, styles.headerNavButtonLeft]}
                onPress={handlePrevImage}
              >
                <Ionicons name="chevron-back" size={30} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.headerNavButton, styles.headerNavButtonRight]}
                onPress={handleNextImage}
              >
                <Ionicons name="chevron-forward" size={30} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
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

      {user.role === 'artist' && user.audioUrl && (
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={playDemoSong}
        >
          <Ionicons 
            name={isPlaying ? "pause-circle" : "play-circle"} 
            size={20} 
            color="#00adf5" 
          />
          <Text style={styles.demoButtonText}>
            {isPlaying ? 'Pause Demo' : 'Play Demo'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.bioContainer}>
        <TouchableOpacity 
          onPress={() => setIsBioExpanded(!isBioExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.bio} numberOfLines={isBioExpanded ? undefined : 3}>
            {user?.bio || 'No Bio'}
          </Text>
          {user?.bio && user.bio.length > 150 && (
            <Text style={styles.expandText}>
              {isBioExpanded ? 'Show less' : 'Read more'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {(user.spotifyUrl || user.instagramUrl) && (
        <View style={styles.socialLinks}>
          {user.spotifyUrl && (
            <TouchableOpacity 
              style={styles.socialLink}
              onPress={() => Linking.openURL(user.spotifyUrl)}
            >
              <Image 
                source={require('../../assets/spotify-logo.png')} 
                style={styles.spotifyLogo}
              />
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
          {renderEquipmentInfo()}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 12,
    elevation: 5,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: width * 0.9,
    height: 475,
    alignSelf: 'center',
  },
  imageContainer: {
    position: 'relative',
    height: 190,
    width: '100%',
    marginBottom: 12,
  },
  image: {
    height: 190,
    width: '100%',
    borderRadius: 12,
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
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  expandText: {
    fontSize: 14,
    color: '#00adf5',
    marginTop: 4,
    textAlign: 'right',
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
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
    gap: 8,
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
  headerNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  headerNavButtonLeft: {
    left: 15,
  },
  headerNavButtonRight: {
    right: 15,
  },
  spotifyLogo: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
});
