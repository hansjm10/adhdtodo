// ABOUTME: Screen for editing existing tasks with ADHD-friendly UI
// Provides form inputs to modify task details and delete functionality

import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import type { TaskCategory, TimePreset, Task } from '../../src/types/task.types';
import { TASK_CATEGORIES, TIME_PRESETS } from '../../src/types/task.types';
import { useTasks } from '../../src/contexts';

const EditTaskScreen = () => {
  const router = useRouter();
  const { id, task: taskParam } = useLocalSearchParams<{ id: string; task?: string }>();
  const { updateTask, deleteTask, tasks } = useTasks();

  const [loading, setLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTimePreset, setSelectedTimePreset] = useState<number | null>(null);

  // Find the task from the context or parse from params
  const task = React.useMemo(() => {
    // First try to find task in context
    const foundTask = tasks.find((t) => t.id === id);
    if (foundTask) {
      return foundTask;
    }

    // Otherwise try to parse from params
    if (taskParam) {
      try {
        const parsed = JSON.parse(taskParam) as {
          id: string;
          title: string;
          completed: boolean;
          category: string | null;
          timeEstimate: number | null;
          description?: string;
          createdAt: string;
          updatedAt: string;
          completedAt?: string | null;
          dueDate?: string | null;
          preferredStartTime?: string | null;
          startedAt?: string | null;
          partnerId?: string | null;
          urgency?: string | null;
          actualTimeSpent?: number | null;
          completionEnergy?: string | null;
          steps?: Array<{ id: string; title: string; completed: boolean }>;
          tags?: string[];
          progress?: number;
        };
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : null,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          preferredStartTime: parsed.preferredStartTime
            ? new Date(parsed.preferredStartTime)
            : null,
          startedAt: parsed.startedAt ? new Date(parsed.startedAt) : null,
        } as Task;
      } catch (e) {
        console.error('Failed to parse task from params:', e);
      }
    }

    return null;
  }, [id, taskParam, tasks]);

  // Initialize form with task data
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setSelectedCategory(task.category);
      setSelectedTimePreset(task.timeEstimate);
    }
  }, [task]);

  const handleSave = (): void => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!task) {
      Alert.alert('Error', 'Task not found');
      return;
    }

    setLoading(true);
    const doUpdate = async (): Promise<void> => {
      try {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          category: selectedCategory,
          timeEstimate: selectedTimePreset,
        });
        router.back();
      } catch (error) {
        Alert.alert('Error', 'Failed to update task. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    doUpdate().catch(() => {
      // Error already handled in the function
    });
  };

  const handleDelete = (): void => {
    if (!task) {
      Alert.alert('Error', 'Task not found');
      return;
    }

    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: (): void => {
          const doDelete = async (): Promise<void> => {
            setLoading(true);
            try {
              await deleteTask(task.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            } finally {
              setLoading(false);
            }
          };
          doDelete().catch(() => {
            // Error already handled in the function
          });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Task not found</Text>
      </View>
    );
  }

  const isSaveDisabled = !title.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Task Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Task title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Task description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={500}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer} testID="category-selector">
            {Object.values(TASK_CATEGORIES).map((category: TaskCategory) => (
              <TouchableOpacity
                key={category.id}
                testID={`category-${category.id}`}
                style={[
                  styles.categoryButton,
                  { backgroundColor: category.color },
                  selectedCategory === category.id && styles.selectedCategory,
                ]}
                onPress={() => {
                  setSelectedCategory(category.id);
                }}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryText}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Time Estimate</Text>
          <View style={styles.timeContainer} testID="time-preset-selector">
            {TIME_PRESETS.map((preset: TimePreset) => (
              <TouchableOpacity
                key={preset.minutes}
                testID={`time-preset-${preset.minutes}`}
                style={[
                  styles.timeButton,
                  selectedTimePreset === preset.minutes && styles.selectedTime,
                ]}
                onPress={() => {
                  setSelectedTimePreset(preset.minutes);
                }}
              >
                <Text style={styles.timeText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} testID="delete-button">
          <Text style={styles.deleteButtonText}>Delete Task</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, isSaveDisabled && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaveDisabled}
          testID="save-button"
        >
          <Text style={styles.saveButtonText}>Update Task</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

interface Styles {
  container: ViewStyle;
  scrollView: ViewStyle;
  formContainer: ViewStyle;
  loadingContainer: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  label: TextStyle;
  input: TextStyle;
  textArea: TextStyle;
  categoryContainer: ViewStyle;
  categoryButton: ViewStyle;
  selectedCategory: ViewStyle;
  categoryIcon: TextStyle;
  categoryText: TextStyle;
  timeContainer: ViewStyle;
  timeButton: ViewStyle;
  selectedTime: ViewStyle;
  timeText: TextStyle;
  buttonContainer: ViewStyle;
  saveButton: ViewStyle;
  disabledButton: ViewStyle;
  saveButtonText: TextStyle;
  deleteButton: ViewStyle;
  deleteButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    opacity: 0.6,
  },
  selectedCategory: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#333',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
    opacity: 0.6,
  },
  selectedTime: {
    backgroundColor: '#4ECDC4',
    opacity: 1,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default EditTaskScreen;
