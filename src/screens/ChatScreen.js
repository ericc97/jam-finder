import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    Button,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    View,
    StyleSheet
} from 'react-native';
import MessageBubble from '../components/chat/MessageBubble';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function ChatScreen() {
  const route = useRoute();
  const { matchId, otherUserName } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const messageList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messageList);
      });

    return () => unsubscribe();
  }, [matchId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      await firestore()
        .collection('matches')
        .doc(matchId)
        .collection('messages')
        .add({
          text: text.trim(),
          senderId: auth().currentUser.uid,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      
      setText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const sendDateRequest = async (date) => {
    const formatted = date.toDateString();
    try {
      await firestore()
        .collection('matches')
        .doc(matchId)
        .collection('messages')
        .add({
          type: 'date_request',
          text: formatted,
          senderId: auth().currentUser.uid,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });
      setShowDateModal(false);
    } catch (error) {
      console.error('Error sending date request:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        renderItem={({ item }) =>
          item.type === 'date_request' ? (
            <View style={styles.dateRequestContainer}>
              <Text style={styles.dateRequestTitle}>📅 Date Requested:</Text>
              <Text>{item.text}</Text>
            </View>
          ) : (
            <MessageBubble 
              text={item.text} 
              isMe={item.senderId === auth().currentUser.uid} 
            />
          )
        }
        keyExtractor={item => item.id}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          style={styles.input}
          multiline
        />
        <Button title="Send" onPress={sendMessage} />
      </View>

      <View style={styles.dateRequestButtonContainer}>
        <Button title="📅 Request a Date" onPress={() => setShowDateModal(true)} />
      </View>

      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a date to request</Text>
            <DateTimePicker
              mode="date"
              display="calendar"
              value={tempDate}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setTempDate(selectedDate);
                }
              }}
            />
            <View style={styles.modalButtons}>
              <Button title="Cancel" onPress={() => setShowDateModal(false)} />
              <Button title="Request" onPress={() => sendDateRequest(tempDate)} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  dateRequestButtonContainer: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  dateRequestContainer: {
    margin: 10,
    padding: 12,
    backgroundColor: '#eef',
    borderRadius: 8,
  },
  dateRequestTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000000aa',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  modalTitle: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
