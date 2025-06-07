// ABOUTME: Mac-inspired TaskItem component using NativeWind
// Provides clean checkbox interaction and visual feedback for task states

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TASK_CATEGORIES, TASK_PRIORITY } from '../constants/TaskConstants';
import { completeTask, updateTask, startTask, markPartnerNotified } from '../utils/TaskModel';
import TaskStorageService from '../services/TaskStorageService';
import RewardService from '../services/RewardService';
import NotificationService from '../services/NotificationService';
import PartnershipService from '../services/PartnershipService';
import type { Task } from '../types/task.types';
import { TaskStatus } from '../types/task.types';
import type { User } from '../types/user.types';
import { animationHelpers, duration, easing } from '../styles/animations';
import RewardAnimation from './RewardAnimation';

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
  // Development helper for tracking renders
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('TaskItem render');
  }

  // Animation state
  const [showReward, setShowReward] = useState(false);
  const scaleAnim = useRef(animationHelpers.createValue(1)).current;
  const checkboxScaleAnim = useRef(animationHelpers.createValue(task.completed ? 1 : 0)).current;
  const opacityAnim = useRef(animationHelpers.createValue(1)).current;

  // Update checkbox animation when task completion changes
  useEffect(() => {
    Animated.spring(checkboxScaleAnim, {
      toValue: task.completed ? 1 : 0,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [task.completed]);

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

  const animateCompletion = () => {
    // Haptic feedback for completion
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Bounce animation on the entire task item
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: duration.fast,
        easing: easing.decelerate,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Show reward animation
    setShowReward(true);
  };

  const handleToggleComplete = async (): Promise<void> => {
    // Haptic feedback on toggle
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

      // Trigger completion animation
      animateCompletion();

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

  const getTaskStatus = (): string => {
    if (task.completed) return 'completed';
    if (task.status === 'in_progress') return 'in progress';
    return 'pending';
  };
  const taskStatus = getTaskStatus();
  const taskAccessibilityLabel = `${task.title}, ${taskStatus}${category ? `, category: ${category.label}` : ''}${task.priority && task.priority !== TASK_PRIORITY.MEDIUM ? `, priority: ${task.priority}` : ''}${task.dueDate ? `, due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}`;

  // Task container classes
  const containerClasses = `flex-row bg-white mx-4 my-2 p-4 rounded-task-item shadow-card${task.completed ? ' opacity-60' : ''}`;

  // Checkbox classes
  const checkboxClasses = `w-6 h-6 rounded-full border-2 mr-3 justify-center items-center ${task.completed ? 'bg-success-500 border-success-500' : 'border-neutral-300'}`;

  // Title classes
  const titleClasses = `text-task-title text-neutral-900 flex-1${task.completed ? ' line-through text-neutral-500' : ''}`;

  // Description classes
  const descriptionClasses = `text-task-description text-neutral-600 mb-2${task.completed ? ' line-through text-neutral-400' : ''}`;

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
        <Pressable
          testID={`task-item-${task.id}`}
          className={containerClasses}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress?.();
          }}
          onPressIn={() => {
            Animated.timing(scaleAnim, {
              toValue: 0.98,
              duration: 100,
              useNativeDriver: true,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 5,
              useNativeDriver: true,
            }).start();
          }}
          android_ripple={{
            color: 'rgba(168, 85, 247, 0.1)',
            borderless: false,
          }}
          accessible
          accessibilityLabel={taskAccessibilityLabel}
          accessibilityHint="Double tap to view task details"
          accessibilityRole="button"
        >
          <Pressable
            testID="task-checkbox"
            className={checkboxClasses}
            onPress={() => {
              void handleToggleComplete();
            }}
            onPressIn={() => {
              Animated.timing(checkboxScaleAnim, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(checkboxScaleAnim, {
                toValue: task.completed ? 1 : 0,
                friction: 5,
                useNativeDriver: true,
              }).start();
            }}
            accessible
            accessibilityLabel={
              task.completed ? 'Mark task as incomplete' : 'Mark task as complete'
            }
            accessibilityHint={
              task.completed
                ? 'Double tap to uncheck this task'
                : 'Double tap to complete this task'
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.completed }}
          >
            <Animated.Text
              className="text-white text-base font-bold"
              style={{
                transform: [{ scale: checkboxScaleAnim }],
                opacity: checkboxScaleAnim,
              }}
            >
              ✓
            </Animated.Text>
          </Pressable>

          <View className="flex-1" testID="task-content">
            <View className="flex-row justify-between items-center mb-1">
              <Text className={titleClasses}>{task.title}</Text>
              {category && (
                <View
                  className="px-2 py-1 rounded-full ml-2"
                  style={{ backgroundColor: category.color }}
                >
                  <Text className="text-sm">{category.icon}</Text>
                </View>
              )}
            </View>

            {task.description ? (
              <Text className={descriptionClasses} numberOfLines={2}>
                {task.description}
              </Text>
            ) : null}

            <View className="flex-row items-center gap-3">
              {task.assignedBy && (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="person-circle-outline" size={14} color="#3b82f6" />
                  <Text className="text-xs text-primary-500">
                    {task.assignedBy === currentUser?.id
                      ? 'Assigned'
                      : (partner?.name ?? 'Partner')}
                  </Text>
                </View>
              )}
              {task.priority && task.priority !== TASK_PRIORITY.MEDIUM && (
                <View
                  className="w-5 h-5 rounded-full border-2 justify-center items-center"
                  style={{ borderColor: getPriorityColor() }}
                >
                  <Ionicons
                    name={task.priority === TASK_PRIORITY.URGENT ? 'warning' : 'flag'}
                    size={12}
                    color={getPriorityColor()}
                  />
                </View>
              )}
              {task.dueDate && (
                <Text
                  className={`text-xs ${new Date(task.dueDate) < new Date() ? 'text-danger-500 font-semibold' : 'text-neutral-500'}`}
                >
                  📅 {new Date(task.dueDate).toLocaleDateString()}
                </Text>
              )}
              {task.timeEstimate && (
                <Text className="text-xs text-neutral-500">
                  ⏱️ {formatTimeEstimate(task.timeEstimate)}
                </Text>
              )}
              {task.status === 'in_progress' && (
                <Text className="text-xs text-primary-500 font-semibold">▶️ In Progress</Text>
              )}
              {task.completed && task.xpEarned > 0 && (
                <Text className="text-xs text-success-500 font-semibold">
                  ✨ +{task.xpEarned} XP
                </Text>
              )}
            </View>
          </View>

          {!task.completed && task.assignedBy && (
            <TouchableOpacity
              className="ml-2 justify-center"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void handleStartTask();
              }}
              disabled={task.status === 'in_progress'}
              accessible
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
                color={task.status === 'in_progress' ? '#6b7280' : '#3b82f6'}
              />
            </TouchableOpacity>
          )}
        </Pressable>
      </Animated.View>
      <RewardAnimation
        visible={showReward}
        type="emoji"
        onComplete={() => {
          setShowReward(false);
        }}
      />
    </>
  );
};

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
