import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  Switch
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleMedicationReminder, cancelMedicationReminder } from '../notificationService';

const FREQUENCY_OPTIONS = [
  { id: '1', label: 'Once Daily', value: 1 },
  { id: '2', label: 'Twice Daily', value: 2 },
  { id: '3', label: 'Three Times Daily', value: 3 },
  { id: '4', label: 'Four Times Daily', value: 4 }
];

export default function MedicationInputScreen({ navigation }) {
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [selectedFrequency, setSelectedFrequency] = useState(null);
  const [prescriberEmail, setPrescriberEmail] = useState('');
  const [date, setDate] = useState(new Date());
  const [reminderTimes, setReminderTimes] = useState([new Date()]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentMed, setCurrentMed] = useState({
    name: '',
    dosage: '',
    frequency: '',
    time: new Date(),
    date: new Date(),
    reminderEnabled: true,
    voiceReminder: true,
  });
  const [patientName, setPatientName] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const updateReminderTimesArray = (frequency) => {
    if (!frequency) {
      setReminderTimes([new Date()]);
      return;
    }
    
    const times = [];
    for (let i = 0; i < frequency.value; i++) {
      times.push(reminderTimes[i] || new Date());
    }
    setReminderTimes(times);
  };

  const selectFrequency = (frequency) => {
    setSelectedFrequency(frequency);
    updateReminderTimesArray(frequency);
    setShowFrequencyModal(false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newTime = new Date();
      newTime.setHours(selectedTime.getHours());
      newTime.setMinutes(selectedTime.getMinutes());
      newTime.setSeconds(0);
      newTime.setMilliseconds(0);

      const newReminderTimes = [...reminderTimes];
      newReminderTimes[currentTimeIndex] = newTime;
      setReminderTimes(newReminderTimes);
    }
  };

  const renderFrequencyOption = ({ item }) => (
    <TouchableOpacity
      style={styles.frequencyOption}
      onPress={() => selectFrequency(item)}
    >
      <Text style={styles.frequencyOptionText}>{item.label}</Text>
    </TouchableOpacity>
  );

  const saveMedication = async () => {
    if (!medicationName || !dosage || !selectedFrequency || !prescriberEmail || !patientName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(prescriberEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!dosage.trim()) {
      Alert.alert('Error', 'Dosage is required');
      return;
    }

    if (reminderTimes.length !== selectedFrequency.value) {
      Alert.alert('Error', 'Please set all reminder times');
      return;
    }

    setIsLoading(true);

    try {
      const existingMedicationsJson = await AsyncStorage.getItem('medications');
      const existingMedications = existingMedicationsJson ? JSON.parse(existingMedicationsJson) : [];

      const isDuplicate = existingMedications.some(med => med.name.toLowerCase() === medicationName.toLowerCase());
      if (isDuplicate) {
        Alert.alert('Error', 'A medication with this name already exists');
        setIsLoading(false);
        return;
      }

      const medicationId = Date.now().toString();

      await cancelMedicationReminder(medicationId);

      const newMedication = {
        id: medicationId,
        name: medicationName,
        dosage: dosage.trim(),
        frequency: selectedFrequency.label,
        prescriberEmail,
        date: date.toISOString(),
        reminderTimes: reminderTimes.map(time => time.toISOString()),
        reminderEnabled: currentMed.reminderEnabled,
        voiceReminder: currentMed.voiceReminder,
        patientName: patientName.trim(),
      };

      try {
        const notificationPromises = reminderTimes.map((time, index) => {
          return scheduleMedicationReminder({
            ...newMedication,
            time: time.toISOString(),
            reminderIndex: index
          }, prescriberEmail);
        });

        await Promise.all(notificationPromises);

        const updatedMedications = [...existingMedications, newMedication];
        await AsyncStorage.setItem('medications', JSON.stringify(updatedMedications));

        Alert.alert(
          'Success',
          'Medication added successfully! You will be notified at the specified times.',
          [
            {
              text: 'OK',
              onPress: () => {
                setMedicationName('');
                setDosage('');
                setSelectedFrequency(null);
                setPrescriberEmail('');
                setDate(new Date());
                setReminderTimes([new Date()]);
                setPatientName('');
                navigation.goBack();
              }
            }
          ]
        );
      } catch (error) {
        console.error('Failed to schedule notifications:', error);
        Alert.alert(
          'Warning',
          'Failed to set up notifications. Please check your notification permissions and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error saving medication:', error);
      Alert.alert('Error', 'Failed to save medication');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4d4d" />
        <Text style={styles.loadingText}>Setting up your medication reminder...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Patient Name</Text>
        <TextInput
          style={styles.input}
          value={patientName}
          onChangeText={setPatientName}
          placeholder="Enter patient name"
        />

        <Text style={styles.label}>Medication Name</Text>
        <TextInput
          style={styles.input}
          value={medicationName}
          onChangeText={setMedicationName}
          placeholder="Enter medication name"
        />

        <Text style={styles.label}>Dosage</Text>
        <TextInput
          style={styles.input}
          value={dosage}
          onChangeText={setDosage}
          placeholder="Enter dosage (e.g., 1 tablet, 2 tablets)"
          autoCapitalize="none"
        />
        <Text style={styles.helperText}>Format: any (e.g., "1 tablet", "50mg", "as needed")</Text>

        <Text style={styles.label}>Frequency</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowFrequencyModal(true)}
        >
          <Text style={selectedFrequency ? styles.inputText : styles.placeholderText}>
            {selectedFrequency ? selectedFrequency.label : 'Select frequency'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Prescriber's Email</Text>
        <TextInput
          style={styles.input}
          value={prescriberEmail}
          onChangeText={setPrescriberEmail}
          placeholder="Enter prescriber's email"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Start Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {selectedFrequency && (
          <>
            <Text style={styles.label}>Reminder Times</Text>
            {reminderTimes.map((time, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dateButton}
                onPress={() => {
                  setCurrentTimeIndex(index);
                  setShowTimePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>
                  Reminder {index + 1}: {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={reminderTimes[currentTimeIndex]}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        <View style={styles.reminderContainer}>
          <Text style={styles.reminderText}>Voice Reminder</Text>
          <Switch
            value={currentMed.voiceReminder}
            onValueChange={(value) => 
              setCurrentMed({ ...currentMed, voiceReminder: value })
            }
            trackColor={{ false: '#767577', true: '#ff4d4d' }}
            thumbColor={currentMed.voiceReminder ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={saveMedication}
        >
          <Text style={styles.submitButtonText}>Add Medication</Text>
        </TouchableOpacity>

        <Modal
          visible={showFrequencyModal}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Frequency</Text>
              <FlatList
                data={FREQUENCY_OPTIONS}
                renderItem={renderFrequencyOption}
                keyExtractor={item => item.id}
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFrequencyModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#ff4d4d',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  frequencyOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  frequencyOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalCloseButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#eee',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 4,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reminderText: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  reminderText: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
}); 