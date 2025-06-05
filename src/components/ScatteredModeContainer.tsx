// ABOUTME: Container component for ScatteredMode that manages state and logic
// Handles task filtering, completion tracking, and navigation

import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTasks } from '../contexts';
import ScatteredModeView from './ScatteredModeView';
import RewardService from '../services/RewardService';

export const ScatteredModeContainer: React.FC = () => {
  const router = useRouter();
  const { getPendingTasks, updateTask } = useTasks();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  // Get quick tasks from context
  const quickTasks = useMemo(() => {
    const pendingTasks = getPendingTasks();
    return pendingTasks.filter(
      (task) => task.timeEstimate && task.timeEstimate <= 15 && !task.completed,
    );
  }, [getPendingTasks]);

  useEffect(() => {
    if (quickTasks.length === 0) {
      Alert.alert(
        'No Quick Tasks Available',
        'Add some tasks with 5-15 minute time estimates to use Scattered Mode.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    }
  }, [quickTasks.length, router]);

  const handleCompleteTask = async () => {
    if (currentTaskIndex >= quickTasks.length) return;

    const task = quickTasks[currentTaskIndex];
    const xp = RewardService.calculateTaskXP(task);

    try {
      await updateTask(task.id, {
        completed: true,
        completedAt: new Date(),
        xpEarned: xp,
      });
      await RewardService.updateStreak();

      setCompletedCount((prev) => prev + 1);
      setTotalXP((prev) => prev + xp);

      // Move to next task
      if (currentTaskIndex < quickTasks.length - 1) {
        setCurrentTaskIndex((prev) => prev + 1);
      } else {
        // All tasks completed
        Alert.alert(
          'Great Job! 🎉',
          `You completed ${completedCount + 1} tasks and earned ${totalXP + xp} XP!`,
          [
            {
              text: 'Awesome!',
              onPress: () => {
                router.back();
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  const handleSkipTask = () => {
    if (currentTaskIndex < quickTasks.length - 1) {
      setCurrentTaskIndex((prev) => prev + 1);
    } else {
      // Wrap around to first task
      setCurrentTaskIndex(0);
    }
  };

  const handleExit = () => {
    if (completedCount > 0) {
      Alert.alert(
        'Exit Scattered Mode?',
        `You've completed ${completedCount} tasks. Your progress will be saved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Exit',
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } else {
      router.back();
    }
  };

  const currentTask = quickTasks[currentTaskIndex] || null;

  return (
    <ScatteredModeView
      currentTask={currentTask}
      taskIndex={currentTaskIndex}
      totalTasks={quickTasks.length}
      completedCount={completedCount}
      totalXP={totalXP}
      onCompleteTask={() => {
        void handleCompleteTask();
      }}
      onSkipTask={handleSkipTask}
      onExit={handleExit}
    />
  );
};

export default ScatteredModeContainer;
