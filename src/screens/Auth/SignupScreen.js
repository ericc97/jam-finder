import React, { useState } from 'react';
import { Alert, Button, Text, TextInput, View, ActivityIndicator, StyleSheet } from 'react-native';
import { auth, db } from '../../services/firebase';

export default function SignupScreen({ route, navigation }) {
  const { role } = route.params;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSignup = async () => {
    // Validate inputs
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting signup process...');
      
      // Create auth user
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      const user = userCredential.user;
      console.log('Auth user created:', user.uid);

      // Create Firestore profile
      const publicId = user.uid.slice(0, 8);
      const userData = {
        email: email.trim(),
        role,
        publicId,
        createdAt: db.FieldValue.serverTimestamp(),
      };
      
      console.log('Creating Firestore profile with data:', userData);
      await db().collection('users').doc(user.uid).set(userData);
      console.log('Firestore profile created successfully');

      // Let App.js redirect based on auth state
    } catch (error) {
      console.error('Signup error:', error);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'An error occurred during signup';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered. Please login instead.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Please choose a stronger password.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection and try again.';
          break;
        default:
          errorMessage = error.message;
      }
      
      Alert.alert('Signup Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup as {role}</Text>
      
      <TextInput 
        style={styles.input}
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isLoading}
      />
      
      <TextInput 
        style={styles.input}
        placeholder="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        editable={!isLoading}
      />
      
      <Button 
        title={isLoading ? "Signing up..." : "Sign Up"} 
        onPress={handleSignup}
        disabled={isLoading}
      />
      
      {isLoading && <ActivityIndicator style={styles.loader} />}
      
      <Button 
        title="Already have an account? Login" 
        onPress={() => navigation.navigate('Login')}
        disabled={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  loader: {
    marginTop: 10,
  },
});
