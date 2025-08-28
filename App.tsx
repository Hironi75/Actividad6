import 'react-native-gesture-handler';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, TextInput, Button, FlatList, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar, useColorScheme, Alert } from 'react-native';
// ...existing code...

type RootStackParamList = {
  BuscarLibros: undefined;
  DetalleLibro: { libro: any };
  Favoritos: undefined;
};

type BuscarLibrosScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'BuscarLibros'>;
};

type DetalleLibroScreenProps = {
  route: RouteProp<RootStackParamList, 'DetalleLibro'>;
  navigation: StackNavigationProp<RootStackParamList, 'DetalleLibro'>;
};

type FavoritosScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Favoritos'>;
};
// Pantallas (las crearemos después)
function BuscarLibrosScreen() {
   const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'BuscarLibros'>>();
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const buscarLibros = async () => {
    if (!busqueda) return;
    setCargando(true);
    setError('');
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(busqueda)}`
      );
      const data = await response.json();
      setResultados(data.items || []);
    } catch (e) {
      setError('Error al buscar libros');
    }
    setCargando(false);
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Buscar libros..."
        value={busqueda}
        onChangeText={setBusqueda}
        style={styles.input}
      />
      <Button title="Buscar" onPress={buscarLibros} />
      {cargando && <ActivityIndicator style={{ margin: 16 }} />}
      {error ? <Text style={{ color: 'red' }}>{error}</Text> : null}
      <FlatList
        data={resultados}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('DetalleLibro', { libro: item })}
          >
            <Image
              source={{ uri: item.volumeInfo.imageLinks?.thumbnail }}
              style={styles.imagen}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>{item.volumeInfo.title}</Text>
              <Text style={styles.autor}>{item.volumeInfo.authors?.join(', ')}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Button title="Ver Favoritos" onPress={() => navigation.navigate('Favoritos')} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 8,
  },
  item: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 8, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 8,
  },
  imagen: {
    width: 50, height: 75, marginRight: 12, borderRadius: 4, backgroundColor: '#eee',
  },
  titulo: {
    fontWeight: 'bold', fontSize: 16,
  },
  autor: {
    color: '#555',
  },
});

function DetalleLibroScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'DetalleLibro'>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DetalleLibro'>>();
  const { libro } = route.params;

  const guardarEnFavoritos = async () => {
    try {
      const favoritosStr = await AsyncStorage.getItem('favoritos');
      let favoritos = favoritosStr ? JSON.parse(favoritosStr) : [];
      // Evitar duplicados por id
      if (!favoritos.some((fav: any) => fav.id === libro.id)) {
        favoritos.push(libro);
        await AsyncStorage.setItem('favoritos', JSON.stringify(favoritos));
        Alert.alert('¡Libro añadido a favoritos!');
      } else {
        Alert.alert('Este libro ya está en favoritos.');
      }
    } catch (e) {
      Alert.alert('Error al guardar en favoritos');
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Image
        source={{ uri: libro.volumeInfo.imageLinks?.thumbnail }}
        style={{ width: 120, height: 180, alignSelf: 'center', marginBottom: 16, borderRadius: 8, backgroundColor: '#eee' }}
      />
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>{libro.volumeInfo.title}</Text>
      <Text style={{ fontSize: 16, color: '#555', marginBottom: 8 }}>{libro.volumeInfo.authors?.join(', ')}</Text>
      <Text style={{ marginBottom: 8 }}>{libro.volumeInfo.description || 'Sin descripción.'}</Text>
      <Text style={{ color: '#888', marginBottom: 16 }}>Publicado: {libro.volumeInfo.publishedDate || 'Desconocido'}</Text>
      <Button title="Añadir a Favoritos" onPress={guardarEnFavoritos} />
    </View>
  );
}
function FavoritosScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Favoritos'>>();
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarFavoritos = async () => {
    setCargando(true);
    const favoritosStr = await AsyncStorage.getItem('favoritos');
    setFavoritos(favoritosStr ? JSON.parse(favoritosStr) : []);
    setCargando(false);
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarFavoritos);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Favoritos</Text>
      {cargando ? (
        <ActivityIndicator style={{ margin: 16 }} />
      ) : favoritos.length === 0 ? (
        <Text>No hay libros favoritos.</Text>
      ) : (
        <FlatList
          data={favoritos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate('DetalleLibro', { libro: item })}
            >
              <Image
                source={{ uri: item.volumeInfo.imageLinks?.thumbnail }}
                style={styles.imagen}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo}>{item.volumeInfo.title}</Text>
                <Text style={styles.autor}>{item.volumeInfo.authors?.join(', ')}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const Stack = createStackNavigator();

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="BuscarLibros" component={BuscarLibrosScreen} options={{ title: 'Buscar Libros' }} />
          <Stack.Screen name="DetalleLibro" component={DetalleLibroScreen} options={{ title: 'Detalles del Libro' }} />
          <Stack.Screen name="Favoritos" component={FavoritosScreen} options={{ title: 'Favoritos' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}