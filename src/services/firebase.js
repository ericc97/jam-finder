// Firebase configuration
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import firebase from '@react-native-firebase/app';

// Initialize Firebase
try {
  console.log('Starting Firebase initialization...');
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!firebase.apps.length) {
    console.log('No Firebase apps found, initializing...');
    firebase.initializeApp();
    console.log('Firebase app initialized');
  } else {
    console.log('Firebase app already initialized');
  }

  // Verify services are initialized
  console.log('Verifying Firebase services...');
  
  if (!auth().app) {
    console.error('Firebase Auth not initialized');
    throw new Error('Firebase Auth not initialized');
  }
  console.log('Firebase Auth initialized successfully');
  
  if (!firestore().app) {
    console.error('Firestore not initialized');
    throw new Error('Firestore not initialized');
  }
  console.log('Firestore initialized successfully');
  
  if (!storage().app) {
    console.error('Storage not initialized');
    throw new Error('Storage not initialized');
  }
  console.log('Firebase Storage initialized successfully');
  
  console.log('All Firebase services initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { auth, firestore as db, storage };

