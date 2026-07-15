import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { initLocalDatabase } from './src/services/localDatabase';
import { startSyncEngine, stopSyncEngine } from './src/services/syncEngine';
import { Colors } from './src/constants/colors';

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function setup() {
      try {
        await initLocalDatabase();
        startSyncEngine();
        if (active) setDbReady(true);
      } catch (err) {
        console.error('Failed to initialize application database:', err);
      }
    }
    setup();
    return () => {
      active = false;
      stopSyncEngine();
    };
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
});
