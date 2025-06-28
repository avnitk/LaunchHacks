import 'react-native-gesture-handler';  // This import must be first!
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { Alert, Text } from 'react-native';
import WelcomeScreen from './screens/WelcomeScreen';
import MedicationInputScreen from './screens/MedicationInputScreen';
import MedicationListScreen from './screens/MedicationListScreen';
import MedicationConfirmScreen from './screens/MedicationConfirmScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';
import PushNotification from 'react-native-push-notification';
import { initializeNotifications, MedicationActionModal } from './notificationService';
import notifee, { TimestampTrigger, TriggerType, AndroidImportance, EventType } from '@notifee/react-native';

enableScreens();
const Stack = createStackNavigator();

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    initializeNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <MedicationActionModal />
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Welcome"
          screenOptions={{
            headerMode: 'float',
            headerStyle: {
              backgroundColor: '#ffebee',
            },
            headerTintColor: '#d32f2f',
            headerTitleStyle: {
              fontSize: 20,
              fontWeight: '600',
            },
            headerBackTitleVisible: false,
            headerLeftContainerStyle: {
              paddingLeft: 15,
            },
            headerTitleContainerStyle: {
              paddingHorizontal: 20,
            },
            headerTitleAlign: 'center',
            headerBackImage: () => (
              <Text style={{ color: '#d32f2f', fontSize: 28, marginLeft: 5 }}>‹</Text>
            ),
          }}
        >
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="MedicationList"
            component={MedicationListScreen}
            options={{ 
              title: 'My Medications',
            }}
          />
          <Stack.Screen 
            name="MedicationInput" 
            component={MedicationInputScreen}
            options={{ title: 'Add Medication' }}
          />
          <Stack.Screen 
            name="MedicationConfirm" 
            component={MedicationConfirmScreen}
            options={{ title: 'Confirm Medication' }}
          />
          <Stack.Screen 
            name="AIAssistant" 
            component={AIAssistantScreen}
            options={{ title: 'AI Assistant' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
