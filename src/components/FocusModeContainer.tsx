// ABOUTME: Container component for FocusMode that manages state and data
// Connects FocusModeView with TaskContext and handles navigation

import React, { useState, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTasks } from '../contexts';
import FocusModeView from './FocusModeView';
import { Task } from '../types/task.types';

// Convert context's LegacyTask to Task
interface LegacyTask extends Omit<Task, 'completed' | 'createdAt' | 'updatedAt' | 'completedAt'> {
  isComplete: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

const legacyToTask = (legacy: LegacyTask): Task => ({
  ...legacy,
  completed: legacy.isComplete,
  createdAt: new Date(legacy.createdAt),
  updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : new Date(legacy.createdAt),
  completedAt: legacy.completedAt ? new Date(legacy.completedAt) : null,
});

export const FocusModeContainer: React.FC = () => {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<'hyperfocus' | 'scattered' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const { getPendingTasks } = useTasks();

  // Get pending tasks from context and convert to Task format
  const tasks = useMemo(() => {
    const legacyTasks = getPendingTasks();
    return legacyTasks.map(legacyToTask);
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
