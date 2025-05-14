import React from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Platform
} from 'react-native';

const { width } = Dimensions.get('window');

export default function RoleSelectScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to JamFinder</Text>
      <Text style={styles.subtitle}>Connect with local artists and venues</Text>

      <View style={styles.cardsContainer}>
        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('Signup', { role: 'artist' })}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80' }}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
          >
            <View style={styles.overlay}>
              <Text style={styles.cardTitle}>Artist</Text>
              <Text style={styles.cardDescription}>
                Showcase your talent and find venues to perform
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card}
          onPress={() => navigation.navigate('Signup', { role: 'venue' })}
        >
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80' }}
            style={styles.cardImage}
            imageStyle={styles.cardImageStyle}
          >
            <View style={styles.overlay}>
              <Text style={styles.cardTitle}>Venue</Text>
              <Text style={styles.cardDescription}>
                Find talented artists to perform at your venue
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.loginButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.loginButtonText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 40,
    color: '#666',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  card: {
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageStyle: {
    borderRadius: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  loginButton: {
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#00adf5',
    fontSize: 16,
  },
});
