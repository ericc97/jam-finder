import DateTimePicker from '@react-native-community/datetimepicker';
import { useRoute } from '@react-navigation/native';
import {
    addDoc,
    collection,
    onSnapshot,
    orderBy,
    query
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Button,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TextInput,
    View
} from 'react-native';
import MessageBubble from '../components/chat/MessageBubble';
import { auth, db } from '../services/firebase';

export default function ChatScreen() {
  const route = useRoute();
  const { matchId, otherUserName } = route.params;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    const q = query(
      collection(db, `matches/${matchId}/chat`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsubscribe;
  }, [matchId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, `matches/${matchId}/chat`), {
      senderId: auth.currentUser.uid,
      text,
      type: 'text',
      timestamp: new Date(),
    });
    setText('');
  };

  const sendDateRequest = async (date) => {
    const formatted = date.toDateString();
    await addDoc(collection(db, `matches/${matchId}/chat`), {
      senderId: auth.currentUser.uid,
      type: 'date_request',
      text: formatted,
      timestamp: new Date(),
    });
    setShowDateModal(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        renderItem={({ item }) =>
          item.type === 'date_request' ? (
            <View style={{ margin: 10, padding: 12, backgroundColor: '#eef', borderRadius: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>📅 Date Requested:</Text>
              <Text>{item.text}</Text>
            </View>
          ) : (
            <MessageBubble text={item.text} isMe={item.senderId === auth.currentUser.uid} />
          )
        }
        keyExtractor={item => item.id}
      />

      <View style={{ flexDirection: 'row', padding: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          style={{ flex: 1, borderWidth: 1, padding: 8, borderRadius: 8 }}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>

      <View style={{ paddingHorizontal: 8, marginBottom: 8 }}>
        <Button title="📅 Request a Date" onPress={() => setShowDateModal(true)} />
      </View>

      {/* Date picker modal */}
      <Modal visible={showDateModal} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000000aa' }}>
          <View style={{ backgroundColor: '#fff', padding: 20, margin: 20, borderRadius: 10 }}>
            <Text style={{ marginBottom: 10 }}>Select a date to request</Text>
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <Button title="Cancel" onPress={() => setShowDateModal(false)} />
              <Button title="Request" onPress={() => sendDateRequest(tempDate)} />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
