// ABOUTME: Container component for Hyperfocus mode managing timer logic
// Handles timer state, task updates, alerts and navigation

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Alert, Vibration, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTasks } from '../contexts';
import HyperfocusView from './HyperfocusView';
import SettingsService from '../services/SettingsService';

const DEFAULT_WORK_DURATION = 25 * 60; // 25 minutes in seconds
const DEFAULT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds

export const HyperfocusContainer: React.FC = () => {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const { tasks, updateTask } = useTasks();

  const [workDuration, setWorkDuration] = useState<number>(DEFAULT_WORK_DURATION);
  const [breakDuration, setBreakDuration] = useState<number>(DEFAULT_BREAK_DURATION);
  const [longBreakDuration, setLongBreakDuration] = useState<number>(15 * 60);
  const [longBreakAfter, setLongBreakAfter] = useState<number>(4);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_WORK_DURATION);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await SettingsService.loadSettings();
      const pomodoroSettings = settings.pomodoro;

      const workSec = pomodoroSettings.workDuration * 60;
      const breakSec = pomodoroSettings.breakDuration * 60;
      const longBreakSec = pomodoroSettings.longBreakDuration * 60;

      setWorkDuration(workSec);
      setBreakDuration(breakSec);
      setLongBreakDuration(longBreakSec);
      setLongBreakAfter(pomodoroSettings.longBreakAfter);
      setTimeLeft(workSec);
    };

    loadSettings();
  }, []);

  // Find the task from context
  const task = useMemo(() => {
    return tasks.find((t) => t.id === taskId) || null;
  }, [tasks, taskId]);

  const updateTaskTimeSpent = useCallback(async (): Promise<void> => {
    if (!task) return;

    try {
      await updateTask(task.id, {
        timeSpent: (task.timeSpent || 0) + Math.round(workDuration / 60),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update task progress.');
    }
  }, [task, updateTask, workDuration]);

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
            setTimeLeft(workDuration);
            setIsRunning(true);
          },
        },
        { text: 'Exit', onPress: () => { router.back(); } },
      ]);
    } else {
      setSessionCount((prev) => prev + 1);
      updateTaskTimeSpent();
      Alert.alert('Great Work!', 'Time for a break. You deserve it!', [
        {
          text: 'Take Break',
          onPress: () => {
            setIsBreak(true);
            // Use long break if it's time
            const nextBreakDuration =
              sessionCount > 0 && sessionCount % longBreakAfter === 0
                ? longBreakDuration
                : breakDuration;
            setTimeLeft(nextBreakDuration);
            setIsRunning(true);
          },
        },
        { text: 'Skip Break', onPress: () => { setTimeLeft(workDuration); } },
        { text: 'Exit', onPress: () => { router.back(); } },
      ]);
    }
  }, [
    isBreak,
    router,
    updateTaskTimeSpent,
    workDuration,
    breakDuration,
    longBreakDuration,
    longBreakAfter,
    sessionCount,
  ]);

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
    setTimeLeft(isBreak ? breakDuration : workDuration);
  };

  const handleExit = () => {
    if (isRunning) {
      Alert.alert('Exit Hyperfocus Mode?', 'Your progress will be saved.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', onPress: () => { router.back(); } },
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
