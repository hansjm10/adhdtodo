// ABOUTME: Mac-inspired task assignment screen using NativeWind
// Clean interface for partners to assign tasks with details and priority

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';
import {
  ThemedText,
  ThemedContainer,
  ThemedButton,
  ThemedIcon,
  ThemedInput,
} from '../../../src/components/themed';
import { createTask, validateTask } from '../../../src/utils/TaskModel';
import { TASK_PRIORITY, TASK_CATEGORIES } from '../../../src/constants/TaskConstants';
import { getCategoryBgStyle, getTextColorStyle } from '../../../src/styles/dynamicStyles';
import TaskStorageService from '../../../src/services/TaskStorageService';
import UserStorageService from '../../../src/services/UserStorageService';
import PartnershipService from '../../../src/services/PartnershipService';
import NotificationService from '../../../src/services/NotificationService';
import type { TaskPriority, TaskCategory } from '../../../src/types/task.types';
import type { User, Partnership } from '../../../src/types/user.types';

interface PriorityButtonProps {
  value: TaskPriority;
  label: string;
  icon: string;
  color: string;
}

interface TimeEstimateButtonProps {
  minutes: number;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const PriorityButton = ({
  value: _value,
  label,
  icon,
  color,
  isActive,
  onPress,
}: PriorityButtonProps & { isActive: boolean; onPress: () => void }) => (
  <TouchableOpacity
    className={`flex-1 items-center p-3 mx-1 rounded-xl bg-white border ${isActive ? 'border-transparent' : 'border-neutral-200'}`}
    style={isActive ? getCategoryBgStyle(color) : {}}
    onPress={onPress}
  >
    <ThemedIcon name={icon as keyof typeof Ionicons.glyphMap} size="md" color="primary" />
    <ThemedText
      variant="caption"
      className="mt-1"
      style={getTextColorStyle(isActive ? color : '#7F8C8D')}
    >
      {label}
    </ThemedText>
  </TouchableOpacity>
);

const TimeEstimateButton = ({
  minutes: _minutes,
  label,
  isActive,
  onPress,
}: TimeEstimateButtonProps) => (
  <TouchableOpacity
    className={`px-5 py-2.5 rounded-full mr-2.5 mb-2.5 border ${isActive ? 'bg-primary-500 border-primary-500' : 'bg-white border-neutral-200'}`}
    onPress={onPress}
  >
    <ThemedText variant="body" color={isActive ? 'white' : 'tertiary'} weight="medium">
      {label}
    </ThemedText>
  </TouchableOpacity>
);

const TaskAssignmentScreen = () => {
  const router = useRouter();
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(TASK_PRIORITY.MEDIUM);
  const [category, setCategory] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [preferredStartTime, setPreferredStartTime] = useState<Date | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState<boolean>(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState<boolean>(false);
  const [timeEstimate, setTimeEstimate] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);

  const loadUserData = useCallback(async (): Promise<void> => {
    try {
      const user = await UserStorageService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        const activePartnership = await PartnershipService.getActivePartnership(user.id);
        setPartnership(activePartnership);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data');
    }
  }, []);

  useEffect(() => {
    loadUserData().catch(() => {});
  }, [loadUserData]);

  const handleAssignTask = async (): Promise<void> => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!partnership) {
      Alert.alert('Error', 'No active partnership found');
      return;
    }

    if (!currentUser) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);

    try {
      // Determine the assignee (the ADHD user in the partnership)
      const assignedTo =
        partnership.adhdUserId === currentUser.id ? partnership.partnerId : partnership.adhdUserId;

      if (!assignedTo) {
        Alert.alert('Error', 'Partnership user not found');
        return;
      }

      // Create the task
      const newTask = createTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        timeEstimate,
        assignedBy: currentUser.id,
        assignedTo,
        dueDate,
        preferredStartTime,
      });

      // Validate the task
      const validation = validateTask(newTask);
      if (!validation.isValid) {
        Alert.alert('Error', validation.errors.join('\n'));
        setLoading(false);
        return;
      }

      // Save the task
      const saved = await TaskStorageService.saveTask(newTask);
      if (!saved) {
        throw new Error('Failed to save task');
      }

      // Send notification to the ADHD user
      const assignedUser = await UserStorageService.getUserById(assignedTo);
      if (assignedUser) {
        await NotificationService.notifyTaskAssigned(newTask, currentUser);
      }

      // Update partnership stats
      await PartnershipService.incrementPartnershipStat(partnership.id, 'tasksAssigned');

      Alert.alert('Task Assigned!', `"${title}" has been assigned successfully.`, [
        {
          text: 'Assign Another',
          onPress: () => {
            resetForm();
          },
        },
        {
          text: 'Done',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to assign task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (): void => {
    setTitle('');
    setDescription('');
    setPriority(TASK_PRIORITY.MEDIUM);
    setCategory(null);
    setDueDate(null);
    setPreferredStartTime(null);
    setTimeEstimate(30);
  };

  const handleDueDateChange = (event: DateTimePickerEvent, selectedDate?: Date): void => {
    setShowDueDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date): void => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      setPreferredStartTime(selectedTime);
    }
  };

  return (
    <ThemedContainer variant="screen" safeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-5 bg-white border-b border-neutral-200">
            <TouchableOpacity
              onPress={() => {
                router.back();
              }}
            >
              <ThemedIcon name="close" size="lg" color="primary" />
            </TouchableOpacity>
            <ThemedText variant="h3" color="primary" weight="bold">
              Assign Task
            </ThemedText>
            <View className="w-7" />
          </View>

          {/* Form */}
          <View className="p-5">
            {/* Task Title */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Task Title *
              </ThemedText>
              <ThemedInput
                placeholder="What needs to be done?"
                value={title}
                onChangeText={setTitle}
                editable={!loading}
              />
            </View>

            {/* Description */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Description
              </ThemedText>
              <ThemedInput
                placeholder="Add helpful details or context..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                editable={!loading}
                className="min-h-[80px]"
                textAlignVertical="top"
              />
            </View>

            {/* Priority */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Priority
              </ThemedText>
              <View className="flex-row">
                <PriorityButton
                  value={TASK_PRIORITY.LOW}
                  label="Low"
                  icon="flag-outline"
                  color="#27AE60"
                  isActive={priority === TASK_PRIORITY.LOW}
                  onPress={() => {
                    setPriority(TASK_PRIORITY.LOW);
                  }}
                />
                <PriorityButton
                  value={TASK_PRIORITY.MEDIUM}
                  label="Medium"
                  icon="flag-outline"
                  color="#F39C12"
                  isActive={priority === TASK_PRIORITY.MEDIUM}
                  onPress={() => {
                    setPriority(TASK_PRIORITY.MEDIUM);
                  }}
                />
                <PriorityButton
                  value={TASK_PRIORITY.HIGH}
                  label="High"
                  icon="flag"
                  color="#E74C3C"
                  isActive={priority === TASK_PRIORITY.HIGH}
                  onPress={() => {
                    setPriority(TASK_PRIORITY.HIGH);
                  }}
                />
                <PriorityButton
                  value={TASK_PRIORITY.URGENT}
                  label="Urgent"
                  icon="warning"
                  color="#C0392B"
                  isActive={priority === TASK_PRIORITY.URGENT}
                  onPress={() => {
                    setPriority(TASK_PRIORITY.URGENT);
                  }}
                />
              </View>
            </View>

            {/* Time Estimate */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Time Estimate
              </ThemedText>
              <View className="flex-row flex-wrap">
                <TimeEstimateButton
                  minutes={5}
                  label="5 min"
                  isActive={timeEstimate === 5}
                  onPress={() => {
                    setTimeEstimate(5);
                  }}
                />
                <TimeEstimateButton
                  minutes={15}
                  label="15 min"
                  isActive={timeEstimate === 15}
                  onPress={() => {
                    setTimeEstimate(15);
                  }}
                />
                <TimeEstimateButton
                  minutes={30}
                  label="30 min"
                  isActive={timeEstimate === 30}
                  onPress={() => {
                    setTimeEstimate(30);
                  }}
                />
                <TimeEstimateButton
                  minutes={60}
                  label="1 hour"
                  isActive={timeEstimate === 60}
                  onPress={() => {
                    setTimeEstimate(60);
                  }}
                />
                <TimeEstimateButton
                  minutes={120}
                  label="2 hours"
                  isActive={timeEstimate === 120}
                  onPress={() => {
                    setTimeEstimate(120);
                  }}
                />
              </View>
            </View>

            {/* Due Date */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Due Date
              </ThemedText>
              <TouchableOpacity
                className="flex-row items-center bg-white border border-neutral-200 rounded-xl p-4"
                onPress={() => {
                  setShowDueDatePicker(true);
                }}
              >
                <ThemedIcon name="calendar-outline" size="sm" color="tertiary" />
                <ThemedText variant="body" color="primary" className="ml-2.5">
                  {dueDate ? dueDate.toLocaleDateString() : 'Set due date'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Preferred Start Time */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Preferred Start Time
              </ThemedText>
              <TouchableOpacity
                className="flex-row items-center bg-white border border-neutral-200 rounded-xl p-4"
                onPress={() => {
                  setShowStartTimePicker(true);
                }}
              >
                <ThemedIcon name="time-outline" size="sm" color="tertiary" />
                <ThemedText variant="body" color="primary" className="ml-2.5">
                  {preferredStartTime
                    ? preferredStartTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Suggest a start time'}
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <View className="mb-6">
              <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
                Category
              </ThemedText>
              <View className="flex-row">
                {Object.values(TASK_CATEGORIES).map((cat: TaskCategory) => (
                  <TouchableOpacity
                    key={cat.id}
                    className={`flex-1 items-center p-3 mx-1 rounded-xl bg-white border ${category === cat.id ? 'border-transparent' : 'border-neutral-200'}`}
                    style={category === cat.id ? getCategoryBgStyle(cat.color) : {}}
                    onPress={() => {
                      setCategory(category === cat.id ? null : cat.id);
                    }}
                  >
                    <ThemedText variant="h3" className="mb-1">
                      {cat.icon}
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      style={getTextColorStyle(category === cat.id ? cat.color : '#7F8C8D')}
                    >
                      {cat.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Assign Button */}
            <View className="mt-5">
              <ThemedButton
                label={loading ? 'Assigning...' : 'Assign Task'}
                variant="primary"
                size="large"
                fullWidth
                onPress={() => {
                  handleAssignTask().catch(() => {});
                }}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>

        {showDueDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={handleDueDateChange}
          />
        )}

        {showStartTimePicker && (
          <DateTimePicker
            value={preferredStartTime ?? new Date()}
            mode="time"
            display="default"
            onChange={handleStartTimeChange}
          />
        )}
      </KeyboardAvoidingView>
    </ThemedContainer>
  );
};

export default TaskAssignmentScreen;
