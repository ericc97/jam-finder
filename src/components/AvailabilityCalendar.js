import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { auth, db } from '../firebase';

export default function AvailabilityCalendar() {
  const [selectedDates, setSelectedDates] = useState({});

  const uid = auth.currentUser?.uid;

  // Load saved availability
  useEffect(() => {
    const loadAvailability = async () => {
      const docRef = doc(db, 'availability', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const dates = snap.data()?.dates || [];
        const formatted = {};
        dates.forEach(date => {
          formatted[date] = { selected: true, marked: true };
        });
        setSelectedDates(formatted);
      }
    };

    loadAvailability();
  }, []);

  const toggleDate = (day) => {
    const dateStr = day.dateString;
    const newDates = { ...selectedDates };

    if (newDates[dateStr]) {
      delete newDates[dateStr];
    } else {
      newDates[dateStr] = { selected: true, marked: true };
    }

    setSelectedDates(newDates);
  };

  const saveAvailability = async () => {
    const dates = Object.keys(selectedDates);
    await setDoc(doc(db, 'availability', uid), { dates });
    Alert.alert('Saved', 'Availability updated.');
  };

  return (
    <View style={{ padding: 10 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Tap dates to mark availability</Text>
      <Calendar
        onDayPress={toggleDate}
        markedDates={selectedDates}
        theme={{ selectedDayBackgroundColor: '#00adf5' }}
      />
      <Button title="Save Availability" onPress={saveAvailability} />
    </View>
  );
}
