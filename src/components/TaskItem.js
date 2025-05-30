// ABOUTME: Reusable TaskItem component for displaying individual tasks
// Provides checkbox for completion and visual feedback for task states

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TASK_CATEGORIES } from '../constants/TaskConstants';
import { completeTask, updateTask } from '../utils/TaskModel';
import TaskStorageService from '../services/TaskStorageService';
import RewardService from '../services/RewardService';

const TaskItem = ({ task, onUpdate, onPress }) => {
  const category = task.category
    ? Object.values(TASK_CATEGORIES).find((cat) => cat.id === task.category)
    : null;

  const formatTimeEstimate = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const handleToggleComplete = async () => {
    let updatedTask;

    if (task.completed) {
      // Uncomplete the task
      updatedTask = updateTask(task, {
        completed: false,
        completedAt: null,
        xpEarned: 0,
        status: 'pending',
      });
    } else {
      // Complete the task with calculated XP
      const xp = RewardService.calculateTaskXP(task);
      updatedTask = completeTask(task, xp);

      // Update streak
      await RewardService.updateStreak();
    }

    const success = await TaskStorageService.updateTask(updatedTask);
    if (success && onUpdate) {
      onUpdate();
    }
  };

  return (
    <TouchableOpacity
      testID={`task-item-${task.id}`}
      style={[styles.container, task.completed && styles.completedContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        testID="task-checkbox"
        style={[styles.checkbox, task.completed && styles.checkboxCompleted]}
        onPress={handleToggleComplete}
      >
        {task.completed && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.content} testID="task-content">
        <View style={styles.header}>
          <Text style={[styles.title, task.completed && styles.completedText]}>{task.title}</Text>
          {category && (
            <View style={[styles.categoryBadge, { backgroundColor: category.color }]}>
              <Text style={styles.categoryIcon}>{category.icon}</Text>
            </View>
          )}
        </View>

        {task.description ? (
          <Text
            style={[styles.description, task.completed && styles.completedText]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        ) : null}

        <View style={styles.meta}>
          {task.timeEstimate && (
            <Text style={styles.timeEstimate}>⏱️ {formatTimeEstimate(task.timeEstimate)}</Text>
          )}
          {task.completed && task.xpEarned > 0 && (
            <Text style={styles.xpBadge}>✨ +{task.xpEarned} XP</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedContainer: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#4ECDC4',
    borderColor: '#4ECDC4',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeEstimate: {
    fontSize: 12,
    color: '#888',
  },
  xpBadge: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryIcon: {
    fontSize: 14,
  },
});

export default TaskItem;
