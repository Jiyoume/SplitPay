import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { initLocalDatabase } from './src/services/localDatabase';
import { setSession } from './src/services/session';

export default function App() {
  const [dbLoaded, setDbLoaded] = useState(false);

  useEffect(() => {
    async function setupApp() {
      try {
        // Initialize SQLite & Seed mock data
        await initLocalDatabase();
        
        // Auto-login as default user 'me'
        setSession('demo-token', {
          id: 'me',
          name: 'Alex Reyes',
          email: 'alex.reyes@email.com',
        });
      } catch (err) {
        console.error('Failed to initialize local DB:', err);
      } finally {
        setDbLoaded(true);
      }
    }

    setupApp();
  }, []);

  if (!dbLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F5F9' }}>
        <ActivityIndicator size="large" color="#2F6BFF" />
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
