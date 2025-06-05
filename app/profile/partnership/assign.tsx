// ABOUTME: Screen for accountability partners to assign tasks to ADHD users
// Includes task details, due dates, preferred start times, and priority settings

import React, { useState, useEffect, useCallback } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createTask, validateTask } from '../../../src/utils/TaskModel';
import { TASK_PRIORITY, TASK_CATEGORIES } from '../../../src/constants/TaskConstants';
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
    style={[styles.priorityButton, isActive && { backgroundColor: `${color}20` }]}
    onPress={onPress}
  >
    <Ionicons
      name={icon as keyof typeof Ionicons.glyphMap}
      size={24}
      color={isActive ? color : '#BDC3C7'}
    />
    <Text style={[styles.priorityLabel, isActive && { color }]}>{label}</Text>
  </TouchableOpacity>
);

const TimeEstimateButton = ({
  minutes: _minutes,
  label,
  isActive,
  onPress,
}: TimeEstimateButtonProps) => (
  <TouchableOpacity
    style={[styles.timeButton, isActive && styles.timeButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.timeButtonText, isActive && styles.timeButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  headerSpacer: ViewStyle;
  form: ViewStyle;
  inputGroup: ViewStyle;
  label: TextStyle;
  input: TextStyle;
  textArea: TextStyle;
  priorityContainer: ViewStyle;
  priorityButton: ViewStyle;
  priorityLabel: TextStyle;
  timeContainer: ViewStyle;
  timeButton: ViewStyle;
  timeButtonActive: ViewStyle;
  timeButtonText: TextStyle;
  timeButtonTextActive: TextStyle;
  dateButton: ViewStyle;
  dateButtonText: TextStyle;
  categoryContainer: ViewStyle;
  categoryButton: ViewStyle;
  categoryIcon: TextStyle;
  categoryLabel: TextStyle;
  assignButton: ViewStyle;
  assignButtonDisabled: ViewStyle;
  assignButtonText: TextStyle;
}

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
          >
            <Ionicons name="close" size={28} color="#2C3E50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Assign Task</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What needs to be done?"
              placeholderTextColor="#BDC3C7"
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add helpful details or context..."
              placeholderTextColor="#BDC3C7"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.priorityContainer}>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time Estimate</Text>
            <View style={styles.timeContainer}>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                setShowDueDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={20} color="#7F8C8D" />
              <Text style={styles.dateButtonText}>
                {dueDate ? dueDate.toLocaleDateString() : 'Set due date'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Preferred Start Time</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                setShowStartTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={20} color="#7F8C8D" />
              <Text style={styles.dateButtonText}>
                {preferredStartTime
                  ? preferredStartTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Suggest a start time'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryContainer}>
              {Object.values(TASK_CATEGORIES).map((cat: TaskCategory) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    category === cat.id && { backgroundColor: `${cat.color}20` },
                  ]}
                  onPress={() => {
                    setCategory(category === cat.id ? null : cat.id);
                  }}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, category === cat.id && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.assignButton, loading && styles.assignButtonDisabled]}
            onPress={() => {
              handleAssignTask().catch(() => {});
            }}
            disabled={loading}
          >
            <Text style={styles.assignButtonText}>{loading ? 'Assigning...' : 'Assign Task'}</Text>
          </TouchableOpacity>
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
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerSpacer: {
    width: 28,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  priorityLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#7F8C8D',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  timeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
    marginBottom: 10,
  },
  timeButtonActive: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  timeButtonText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  timeButtonTextActive: {
    color: 'white',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  assignButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  assignButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  assignButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TaskAssignmentScreen;
