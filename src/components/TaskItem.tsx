// ABOUTME: Reusable TaskItem component for displaying individual tasks
// Provides checkbox for completion and visual feedback for task states

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TASK_CATEGORIES, TASK_PRIORITY } from '../constants/TaskConstants';
import { completeTask, updateTask, startTask, markPartnerNotified } from '../utils/TaskModel';
import TaskStorageService from '../services/TaskStorageService';
import RewardService from '../services/RewardService';
import NotificationService from '../services/NotificationService';
import PartnershipService from '../services/PartnershipService';
import { Task, TaskStatus } from '../types/task.types';
import { User } from '../types/user.types';

interface Partner {
  id: string;
  name: string;
}

interface TaskItemProps {
  task: Task;
  onUpdate?: () => void;
  onPress?: () => void;
  currentUser?: User | null;
  partner?: Partner | null;
}

const TaskItem = ({ task, onUpdate, onPress, currentUser, partner }: TaskItemProps) => {
  const category = task.category
    ? Object.values(TASK_CATEGORIES).find((cat) => cat.id === task.category)
    : null;

  const formatTimeEstimate = (minutes: number | null): string | null => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const handleToggleComplete = async (): Promise<void> => {
    let updatedTask;

    if (task.completed) {
      // Uncomplete the task
      updatedTask = updateTask(task, {
        completed: false,
        completedAt: null,
        xpEarned: 0,
        status: TaskStatus.PENDING,
      });
    } else {
      // Complete the task with calculated XP
      const xp = RewardService.calculateTaskXP(task);
      updatedTask = completeTask(task, xp);

      // Update streak
      await RewardService.updateStreak();

      // Notify partner if this is an assigned task
      if (task.assignedBy && currentUser) {
        updatedTask = markPartnerNotified(updatedTask, 'onComplete');
        await NotificationService.notifyTaskCompleted(updatedTask, currentUser);

        // Update partnership stats
        const partnership = await PartnershipService.getActivePartnership(currentUser.id);
        if (partnership) {
          await PartnershipService.incrementPartnershipStat(partnership.id, 'tasksCompleted');
        }
      }
    }

    const success = await TaskStorageService.updateTask(updatedTask);
    if (success && onUpdate) {
      onUpdate();
    }
  };

  const handleStartTask = async (): Promise<void> => {
    if (task.status === 'in_progress' || task.completed) return;

    let updatedTask = startTask(task);

    // Notify partner if this is an assigned task
    if (task.assignedBy && currentUser && !task.partnerNotified.onStart) {
      updatedTask = markPartnerNotified(updatedTask, 'onStart');
      await NotificationService.notifyTaskStarted(updatedTask, currentUser);
    }

    const success = await TaskStorageService.updateTask(updatedTask);
    if (success && onUpdate) {
      onUpdate();
    }
  };

  const getPriorityColor = (): string => {
    switch (task.priority) {
      case TASK_PRIORITY.LOW:
        return '#27AE60';
      case TASK_PRIORITY.MEDIUM:
        return '#F39C12';
      case TASK_PRIORITY.HIGH:
        return '#E74C3C';
      case TASK_PRIORITY.URGENT:
        return '#C0392B';
      default:
        return '#7F8C8D';
    }
  };

  const taskStatus = task.completed
    ? 'completed'
    : task.status === 'in_progress'
      ? 'in progress'
      : 'pending';
  const taskAccessibilityLabel = `${task.title}, ${taskStatus}${category ? `, category: ${category.label}` : ''}${task.priority && task.priority !== TASK_PRIORITY.MEDIUM ? `, priority: ${task.priority}` : ''}${task.dueDate ? `, due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}`;

  return (
    <TouchableOpacity
      testID={`task-item-${task.id}`}
      style={[styles.container, task.completed && styles.completedContainer]}
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={taskAccessibilityLabel}
      accessibilityHint="Double tap to view task details"
      accessibilityRole="button"
    >
      <TouchableOpacity
        testID="task-checkbox"
        style={[styles.checkbox, task.completed && styles.checkboxCompleted]}
        onPress={handleToggleComplete}
        accessible={true}
        accessibilityLabel={task.completed ? 'Mark task as incomplete' : 'Mark task as complete'}
        accessibilityHint={
          task.completed ? 'Double tap to uncheck this task' : 'Double tap to complete this task'
        }
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
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
          {task.assignedBy && (
            <View style={styles.assignedBadge}>
              <Ionicons name="person-circle-outline" size={14} color="#3498DB" />
              <Text style={styles.assignedText}>
                {task.assignedBy === currentUser?.id ? 'Assigned' : partner?.name || 'Partner'}
              </Text>
            </View>
          )}
          {task.priority && task.priority !== TASK_PRIORITY.MEDIUM && (
            <View style={[styles.priorityBadge, { borderColor: getPriorityColor() }]}>
              <Ionicons
                name={task.priority === TASK_PRIORITY.URGENT ? 'warning' : 'flag'}
                size={12}
                color={getPriorityColor()}
              />
            </View>
          )}
          {task.dueDate && (
            <Text style={[styles.dueDate, new Date(task.dueDate) < new Date() && styles.overdue]}>
              📅 {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          )}
          {task.timeEstimate && (
            <Text style={styles.timeEstimate}>⏱️ {formatTimeEstimate(task.timeEstimate)}</Text>
          )}
          {task.status === 'in_progress' && (
            <Text style={styles.inProgressBadge}>▶️ In Progress</Text>
          )}
          {task.completed && task.xpEarned > 0 && (
            <Text style={styles.xpBadge}>✨ +{task.xpEarned} XP</Text>
          )}
        </View>
      </View>

      {!task.completed && task.assignedBy && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartTask}
          disabled={task.status === 'in_progress'}
          accessible={true}
          accessibilityLabel={task.status === 'in_progress' ? 'Task in progress' : 'Start task'}
          accessibilityHint={
            task.status === 'in_progress'
              ? 'Task is already in progress'
              : 'Double tap to start working on this task'
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: task.status === 'in_progress' }}
        >
          <Ionicons
            name={task.status === 'in_progress' ? 'pause-circle' : 'play-circle'}
            size={32}
            color={task.status === 'in_progress' ? '#7F8C8D' : '#3498DB'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

interface Styles {
  container: ViewStyle;
  completedContainer: ViewStyle;
  checkbox: ViewStyle;
  checkboxCompleted: ViewStyle;
  checkmark: TextStyle;
  content: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  completedText: TextStyle;
  description: TextStyle;
  meta: ViewStyle;
  timeEstimate: TextStyle;
  xpBadge: TextStyle;
  categoryBadge: ViewStyle;
  categoryIcon: TextStyle;
  assignedBadge: ViewStyle;
  assignedText: TextStyle;
  priorityBadge: ViewStyle;
  dueDate: TextStyle;
  overdue: TextStyle;
  inProgressBadge: TextStyle;
  startButton: ViewStyle;
}

const styles = StyleSheet.create<Styles>({
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
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedText: {
    fontSize: 12,
    color: '#3498DB',
  },
  priorityBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 12,
    color: '#888',
  },
  overdue: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  inProgressBadge: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '600',
  },
  startButton: {
    marginLeft: 8,
    justifyContent: 'center',
  },
});

// Custom comparison function for React.memo
const areEqual = (prevProps: TaskItemProps, nextProps: TaskItemProps): boolean => {
  // Compare task properties that affect visual rendering
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // Check if task visual properties are the same
  const taskVisuallyEqual =
    prevTask.id === nextTask.id &&
    prevTask.title === nextTask.title &&
    prevTask.description === nextTask.description &&
    prevTask.completed === nextTask.completed &&
    prevTask.category === nextTask.category &&
    prevTask.priority === nextTask.priority &&
    prevTask.dueDate === nextTask.dueDate &&
    prevTask.timeEstimate === nextTask.timeEstimate &&
    prevTask.status === nextTask.status &&
    prevTask.xpEarned === nextTask.xpEarned &&
    prevTask.assignedBy === nextTask.assignedBy &&
    prevTask.partnerNotified?.onStart === nextTask.partnerNotified?.onStart &&
    prevTask.partnerNotified?.onComplete === nextTask.partnerNotified?.onComplete;

  // Check if other props are the same
  const otherPropsEqual =
    prevProps.onUpdate === nextProps.onUpdate &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.currentUser?.id === nextProps.currentUser?.id &&
    prevProps.partner?.id === nextProps.partner?.id;

  return taskVisuallyEqual && otherPropsEqual;
};

export default React.memo(TaskItem, areEqual);
