import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent ensures the environment is set up appropriately
// whether you load the app in Expo Go, a dev client, or a native build.
registerRootComponent(App);
