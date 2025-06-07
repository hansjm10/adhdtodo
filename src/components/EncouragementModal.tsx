// ABOUTME: Mac-inspired encouragement modal using NativeWind
// Clean modal for sending encouragement messages to accountability partners

import React, { useState } from 'react';
import type { ModalProps } from 'react-native';
import {
  Modal,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ThemedText, ThemedInput, ThemedButton, ThemedIcon } from './themed';
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
      className={`px-4 py-2.5 rounded-full border mb-2 ${selectedMessage === message ? 'bg-primary-50 border-primary-500' : 'bg-neutral-50 border-neutral-200'}`}
      onPress={() => {
        setSelectedMessage(message);
        setCustomMessage('');
      }}
      disabled={sending}
    >
      <ThemedText
        variant="caption"
        color={selectedMessage === message ? 'primary' : 'secondary'}
        weight={selectedMessage === message ? 'semibold' : 'medium'}
      >
        {message}
      </ThemedText>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <TouchableOpacity className="flex-1 bg-black/50" activeOpacity={1} onPress={onClose} />

        <View
          className={`bg-white rounded-t-xl max-h-4/5 ${Platform.OS === 'ios' ? 'pb-[34px]' : ''}`}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-5 border-b border-neutral-200">
            <ThemedText variant="h4" color="primary">
              Send Encouragement
            </ThemedText>
            <TouchableOpacity onPress={onClose} disabled={sending} className="p-1">
              <ThemedIcon name="close" size="md" color="primary" />
            </TouchableOpacity>
          </View>

          {/* Task Info */}
          {task && (
            <View className="px-5 py-3 bg-neutral-50 border-b border-neutral-200">
              <ThemedText variant="caption" color="tertiary" className="mb-1">
                For task:
              </ThemedText>
              <ThemedText variant="body" color="primary" weight="semibold" numberOfLines={2}>
                {task.title}
              </ThemedText>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Quick Messages */}
            <ThemedText variant="body" color="primary" weight="semibold" className="mt-5 mb-3 px-5">
              Quick Messages
            </ThemedText>
            <View className="px-5 flex-row flex-wrap gap-2">
              {DEFAULT_ENCOURAGEMENT_MESSAGES.map((message, index) =>
                renderQuickMessage(message, index),
              )}
            </View>

            {/* Custom Message */}
            <ThemedText variant="body" color="primary" weight="semibold" className="mt-5 mb-3 px-5">
              Or write your own
            </ThemedText>
            <ThemedInput
              placeholder="Type your encouragement message..."
              value={customMessage}
              onChangeText={(text) => {
                setCustomMessage(text);
                setSelectedMessage(null);
              }}
              multiline
              numberOfLines={3}
              maxLength={200}
              editable={!sending}
              className="mx-5 min-h-[80px] align-top"
            />
            <ThemedText variant="caption" color="tertiary" align="right" className="mt-1 mr-5 mb-5">
              {customMessage.length}/200
            </ThemedText>
          </ScrollView>

          {/* Footer */}
          <View className="p-5 border-t border-neutral-200">
            <ThemedButton
              label={sending ? 'Sending...' : 'Send Encouragement'}
              variant="danger"
              size="large"
              fullWidth
              disabled={(!customMessage && !selectedMessage) || sending}
              onPress={() => {
                handleSendEncouragement().catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to send encouragement:', error);
                  }
                });
              }}
              icon={<ThemedIcon name="heart" size="sm" color="white" />}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default EncouragementModal;
