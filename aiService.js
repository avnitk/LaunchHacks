import AsyncStorage from '@react-native-async-storage/async-storage';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '@env';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const MEDICAL_ASSISTANT_PROMPT = `You are a comprehensive medical assistant with extensive knowledge about:

1. **Medications**: All types of medicines, their uses, dosages, side effects, interactions, and contraindications
2. **Health Conditions**: Symptoms, treatments, and management strategies
3. **Lifestyle Medicine**: Nutrition, exercise, sleep, stress management, and preventive care
4. **Patient Education**: Explaining medical concepts in simple terms
5. **Medication Management**: Proper timing, storage, and administration
6. **Drug Interactions**: Potential conflicts between medications, supplements, and foods
7. **Emergency Recognition**: When to seek immediate medical attention

**IMPORTANT GUIDELINES:**
- Always provide evidence-based information
- Be clear about when to consult healthcare providers
- Never make definitive diagnoses
- Emphasize the importance of professional medical advice
- Use simple, understandable language
- Be empathetic and supportive
- Include relevant warnings and precautions
- Suggest lifestyle modifications when appropriate

**CONVERSATION STYLE:**
- Be conversational and engaging
- Ask follow-up questions to better understand the patient's situation
- Provide practical, actionable advice
- Remember previous context in the conversation
- Be encouraging about healthy lifestyle choices

**SAFETY DISCLAIMERS:**
- Always include appropriate medical disclaimers
- Encourage professional consultation for serious concerns
- Never replace professional medical advice

You can access the patient's medication list to provide personalized advice.`;

const CONVERSATION_HISTORY_KEY = 'medical_assistant_conversation_history';
const MAX_HISTORY_LENGTH = 20;

const saveConversationHistory = async (history) => {
  try {
    await AsyncStorage.setItem(CONVERSATION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
};

const loadConversationHistory = async () => {
  try {
    const history = await AsyncStorage.getItem(CONVERSATION_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error loading conversation history:', error);
    return [];
  }
};

const clearConversationHistory = async () => {
  try {
    await AsyncStorage.removeItem(CONVERSATION_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing conversation history:', error);
  }
};

const formatMedicationsForContext = (medications) => {
  if (!medications || medications.length === 0) {
    return "No medications currently recorded.";
  }
  
  return medications.map(med => {
    const details = [];
    if (med.name) details.push(`Name: ${med.name}`);
    if (med.dosage) details.push(`Dosage: ${med.dosage}`);
    if (med.frequency) details.push(`Frequency: ${med.frequency}`);
    if (med.time) details.push(`Time: ${new Date(med.time).toLocaleTimeString()}`);
    if (med.instructions) details.push(`Instructions: ${med.instructions}`);
    
    return details.join(', ');
  }).join('\n');
};

export const chatWithMedicalAssistant = async (message, medications = [], options = {}) => {
  try {
    const history = await loadConversationHistory();
    
    const medicationsContext = formatMedicationsForContext(medications);
    
    const messages = [
      {
        role: 'system',
        content: `${MEDICAL_ASSISTANT_PROMPT}\n\nCurrent Patient Medications:\n${medicationsContext}`
      }
    ];
    
    history.forEach(exchange => {
      messages.push({ role: 'user', content: exchange.user });
      messages.push({ role: 'assistant', content: exchange.assistant });
    });
    
    messages.push({ role: 'user', content: message });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });
    
    const assistantResponse = completion.choices[0].message.content;
    
    const newExchange = {
      user: message,
      assistant: assistantResponse,
      timestamp: new Date().toISOString()
    };
    
    history.push(newExchange);
    
    if (history.length > MAX_HISTORY_LENGTH) {
      history.splice(0, history.length - MAX_HISTORY_LENGTH);
    }
    
    await saveConversationHistory(history);
    
    return {
      response: assistantResponse,
      history: history,
      success: true
    };
    
  } catch (error) {
    console.error('Error in chatWithMedicalAssistant:', error);
    
    const fallbackResponse = `I apologize, but I'm having trouble connecting to my medical knowledge base right now. Please try again in a moment, or if you have an urgent medical question, please contact your healthcare provider directly.`;
    
    return {
      response: fallbackResponse,
      history: await loadConversationHistory(),
      success: false,
      error: error.message
    };
  }
};

export const getConversationHistory = async () => {
  return await loadConversationHistory();
};

export const clearConversation = async () => {
  await clearConversationHistory();
  return { success: true, message: 'Conversation history cleared.' };
};

export const analyzeInteractions = async (medications) => {
  try {
    if (!Array.isArray(medications) || medications.length < 2) {
      return {
        response: 'Please provide at least two medications to analyze interactions.',
        success: false
      };
    }

    const medicationList = medications
      .map(med => `${med.name || 'Unknown'} (${med.dosage || 'No dosage specified'})`)
      .join(', ');

    const message = `Please analyze potential drug interactions between these medications: ${medicationList}. Include information about timing, contraindications, and any recommendations for safe administration.`;

    const result = await chatWithMedicalAssistant(message, medications);
    return result;

  } catch (error) {
    console.error('Error in analyzeInteractions:', error);
    return {
      response: 'An error occurred while analyzing interactions. Please try again or consult your healthcare provider.',
      success: false,
      error: error.message
    };
  }
};

export const getPersonalizedInsights = async (medications) => {
  try {
    if (!Array.isArray(medications) || medications.length === 0) {
      return {
        response: 'Please provide at least one medication to get personalized insights.',
        success: false
      };
    }

    const medicationList = medications
      .map(med => `${med.name || 'Unknown'} (${med.dosage || 'No dosage specified'})`)
      .join(', ');

    const message = `Please provide personalized insights and recommendations for managing these medications: ${medicationList}. Include timing advice, lifestyle recommendations, monitoring suggestions, and any potential side effects to watch for.`;

    const result = await chatWithMedicalAssistant(message, medications);
    return result;

  } catch (error) {
    console.error('Error in getPersonalizedInsights:', error);
    return {
      response: 'An error occurred while generating insights. Please try again or consult your healthcare provider.',
      success: false,
      error: error.message
    };
  }
};

export const askMedicationQuestion = async (question, medications) => {
  try {
    if (!question || typeof question !== 'string') {
      return {
        response: 'Please provide a valid question about your medications.',
        success: false
      };
    }

    const result = await chatWithMedicalAssistant(question, medications);
    return result;

  } catch (error) {
    console.error('Error in askMedicationQuestion:', error);
    return {
      response: 'An error occurred while processing your question. Please try again or consult your healthcare provider.',
      success: false,
      error: error.message
    };
  }
};

export const getHealthAdvice = async (topic, medications = []) => {
  try {
    const message = `Please provide comprehensive health and lifestyle advice about: ${topic}. Include practical tips, evidence-based recommendations, and how this relates to medication management if applicable.`;

    const result = await chatWithMedicalAssistant(message, medications);
    return result;

  } catch (error) {
    console.error('Error in getHealthAdvice:', error);
    return {
      response: 'An error occurred while generating health advice. Please try again.',
      success: false,
      error: error.message
    };
  }
};

export const assessEmergency = async (symptoms, medications = []) => {
  try {
    const message = `Please assess these symptoms and determine if immediate medical attention is needed: ${symptoms}. Consider the patient's current medications and provide clear guidance on whether to seek emergency care, urgent care, or if this can wait for a regular appointment.`;

    const result = await chatWithMedicalAssistant(message, medications);
    return result;

  } catch (error) {
    console.error('Error in assessEmergency:', error);
    return {
      response: 'If you are experiencing severe symptoms, please call emergency services immediately or go to the nearest emergency room. This AI assistant cannot provide emergency medical advice.',
      success: false,
      error: error.message
    };
  }
};

export const optimizeMedicationSchedule = async (medications) => {
  try {
    if (!Array.isArray(medications) || medications.length === 0) {
      return {
        response: 'Please provide your medications to optimize your schedule.',
        success: false
      };
    }

    const medicationList = medications
      .map(med => `${med.name || 'Unknown'} (${med.dosage || 'No dosage specified'}) - ${med.frequency || 'No frequency specified'}`)
      .join(', ');

    const message = `Please help optimize my medication schedule for these medications: ${medicationList}. Consider timing, food interactions, side effects, and provide a practical daily schedule that minimizes conflicts and maximizes effectiveness.`;

    const result = await chatWithMedicalAssistant(message, medications);
    return result;

  } catch (error) {
    console.error('Error in optimizeMedicationSchedule:', error);
    return {
      response: 'An error occurred while optimizing your medication schedule. Please try again or consult your healthcare provider.',
      success: false,
      error: error.message
    };
  }
};

// Side effect monitoring
export const monitorSideEffects = async (medication, symptoms, medications = []) => {
  try {
    const message = `I'm taking ${medication} and experiencing these symptoms: ${symptoms}. Are these likely side effects of the medication? Should I be concerned? What should I do?`;

    const result = await chatWithMedicalAssistant(message, medications);
    return result;

  } catch (error) {
    console.error('Error in monitorSideEffects:', error);
    return {
      response: 'An error occurred while analyzing side effects. If you are experiencing concerning symptoms, please contact your healthcare provider immediately.',
      success: false,
      error: error.message
    };
  }
};

// Export all functions
export default {
  chatWithMedicalAssistant,
  getConversationHistory,
  clearConversation,
  analyzeInteractions,
  getPersonalizedInsights,
  askMedicationQuestion,
  getHealthAdvice,
  assessEmergency,
  optimizeMedicationSchedule,
  monitorSideEffects
}; 