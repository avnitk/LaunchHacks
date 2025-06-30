import notifee, { TimestampTrigger, TriggerType, AndroidImportance, EventType, RepeatFrequency } from '@notifee/react-native';
import { Platform, Alert } from 'react-native';
import { addPendingConfirmation, checkMedicationCompliance } from './services/complianceService';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

let sound = null;
let showiOSModal = false;
let modalData = null;
let modalCallback = null;
let modalTimeout = null;
let rerenderModal = null;

export const initializeNotifications = async () => {
  await notifee.requestPermission();

  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'medication-reminders',
      name: 'Medication Reminders',
      importance: AndroidImportance.HIGH,
    });
  }
};

export const playAlarmSound = async () => {
  try {
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
      require('../assets/alarm.mp3'),
      { shouldPlay: true, isLooping: true }
    );
    sound = newSound;
  } catch (error) {
    console.error('Error playing alarm sound:', error);
  }
};

export const stopAlarmSound = async () => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      sound = null;
    }
  } catch (error) {
    console.error('Error stopping alarm sound:', error);
  }
};

export const scheduleMedicationReminder = async (medication, prescriberEmail) => {
  const rawTime = medication.time;
  let reminderTime = new Date(rawTime);

  const now = new Date();
  reminderTime.setSeconds(0, 0);
  now.setSeconds(0, 0);
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: reminderTime.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    alarmManager: true,
  };

  const notificationId = await notifee.createTriggerNotification(
    {
      title: 'Medication Reminder',
      body: `Time to take ${medication.name} - ${medication.dosage}`,
      android: {
        channelId: 'medication-reminders',
        pressAction: {
          id: 'default',
        },
        actions: [
          { title: 'Confirm', pressAction: { id: 'confirm' } },
          { title: 'Not Now', pressAction: { id: 'not_now' } },
        ],
      },
      data: {
        medicationId: medication.id,
        name: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        prescriberEmail: prescriberEmail,
        reminderIndex: medication.reminderIndex,
        voiceReminder: String(medication.voiceReminder),
      },
    },
    trigger
  );
};

export const cancelMedicationReminder = async (medicationId) => {
  try {
    const notifications = await notifee.getTriggerNotifications();
    let found = false;
    for (const n of notifications) {
      const notification = n.notification || n;
      const notifId = notification.id;
      if (
        notification.data &&
        notification.data.medicationId === medicationId
      ) {
        if (typeof notifId === 'string' && notifId.length > 0) {
          found = true;
          try {
            await notifee.cancelNotification(notifId);
          } catch (err) {
            console.error('Error cancelling notification:', err, 'Notification ID:', notifId);
          }
        } else {
          console.error('Invalid notification id for cancellation:', notifId, notification);
        }
      }
    }
    
  } catch (error) {
    console.error('Error in cancelMedicationReminder:', error);
  }
};

export const MedicationActionModal = () => {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState(null);

  rerenderModal = () => setVisible(showiOSModal);

  React.useEffect(() => {
    if (showiOSModal && modalData) {
      setData(modalData);
      setVisible(true);
    } else {
      setVisible(false);
      setData(null);
    }
  }, [visible]);

  if (!visible || !data) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', width: 300 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Medication Reminder</Text>
          <Text style={{ fontSize: 16, marginBottom: 24 }}>Time to take {data.medicationName} - {data.dosage}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#4caf50', padding: 12, borderRadius: 8, width: '100%' }}
            onPress={async () => {
              if (modalCallback) await modalCallback('confirm');
              hideMedicationActionModal();
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const showMedicationActionModal = (data, callback) => {
  showiOSModal = true;
  modalData = data;
  modalCallback = callback;
  if (rerenderModal) rerenderModal();
  if (modalTimeout) clearTimeout(modalTimeout);
  modalTimeout = setTimeout(async () => {
    if (showiOSModal && modalCallback) {
      await modalCallback('timeout');
      hideMedicationActionModal();
    }
  }, 2 * 60 * 1000);
};

export const hideMedicationActionModal = () => {
  showiOSModal = false;
  modalData = null;
  modalCallback = null;
  if (rerenderModal) rerenderModal();
  if (modalTimeout) clearTimeout(modalTimeout);
  modalTimeout = null;
};

notifee.onForegroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED) {  
    const medName = detail.notification.data?.name || 'your medication';
    const dosage = detail.notification.data?.dosage || '';
    const voiceReminder = detail.notification.data?.voiceReminder;
    
    if (voiceReminder === 'true') {
    const match = dosage.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
    let speechText = '';
      
      if (match) {
        const num = match[1];
        let unit = match[2].toLowerCase();
        if (unit === 'mg') unit = 'milligrams';
        else if (unit === 'g') unit = 'grams';
        else if (unit === 'ml') unit = 'milliliters';
        else if (unit === 'mcg') unit = 'micrograms';
        else if (unit === 'tablet' || unit === 'tablets') unit = parseInt(num) > 1 ? 'tablets' : 'tablet';
        else if (unit === 'capsule' || unit === 'capsules') unit = parseInt(num) > 1 ? 'capsules' : 'capsule';
        else if (unit === 'pill' || unit === 'pills') unit = parseInt(num) > 1 ? 'pills' : 'pill';
        speechText = `Time to take ${num} ${unit} of ${medName}`;
      } else if (dosage) {
        speechText = `Time to take ${dosage} of ${medName}`;
      } else {
        speechText = `Time to take ${medName}`;
      }
      Speech.speak(speechText);
    }
    
    if (Platform.OS === 'ios') {
      showMedicationActionModal(
        {
          medicationId: detail.notification.data?.medicationId,
          prescriberEmail: detail.notification.data?.prescriberEmail,
          medicationName: detail.notification.data?.name,
          dosage: detail.notification.data?.dosage,
        },
        async (action) => {
          if (action === 'confirm') {
            await resetMedicationMissedCount(detail.notification.data?.medicationId);
          } else if (action === 'timeout') {
            await checkMedicationCompliance(detail.notification.data?.medicationId, detail.notification.data?.prescriberEmail);
          }
        }
      );
      return;
    }
  } else if (type === EventType.ACTION_PRESS) {
    const actionId = detail.pressAction?.id;
    const data = detail.notification.data;
    if (!data || !data.medicationId || !data.prescriberEmail) return;
    if (actionId === 'confirm') {
      await resetMedicationMissedCount(data.medicationId);
    } else if (actionId === 'not_now') {
      await checkMedicationCompliance(data.medicationId, data.prescriberEmail);
    }
  }
}); 

export const resetMedicationMissedCount = async (medicationId) => {
  try {
    const complianceJson = await AsyncStorage.getItem('medicationCompliance');
    const compliance = complianceJson ? JSON.parse(complianceJson) : {};
    if (compliance[medicationId]) {
      compliance[medicationId].missedCount = 0;
      await AsyncStorage.setItem('medicationCompliance', JSON.stringify(compliance));
    }
  } catch (error) {
    console.error('Error resetting missed count:', error);
  }
};