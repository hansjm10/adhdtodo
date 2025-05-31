// ABOUTME: Scattered mode screen for rapid task switching with quick wins
// Perfect for high-energy, low-focus times - complete quick tasks for momentum

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '../contexts';
import RewardService from '../services/RewardService';
import {
  getCardMinHeight,
  responsiveFontSize,
  responsivePadding,
} from '../utils/ResponsiveDimensions';

const ScatteredScreen = () => {
  const navigation = useNavigation();
  const { getPendingTasks, updateTask } = useTasks();
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  // Get quick tasks from context
  const quickTasks = useMemo(() => {
    const pendingTasks = getPendingTasks();
    return pendingTasks.filter((task) => task.timeEstimate && task.timeEstimate <= 15);
  }, [getPendingTasks]);

  useEffect(() => {
    if (quickTasks.length === 0) {
      Alert.alert(
        'No Quick Tasks Available',
        'Add some tasks with 5-15 minute time estimates to use Scattered Mode.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }
  }, [quickTasks.length, navigation]);

  const handleCompleteTask = async () => {
    if (currentTaskIndex >= quickTasks.length) return;

    const task = quickTasks[currentTaskIndex];
    const xp = RewardService.calculateTaskXP(task);

    try {
      await updateTask(task.id, { completed: true, completedAt: new Date().toISOString(), xp });
      await RewardService.updateStreak();

      setCompletedCount((prev) => prev + 1);
      setTotalXP((prev) => prev + xp);

      // Move to next task
      if (currentTaskIndex < quickTasks.length - 1) {
        setCurrentTaskIndex((prev) => prev + 1);
      } else {
        // All tasks completed
        Alert.alert(
          '🎉 Amazing Sprint!',
          `You completed ${completedCount + 1} tasks and earned ${totalXP + xp} XP!`,
          [{ text: 'Exit', onPress: () => navigation.goBack() }],
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
      Alert.alert('No More Tasks', "You've gone through all quick tasks. Try completing some!", [
        { text: 'OK' },
      ]);
    }
  };

  const exitScatteredMode = () => {
    Alert.alert('Exit Scattered Mode?', `You've completed ${completedCount} tasks so far!`, [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Exit', onPress: () => navigation.goBack() },
    ]);
  };

  if (quickTasks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading quick tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentTask = quickTasks[currentTaskIndex];
  const progress = ((currentTaskIndex + 1) / quickTasks.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={exitScatteredMode} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.stats}>
          <Text style={styles.statsText}>⚡ {completedCount} done</Text>
          <Text style={styles.statsText}>🏆 {totalXP} XP</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.progressText}>
          {currentTaskIndex + 1} of {quickTasks.length}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.taskCard}>
          <Text style={styles.taskTime}>{currentTask.timeEstimate} minutes</Text>
          <Text style={styles.taskTitle}>{currentTask.title}</Text>
          {currentTask.description ? (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {currentTask.description}
            </Text>
          ) : null}

          <View style={styles.taskMeta}>
            {currentTask.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{currentTask.category}</Text>
              </View>
            )}
            <Text style={styles.xpPreview}>+{RewardService.calculateTaskXP(currentTask)} XP</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionButton, styles.skipButton]} onPress={handleSkipTask}>
          <Text style={styles.actionButtonText}>Skip →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={handleCompleteTask}
        >
          <Text style={[styles.actionButtonText, styles.completeButtonText]}>Complete ✓</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.motivationContainer}>
        <Text style={styles.motivationText}>Quick wins build momentum! 🚀</Text>
        <Text style={styles.subMotivationText}>Focus on starting, not perfection</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    fontSize: 24,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: responsivePadding(32),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minHeight: getCardMinHeight(),
  },
  taskTime: {
    fontSize: responsiveFontSize(48),
    fontWeight: '300',
    color: '#4ECDC4',
    marginBottom: 16,
    textAlign: 'center',
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  taskDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 'auto',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  xpPreview: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#e0e0e0',
  },
  completeButton: {
    backgroundColor: '#4ECDC4',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  completeButtonText: {
    color: '#fff',
  },
  motivationContainer: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  motivationText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subMotivationText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ScatteredScreen;
