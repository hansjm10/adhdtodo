// ABOUTME: Pure presentation component for scattered mode task switching
// Displays quick tasks one at a time with completion actions

import React from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Task } from '../types/task.types';
import { TASK_CATEGORIES } from '../constants/TaskConstants';
import {
  getCardMinHeight,
  responsiveFontSize,
  responsivePadding,
} from '../utils/ResponsiveDimensions';

interface ScatteredModeViewProps {
  currentTask: Task | null;
  taskIndex: number;
  totalTasks: number;
  completedCount: number;
  totalXP: number;
  onCompleteTask: () => void;
  onSkipTask: () => void;
  onExit: () => void;
}

interface Styles {
  container: ViewStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  header: ViewStyle;
  exitButton: ViewStyle;
  exitButtonText: TextStyle;
  stats: ViewStyle;
  statsText: TextStyle;
  progressContainer: ViewStyle;
  progressBar: ViewStyle;
  progressText: TextStyle;
  cardContainer: ViewStyle;
  taskCard: ViewStyle;
  taskTime: TextStyle;
  taskTitle: TextStyle;
  taskDescription: TextStyle;
  taskMeta: ViewStyle;
  categoryBadge: ViewStyle;
  categoryText: TextStyle;
  xpPreview: TextStyle;
  actions: ViewStyle;
  actionButton: ViewStyle;
  skipButton: ViewStyle;
  completeButton: ViewStyle;
  actionButtonText: TextStyle;
  completeButtonText: TextStyle;
  motivationContainer: ViewStyle;
  motivationText: TextStyle;
  subMotivationText: TextStyle;
}

export const ScatteredModeView: React.FC<ScatteredModeViewProps> = ({
  currentTask,
  taskIndex,
  totalTasks,
  completedCount,
  totalXP,
  onCompleteTask,
  onSkipTask,
  onExit,
}) => {
  if (!currentTask) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No quick tasks available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = ((taskIndex + completedCount) / totalTasks) * 100;
  const category = currentTask.category
    ? Object.values(TASK_CATEGORIES).find((cat) => cat.id === currentTask.category)
    : null;
  const taskXP = 10; // This would be calculated by RewardService

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity testID="exit-button" style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.stats}>
          <Text style={styles.statsText}>Completed: {completedCount}</Text>
          <Text style={styles.statsText}>XP: {totalXP}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
        <Text style={styles.progressText}>
          {taskIndex + 1} of {totalTasks}
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.taskCard}>
          <Text style={styles.taskTime}>{currentTask.timeEstimate || 0} minutes</Text>
          <Text style={styles.taskTitle}>{currentTask.title}</Text>
          {currentTask.description && (
            <Text style={styles.taskDescription}>{currentTask.description}</Text>
          )}
          <View style={styles.taskMeta}>
            {category && (
              <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
                <Text style={styles.categoryText}>
                  {category.icon} {category.label}
                </Text>
              </View>
            )}
            <Text style={styles.xpPreview}>+{taskXP} XP</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            testID="skip-button"
            style={[styles.actionButton, styles.skipButton]}
            onPress={onSkipTask}
          >
            <Text style={styles.actionButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="complete-button"
            style={[styles.actionButton, styles.completeButton]}
            onPress={onCompleteTask}
          >
            <Text style={styles.completeButtonText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.motivationContainer}>
        <Text style={styles.motivationText}>Keep the momentum going! 🚀</Text>
        <Text style={styles.subMotivationText}>Quick wins build confidence and energy</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
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
    fontSize: responsiveFontSize(18),
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsivePadding(20),
    paddingVertical: responsivePadding(10),
  },
  exitButton: {
    padding: responsivePadding(10),
  },
  exitButtonText: {
    fontSize: responsiveFontSize(16),
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
  },
  statsText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#333',
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    marginHorizontal: responsivePadding(20),
    marginBottom: responsivePadding(20),
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
  },
  progressText: {
    position: 'absolute',
    right: responsivePadding(10),
    top: -20,
    fontSize: responsiveFontSize(14),
    color: '#666',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: responsivePadding(20),
    justifyContent: 'center',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: responsivePadding(24),
    minHeight: getCardMinHeight(),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskTime: {
    fontSize: responsiveFontSize(36),
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: responsivePadding(16),
  },
  taskTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    color: '#333',
    marginBottom: responsivePadding(12),
  },
  taskDescription: {
    fontSize: responsiveFontSize(16),
    color: '#666',
    marginBottom: responsivePadding(16),
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: responsivePadding(16),
  },
  categoryBadge: {
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(6),
    borderRadius: 16,
  },
  categoryText: {
    fontSize: responsiveFontSize(14),
    color: '#fff',
    fontWeight: '600',
  },
  xpPreview: {
    fontSize: responsiveFontSize(18),
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: responsivePadding(24),
  },
  actionButton: {
    flex: 1,
    paddingVertical: responsivePadding(16),
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#f0f0f0',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#666',
  },
  completeButtonText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#fff',
  },
  motivationContainer: {
    paddingHorizontal: responsivePadding(20),
    paddingBottom: responsivePadding(20),
    alignItems: 'center',
  },
  motivationText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#333',
    marginBottom: responsivePadding(4),
  },
  subMotivationText: {
    fontSize: responsiveFontSize(14),
    color: '#666',
  },
});

export default ScatteredModeView;
