import React from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Linking,
  Clipboard,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

export default function ViewProfileScreen({ route, navigation }) {
  const { profile } = route.params;
  const [currentHeaderIndex, setCurrentHeaderIndex] = React.useState(0);
  const [sound, setSound] = React.useState(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playDemoSong = async () => {
    if (!profile.audioUrl) {
      Alert.alert('No Demo', 'This artist has not uploaded a demo song yet.');
      return;
    }

    try {
      console.log('Attempting to play audio from URL:', profile.audioUrl);
      
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
                      { uri: profile.audioUrl },
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
                          onPress: () => Linking.openURL(profile.audioUrl)
                        },
                        {
                          text: 'Copy URL',
                          onPress: () => {
                            Clipboard.setString(profile.audioUrl);
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
                onPress: () => Linking.openURL(profile.audioUrl)
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
          { uri: profile.audioUrl },
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
      console.error('Audio URL:', profile.audioUrl);
      Alert.alert(
        'Playback Error',
        `Failed to play demo song.\n\nURL: ${profile.audioUrl}\n\nError: ${error.message}`,
        [
          {
            text: 'Open in Browser',
            onPress: () => {
              Linking.openURL(profile.audioUrl);
            }
          },
          {
            text: 'Copy URL',
            onPress: () => {
              Clipboard.setString(profile.audioUrl);
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

  const handleNextImage = () => {
    if (profile.headerImages?.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === profile.headerImages.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (profile.headerImages?.length > 0) {
      setCurrentHeaderIndex((prevIndex) => 
        prevIndex === 0 ? profile.headerImages.length - 1 : prevIndex - 1
      );
    }
  };

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.headerContainer}>
        {profile.headerImages?.[0] ? (
          <View style={styles.headerImageWrapper}>
            <FastImage 
              source={{ uri: profile.headerImages[currentHeaderIndex] }}
              style={styles.headerImage}
              resizeMode={FastImage.resizeMode.cover}
            />
            {profile.headerImages.length > 1 && (
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
          <View style={styles.headerPlaceholder}>
            <Ionicons name="image" size={40} color="#fff" />
            <Text style={styles.headerPlaceholderText}>No Images</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.name || 'No Name'}</Text>
          <Text style={styles.role}>{profile.role === 'artist' ? 'Artist' : 'Venue'}</Text>
        </View>

        {profile.role === 'artist' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Genre</Text>
              <Text style={styles.genre}>{profile.genre || 'No genre specified'}</Text>
            </View>

            <TouchableOpacity 
              style={styles.demoButton}
              onPress={playDemoSong}
            >
              <Ionicons 
                name={isPlaying ? "pause-circle" : "play-circle"} 
                size={24} 
                color="#00adf5" 
              />
              <Text style={styles.demoButtonText}>
                {isPlaying ? "Pause Demo" : "Play Demo"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bio}>{profile.bio || 'No bio added yet'}</Text>
        </View>

        {profile.role === 'venue' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Text style={styles.location}>{profile.address || 'No address added yet'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Capacity</Text>
              <Text style={styles.capacity}>{profile.capacity || 'No capacity specified'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment</Text>
              <View style={styles.equipmentContainer}>
                <View style={styles.equipmentOption}>
                  <Ionicons 
                    name={profile.equipment?.availableToUse ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={profile.equipment?.availableToUse ? "#00adf5" : "#ff3b30"} 
                  />
                  <Text style={styles.equipmentText}>Available to Use</Text>
                </View>
                <View style={styles.equipmentOption}>
                  <Ionicons 
                    name={profile.equipment?.availableToRent ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={profile.equipment?.availableToRent ? "#00adf5" : "#ff3b30"} 
                  />
                  <Text style={styles.equipmentText}>Available to Rent</Text>
                </View>
                <View style={styles.equipmentOption}>
                  <Ionicons 
                    name={profile.equipment?.notIncluded ? "checkmark-circle" : "close-circle"} 
                    size={24} 
                    color={profile.equipment?.notIncluded ? "#00adf5" : "#ff3b30"} 
                  />
                  <Text style={styles.equipmentText}>Not Included</Text>
                </View>
                {profile.equipment?.details && (
                  <Text style={styles.equipmentDetails}>{profile.equipment.details}</Text>
                )}
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImageWrapper: {
    width: '100%',
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerPlaceholder: {
    width: '100%',
    height: HEADER_HEIGHT,
    backgroundColor: '#00adf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPlaceholderText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
  headerNavButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  genre: {
    fontSize: 16,
    color: '#444',
  },
  location: {
    fontSize: 16,
    color: '#444',
  },
  capacity: {
    fontSize: 16,
    color: '#444',
  },
  equipmentContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  equipmentText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
  },
  equipmentDetails: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  demoButtonText: {
    fontSize: 16,
    color: '#00adf5',
    marginLeft: 8,
  },
}); 