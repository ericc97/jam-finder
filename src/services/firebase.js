// Firebase configuration
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import firebase from '@react-native-firebase/app';

// Initialize Firebase
try {
  // Initialize Firebase if it hasn't been initialized yet
  if (!firebase.apps.length) {
    firebase.initializeApp();
  }

  // Verify services are initialized
  if (!auth().app) {
    throw new Error('Firebase Auth not initialized');
  }
  if (!firestore().app) {
    throw new Error('Firestore not initialized');
  }
  if (!storage().app) {
    throw new Error('Storage not initialized');
  }
  
  console.log('Firebase services initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { auth, firestore as db, storage };

