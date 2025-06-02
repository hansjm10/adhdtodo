// ABOUTME: Container component for Hyperfocus mode managing timer logic
// Handles timer state, task updates, alerts and navigation

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTasks } from '../contexts';
import HyperfocusView from './HyperfocusView';
import { Task } from '../types/task.types';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

// Convert context's LegacyTask to Task
interface LegacyTask
  extends Omit<Task, 'completed' | 'createdAt' | 'updatedAt' | 'completedAt' | 'timeSpent'> {
  isComplete: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  timeSpent?: number;
}

const legacyToTask = (legacy: LegacyTask): Task => ({
  ...legacy,
  completed: legacy.isComplete,
  createdAt: new Date(legacy.createdAt),
  updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : new Date(legacy.createdAt),
  completedAt: legacy.completedAt ? new Date(legacy.completedAt) : null,
  timeSpent: legacy.timeSpent || 0,
});

export const HyperfocusContainer: React.FC = () => {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { tasks, updateTask } = useTasks();

  const [timeLeft, setTimeLeft] = useState<number>(WORK_DURATION);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find the task from context and convert to Task format
  const task = useMemo(() => {
    const legacyTask = tasks.find((t) => t.id === taskId);
    return legacyTask ? legacyToTask(legacyTask) : null;
  }, [tasks, taskId]);

  const updateTaskTimeSpent = useCallback(async (): Promise<void> => {
    if (!task) return;

    try {
      const legacyTask = tasks.find((t) => t.id === taskId);
      await updateTask(task.id, {
        timeSpent: (legacyTask?.timeSpent || 0) + Math.round(WORK_DURATION / 60),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update task progress.');
    }
  }, [task, tasks, taskId, updateTask]);

  const handleTimerComplete = useCallback((): void => {
    // Platform-specific vibration handling
    if (Platform.OS !== 'web' && Vibration?.vibrate) {
      if (Platform.OS === 'android') {
        Vibration.vibrate(100);
      } else if (Platform.OS === 'ios') {
        Vibration.vibrate();
      }
    }
    setIsRunning(false);

    if (isBreak) {
      Alert.alert('Break Over!', 'Ready to focus again?', [
        {
          text: 'Start Working',
          onPress: () => {
            setIsBreak(false);
            setTimeLeft(WORK_DURATION);
            setIsRunning(true);
          },
        },
        { text: 'Exit', onPress: () => router.back() },
      ]);
    } else {
      setSessionCount((prev) => prev + 1);
      updateTaskTimeSpent();
      Alert.alert('Great Work!', 'Time for a break. You deserve it!', [
        {
          text: 'Take Break',
          onPress: () => {
            setIsBreak(true);
            setTimeLeft(BREAK_DURATION);
            setIsRunning(true);
          },
        },
        { text: 'Skip Break', onPress: () => setTimeLeft(WORK_DURATION) },
        { text: 'Exit', onPress: () => router.back() },
      ]);
    }
  }, [isBreak, router, updateTaskTimeSpent]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handleTimerComplete]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? BREAK_DURATION : WORK_DURATION);
  };

  const handleExit = () => {
    if (isRunning) {
      Alert.alert('Exit Hyperfocus Mode?', 'Your progress will be saved.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  return (
    <HyperfocusView
      task={task}
      timeLeft={timeLeft}
      isRunning={isRunning}
      isBreak={isBreak}
      sessionCount={sessionCount}
      onStart={handleStart}
      onPause={handlePause}
      onReset={handleReset}
      onExit={handleExit}
    />
  );
};

export default HyperfocusContainer;
