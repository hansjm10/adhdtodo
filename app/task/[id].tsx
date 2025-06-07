// ABOUTME: Mac-inspired task editing screen using NativeWind
// Clean interface for modifying task details with ADHD-friendly design

import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ThemedText,
  ThemedContainer,
  ThemedButton,
  ThemedInput,
} from '../../src/components/themed';
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
      <ThemedContainer variant="screen" safeArea centered>
        <ActivityIndicator size="large" color="#3498DB" />
      </ThemedContainer>
    );
  }

  if (!task) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <View className="p-5">
          <ThemedText variant="h3" color="secondary">
            Task not found
          </ThemedText>
        </View>
      </ThemedContainer>
    );
  }

  const isSaveDisabled = !title.trim();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
            Task Title
          </ThemedText>
          <ThemedInput
            placeholder="Task title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            className="mb-5"
          />

          <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
            Description
          </ThemedText>
          <ThemedInput
            placeholder="Task description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={500}
            className="min-h-[80px] mb-5"
            inputClassName="align-top"
          />

          <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
            Category
          </ThemedText>
          <View className="flex-row justify-between mb-5" testID="category-selector">
            {Object.values(TASK_CATEGORIES).map((category: TaskCategory) => (
              <TouchableOpacity
                key={category.id}
                testID={`category-${category.id}`}
                className={`flex-1 items-center p-3 mx-1 rounded-xl border-2 ${selectedCategory === category.id ? 'opacity-100 border-neutral-900' : 'opacity-60 border-transparent'}`}
                style={{ backgroundColor: category.color }}
                onPress={() => {
                  setSelectedCategory(category.id);
                }}
              >
                <ThemedText variant="h3" className="mb-1">
                  {category.icon}
                </ThemedText>
                <ThemedText variant="caption" color="white" weight="semibold">
                  {category.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          <ThemedText variant="body" color="primary" weight="semibold" className="mb-2">
            Time Estimate
          </ThemedText>
          <View className="flex-row flex-wrap mb-5" testID="time-preset-selector">
            {TIME_PRESETS.map((preset: TimePreset) => (
              <TouchableOpacity
                key={preset.minutes}
                testID={`time-preset-${preset.minutes}`}
                className={`px-5 py-2.5 rounded-full mr-2.5 mb-2.5 ${selectedTimePreset === preset.minutes ? 'bg-primary-500 opacity-100' : 'bg-neutral-200 opacity-60'}`}
                onPress={() => {
                  setSelectedTimePreset(preset.minutes);
                }}
              >
                <ThemedText
                  variant="body"
                  color={selectedTimePreset === preset.minutes ? 'white' : 'primary'}
                  weight="medium"
                >
                  {preset.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="flex-row p-5 bg-white border-t border-neutral-200 gap-3">
        <View className="flex-1">
          <ThemedButton
            label="Delete Task"
            variant="danger"
            size="large"
            fullWidth
            onPress={handleDelete}
            testID="delete-button"
          />
        </View>

        <View className="flex-1">
          <ThemedButton
            label="Update Task"
            variant="primary"
            size="large"
            fullWidth
            onPress={handleSave}
            disabled={isSaveDisabled}
            testID="save-button"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default EditTaskScreen;
