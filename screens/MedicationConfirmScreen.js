import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MedicationConfirmScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);

  useEffect(() => {
    loadPendingConfirmations();
  }, []);

  const loadPendingConfirmations = async () => {
    try {
      const confirmationsJson = await AsyncStorage.getItem('pendingConfirmations');
      if (confirmationsJson) {
        const confirmations = JSON.parse(confirmationsJson);
        setPendingConfirmations(confirmations);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading confirmations:', error);
      setIsLoading(false);
    }
  };

  const confirmMedication = async (confirmationId) => {
    try {
      const confirmation = pendingConfirmations.find(c => c.id === confirmationId);
      if (!confirmation) return;

      const complianceJson = await AsyncStorage.getItem('medicationCompliance');
      const compliance = complianceJson ? JSON.parse(complianceJson) : {};

      if (!compliance[confirmation.medicationId]) {
        compliance[confirmation.medicationId] = {
          missedCount: 0,
          lastConfirmed: null,
          confirmations: []
        };
      }

      compliance[confirmation.medicationId].confirmations.push({
        timestamp: new Date().toISOString(),
        scheduledTime: confirmation.scheduledTime,
        confirmed: true
      });
      compliance[confirmation.medicationId].lastConfirmed = new Date().toISOString();
      compliance[confirmation.medicationId].missedCount = 0;

      await AsyncStorage.setItem('medicationCompliance', JSON.stringify(compliance));

      const updatedPending = pendingConfirmations.filter(c => c.id !== confirmationId);
      await AsyncStorage.setItem('pendingConfirmations', JSON.stringify(updatedPending));
      setPendingConfirmations(updatedPending);

      Alert.alert('Success', 'Medication intake confirmed!');
    } catch (error) {
      console.error('Error confirming medication:', error);
      Alert.alert('Error', 'Failed to confirm medication intake');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff4d4d" />
        <Text style={styles.loadingText}>Loading pending confirmations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {pendingConfirmations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending confirmations</Text>
          </View>
        ) : (
          pendingConfirmations.map((confirmation) => (
            <View key={confirmation.id} style={styles.confirmationCard}>
              <View style={styles.medicationInfo}>
                <Text style={styles.medicationName}>{confirmation.medicationName}</Text>
                <Text style={styles.medicationDetails}>
                  Dosage: {confirmation.dosage}
                </Text>
                <Text style={styles.medicationDetails}>
                  Scheduled: {formatTime(confirmation.scheduledTime)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => confirmMedication(confirmation.id)}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  confirmationCard: {
    backgroundColor: '#fff0f0',
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
    marginBottom: 4,
  },
  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  confirmButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 12,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
}); 