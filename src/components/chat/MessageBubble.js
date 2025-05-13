import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MessageBubble({ text, isMe }) {
  return (
    <View style={[styles.bubble, isMe ? styles.mine : styles.theirs]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: 10,
    margin: 8,
    borderRadius: 10,
    maxWidth: '80%',
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C5',
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAEAEA',
  },
  text: {
    fontSize: 16,
  },
});
