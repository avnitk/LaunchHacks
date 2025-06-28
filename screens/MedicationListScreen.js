import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function MedicationListScreen({ navigation }) {
  const [medications, setMedications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMedications = async () => {
    try {
      const medicationsJson = await AsyncStorage.getItem('medications');
      if (medicationsJson) {
        const parsedMedications = JSON.parse(medicationsJson);
        const validMedications = parsedMedications.map(med => ({
          id: med.id?.toString() || Date.now().toString(),
          name: med.name?.toString() || '',
          dosage: med.dosage?.toString() || '',
          frequency: med.frequency?.toString() || '',
          reminderTimes: med.reminderTimes || [med.time || new Date().toISOString()],
          date: med.date || new Date().toISOString()
        })).filter(med => med.name && med.dosage && med.frequency);
        
        setMedications(validMedications);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
      Alert.alert('Error', 'Failed to load medications');
    }
  };

  const deleteMedication = async (medicationId) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication? This will also remove all its reminders.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedMedications = medications.filter(med => med.id !== medicationId);
              await AsyncStorage.setItem('medications', JSON.stringify(updatedMedications));
              setMedications(updatedMedications);
              Alert.alert('Success', 'Medication has been deleted');
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('Error', 'Failed to delete medication');
            }
          }
        }
      ]
    );
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadMedications();
    }, [])
  );

  const formatTime = (isoString) => {
    const time = new Date(isoString);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderMedicationItem = ({ item }) => {
    return (
      <View style={styles.medicationItem}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDetails}>Dosage: {item.dosage}</Text>
          <Text style={styles.medicationDetails}>Frequency: {item.frequency}</Text>
          <Text style={styles.reminderTitle}>Reminder Times:</Text>
          {item.reminderTimes.map((time, index) => (
            <Text key={index} style={styles.reminderTime}>
              • {formatTime(time)}
            </Text>
          ))}
          <Text style={styles.medicationDetails}>
            Start Date: {formatDate(item.date)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteMedication(item.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No medications added yet</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('MedicationInput')}
          >
            <Text style={styles.addButtonText}>Add Medication</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => navigation.navigate('AIAssistant')}
            >
              <Text style={styles.aiButtonText}>🤖 AI Assistant</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={medications}
            renderItem={renderMedicationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#ff4d4d']}
                tintColor="#ff4d4d"
              />
            }
          />
        </>
      )}
      {medications.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => navigation.navigate('MedicationInput')}
        >
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButtons: {
    padding: 16,
    paddingBottom: 8,
  },
  aiButton: {
    backgroundColor: '#ff4d4d',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingRight: 20,
  },
  medicationItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff4d4d',
    marginBottom: 8,
  },
  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
    marginBottom: 2,
  },
  deleteButton: {
    backgroundColor: '#ff4d4d',
    padding: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#ff4d4d',
    padding: 15,
    borderRadius: 8,
    width: 200,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#ff4d4d',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 