import AsyncStorage from '@react-native-async-storage/async-storage';
import emailjs from 'emailjs-com';

export const checkMedicationCompliance = async (medicationId, prescriberEmail) => {
  try {
    const complianceJson = await AsyncStorage.getItem('medicationCompliance');
    const compliance = complianceJson ? JSON.parse(complianceJson) : {};
    
    const medicationsJson = await AsyncStorage.getItem('medications');
    const medications = medicationsJson ? JSON.parse(medicationsJson) : [];
    const medication = medications.find(med => med.id === medicationId);

    if (!medication) return;

    if (!compliance[medicationId]) {
      compliance[medicationId] = {
        missedCount: 0,
        lastConfirmed: null,
        confirmations: []
      };
    }

    const medicationRecord = compliance[medicationId];
    
    medicationRecord.missedCount += 1;

    if (medicationRecord.missedCount > 2) {
      await sendMissedDosagesEmail(medication, prescriberEmail, medicationRecord.missedCount);
      medicationRecord.missedCount = 0;
    }

    await AsyncStorage.setItem('medicationCompliance', JSON.stringify(compliance));

  } catch (error) {
    console.error('Error checking medication compliance:', error);
  }
};

export const addPendingConfirmation = async (medication, scheduledTime) => {
  try {

    const confirmationsJson = await AsyncStorage.getItem('pendingConfirmations');
    const confirmations = confirmationsJson ? JSON.parse(confirmationsJson) : [];


    const newConfirmation = {
      id: Date.now().toString(),
      medicationId: medication.id,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduledTime: scheduledTime,
      created: new Date().toISOString()
    };

    confirmations.push(newConfirmation);


    await AsyncStorage.setItem('pendingConfirmations', JSON.stringify(confirmations));

    return newConfirmation.id;
  } catch (error) {
    console.error('Error adding pending confirmation:', error);
    return null;
  }
};

const sendNonComplianceEmail = async (medication, prescriberEmail) => {
  try {
  } catch (error) {
    console.error('Error sending non-compliance email:', error);
  }
};

export const sendMissedDosagesEmail = async (medication, prescriberEmail, missedCount) => {
  try {
    const patientName = medication.patientName || 'The patient';
    const medName = medication.name || 'the medication';
    const msg = `${patientName} missed ${missedCount} dosages for ${medName}`;
    fetch('http://192.168.0.11:3001/send-missed-dosage-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: prescriberEmail,
        subject: `Missed Dosages Alert - ${medName}`,
        text: msg
      })
    })
    .then(res => res.json())
    .catch(err => console.error('Error sending email:', err));
  } catch (error) {
    console.error('Error sending missed dosages email:', error);
  }
}; 