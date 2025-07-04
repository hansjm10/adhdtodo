// ABOUTME: Container component for CreateTask that manages form state
// Handles task creation logic and navigation

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUser, useTasks } from '../contexts';
import CreateTaskView from './CreateTaskView';
import { createTask } from '../utils/TaskModel';

export const CreateTaskContainer: React.FC = () => {
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { user } = useUser();
  const { addTask } = useTasks();

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(category ?? null);
  const [selectedTimePreset, setSelectedTimePreset] = useState<number | null>(null);

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      timeEstimate: selectedTimePreset,
      userId: user.id,
    };

    try {
      const newTask = createTask(taskData);
      await addTask(newTask);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <CreateTaskView
      title={title}
      description={description}
      selectedCategory={selectedCategory}
      selectedTimePreset={selectedTimePreset}
      onTitleChange={setTitle}
      onDescriptionChange={setDescription}
      onCategorySelect={setSelectedCategory}
      onTimePresetSelect={setSelectedTimePreset}
      onSave={() => {
        handleSave().catch((error) => {
          if (global.__DEV__) {
            console.error('Failed to save task:', error);
          }
        });
      }}
      onCancel={handleCancel}
    />
  );
};

export default CreateTaskContainer;
