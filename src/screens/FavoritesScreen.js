// screens/FavoritesScreen.js
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../services/firebase';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchFavorites = async () => {
      const uid = auth.currentUser.uid;
      const favDoc = await getDoc(doc(db, 'favorites', uid));
      const favMap = favDoc.exists() ? favDoc.data() : {};
      const userIds = Object.keys(favMap);

      const users = [];
      for (const id of userIds) {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          users.push({ id, ...userDoc.data() });
        }
      }

      setFavorites(users);
    };

    fetchFavorites();
  }, []);

  return (
    <View>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('PublicProfile', { publicId: item.publicId })}
            style={{ padding: 12, borderBottomWidth: 1 }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
            {item.headerImages?.[0] && (
              <Image
                source={{ uri: item.headerImages[0] }}
                style={{ width: '100%', height: 150, borderRadius: 10, marginTop: 8 }}
              />
            )}
            <Text style={{ color: '#888' }}>{item.genre}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
