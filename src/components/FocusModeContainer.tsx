// ABOUTME: Container component for FocusMode that manages state and data
// Connects FocusModeView with TaskContext and handles navigation

import React, { useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTasks } from '../contexts';
import FocusModeView from './FocusModeView';
import type { Task } from '../types/task.types';

export const FocusModeContainer: React.FC = () => {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'hyperfocus' | 'scattered' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { getPendingTasks } = useTasks();

  // Get pending tasks from context
  const tasks = useMemo(() => {
    return getPendingTasks();
  }, [getPendingTasks]);

  const handleStartPress = () => {
    if (!selectedTask) {
      Alert.alert('Select a Task', 'Please select a task first');
      return;
    }

    if (selectedMode === 'hyperfocus') {
      router.push({
        pathname: '/(tabs)/hyperfocus',
        params: { taskId: selectedTask.id },
      });
    } else if (selectedMode === 'scattered') {
      router.push('/(tabs)/scattered');
    }
  };

  return (
    <FocusModeView
      tasks={tasks}
      selectedMode={selectedMode}
      selectedTask={selectedTask}
      onModeSelect={setSelectedMode}
      onTaskSelect={setSelectedTask}
      onStartPress={handleStartPress}
    />
  );
};

export default FocusModeContainer;
