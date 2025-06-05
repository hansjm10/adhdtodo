// ABOUTME: Modal component for sending encouragement messages to accountability partners
// Provides quick encouragement options and custom message input

import React, { useState } from 'react';
import type { ViewStyle, TextStyle, ModalProps } from 'react-native';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_ENCOURAGEMENT_MESSAGES } from '../constants/UserConstants';
import NotificationService from '../services/NotificationService';
import PartnershipService from '../services/PartnershipService';
import type { Task } from '../types/task.types';
import type { User, Partnership } from '../types/user.types';

interface EncouragementModalProps extends Pick<ModalProps, 'visible'> {
  onClose: () => void;
  task?: Task | null;
  fromUser: User;
  toUser: User;
  partnership?: Partnership | null;
  onSuccess?: () => void;
}

const EncouragementModal = ({
  visible,
  onClose,
  task = null,
  fromUser,
  toUser,
  partnership,
  onSuccess = () => {},
}: EncouragementModalProps) => {
  const [customMessage, setCustomMessage] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSendEncouragement = async (): Promise<void> => {
    const message = customMessage || selectedMessage;
    if (!message || !fromUser || !toUser) return;

    setSending(true);

    try {
      const sent = await NotificationService.sendEncouragement(
        fromUser.id,
        toUser.id,
        message,
        task?.id,
      );

      if (sent && partnership) {
        await PartnershipService.incrementPartnershipStat(partnership.id, 'encouragementsSent');
      }

      onSuccess();
      resetModal();
      onClose();
    } catch (error) {
      // Error sending encouragement
    } finally {
      setSending(false);
    }
  };

  const resetModal = (): void => {
    setCustomMessage('');
    setSelectedMessage(null);
  };

  const renderQuickMessage = (message: string, index: number) => (
    <TouchableOpacity
      key={`encouragement-${index}`}
      style={[
        styles.quickMessageButton,
        selectedMessage === message && styles.quickMessageButtonSelected,
      ]}
      onPress={() => {
        setSelectedMessage(message);
        setCustomMessage('');
      }}
      disabled={sending}
    >
      <Text
        style={[
          styles.quickMessageText,
          selectedMessage === message && styles.quickMessageTextSelected,
        ]}
      >
        {message}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Encouragement</Text>
            <TouchableOpacity onPress={onClose} disabled={sending}>
              <Ionicons name="close" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>

          {task && (
            <View style={styles.taskInfo}>
              <Text style={styles.taskLabel}>For task:</Text>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {task.title}
              </Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Quick Messages</Text>
            <View style={styles.quickMessagesContainer}>
              {DEFAULT_ENCOURAGEMENT_MESSAGES.map((message, index) =>
                renderQuickMessage(message, index),
              )}
            </View>

            <Text style={styles.sectionTitle}>Or write your own</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Type your encouragement message..."
              placeholderTextColor="#BDC3C7"
              value={customMessage}
              onChangeText={(text) => {
                setCustomMessage(text);
                setSelectedMessage(null);
              }}
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!sending}
            />
            <Text style={styles.charCount}>{customMessage.length}/200</Text>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                ((!customMessage && !selectedMessage) || sending) && styles.sendButtonDisabled,
              ]}
              onPress={() => {
                handleSendEncouragement().catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to send encouragement:', error);
                  }
                });
              }}
              disabled={(!customMessage && !selectedMessage) || sending}
            >
              <Ionicons
                name="heart"
                size={20}
                color={(!customMessage && !selectedMessage) || sending ? '#BDC3C7' : 'white'}
              />
              <Text
                style={[
                  styles.sendButtonText,
                  ((!customMessage && !selectedMessage) || sending) &&
                    styles.sendButtonTextDisabled,
                ]}
              >
                {sending ? 'Sending...' : 'Send Encouragement'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface Styles {
  container: ViewStyle;
  backdrop: ViewStyle;
  modalContent: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  taskInfo: ViewStyle;
  taskLabel: TextStyle;
  taskTitle: TextStyle;
  sectionTitle: TextStyle;
  quickMessagesContainer: ViewStyle;
  quickMessageButton: ViewStyle;
  quickMessageButtonSelected: ViewStyle;
  quickMessageText: TextStyle;
  quickMessageTextSelected: TextStyle;
  customInput: TextStyle;
  charCount: TextStyle;
  footer: ViewStyle;
  sendButton: ViewStyle;
  sendButtonDisabled: ViewStyle;
  sendButtonText: TextStyle;
  sendButtonTextDisabled: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  taskInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  taskLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  quickMessagesContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickMessageButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  quickMessageButtonSelected: {
    backgroundColor: '#EBF5FB',
    borderColor: '#3498DB',
  },
  quickMessageText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  quickMessageTextSelected: {
    color: '#3498DB',
    fontWeight: '600',
  },
  customInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'right',
    marginTop: 4,
    marginRight: 20,
    marginBottom: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E74C3C',
    paddingVertical: 16,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sendButtonTextDisabled: {
    color: '#BDC3C7',
  },
});

export default EncouragementModal;
