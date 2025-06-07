// ABOUTME: Mac-inspired scattered mode view using NativeWind
// Clean task switching interface with completion tracking

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ThemedText, ThemedButton, ThemedContainer, ThemedCard } from './themed';
import {
  getProgressBarStyle,
  getCategoryBgStyle,
  getTextColorStyle,
} from '../styles/dynamicStyles';
import type { Task } from '../types/task.types';
import { TASK_CATEGORIES } from '../constants/TaskConstants';

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
      <ThemedContainer variant="screen" safeArea centered>
        <ThemedCard variant="elevated" spacing="large">
          <View className="items-center">
            <ThemedText variant="h3" color="secondary" align="center">
              No quick tasks available
            </ThemedText>
            <ThemedText variant="body" color="tertiary" align="center" className="mt-2">
              Add some tasks to get started!
            </ThemedText>
          </View>
        </ThemedCard>
      </ThemedContainer>
    );
  }

  const progress = ((taskIndex + completedCount) / totalTasks) * 100;
  const category = currentTask.category
    ? Object.values(TASK_CATEGORIES).find((cat) => cat.id === currentTask.category)
    : null;
  const taskXP = 10; // This would be calculated by RewardService

  return (
    <ThemedContainer variant="screen" safeArea>
      <View className="p-4 flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            testID="exit-button"
            className="px-4 py-2 bg-neutral-100 rounded-lg"
            onPress={onExit}
          >
            <ThemedText variant="body" color="primary" weight="semibold">
              Exit
            </ThemedText>
          </TouchableOpacity>
          <View className="flex-row gap-4">
            <ThemedText variant="caption" color="secondary" weight="medium">
              Completed: {completedCount}
            </ThemedText>
            <ThemedText variant="caption" color="primary" weight="semibold">
              XP: {totalXP}
            </ThemedText>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="mb-8">
          <View className="bg-neutral-200 h-2 rounded-full overflow-hidden">
            <View
              className="bg-primary-500 h-full rounded-full"
              style={getProgressBarStyle(progress)}
            />
          </View>
          <ThemedText variant="caption" color="secondary" align="center" className="mt-2">
            {taskIndex + 1} of {totalTasks}
          </ThemedText>
        </View>

        {/* Task Card */}
        <View className="flex-1 justify-center">
          <View className="mb-6">
            <ThemedCard variant="elevated" spacing="large">
              <View className="items-center mb-4">
                <View className="bg-primary-50 px-3 py-1 rounded-full">
                  <ThemedText variant="caption" color="primary" weight="semibold">
                    {currentTask.timeEstimate ?? 0} minutes
                  </ThemedText>
                </View>
              </View>

              <ThemedText
                variant="h2"
                color="primary"
                align="center"
                weight="bold"
                className="mb-4"
              >
                {currentTask.title}
              </ThemedText>

              {currentTask.description && (
                <ThemedText variant="body" color="secondary" align="center" className="mb-5">
                  {currentTask.description}
                </ThemedText>
              )}

              <View className="flex-row justify-between items-center">
                {category && (
                  <View
                    className="flex-row items-center px-3 py-1.5 rounded-full"
                    style={getCategoryBgStyle(category.color)}
                  >
                    <ThemedText
                      variant="caption"
                      weight="medium"
                      style={getTextColorStyle(category.color)}
                    >
                      {category.icon} {category.label}
                    </ThemedText>
                  </View>
                )}
                <View className="bg-success-50 px-3 py-1.5 rounded-full">
                  <ThemedText variant="caption" color="success" weight="semibold">
                    +{taskXP} XP
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-4">
            <ThemedButton
              testID="skip-button"
              label="Skip"
              variant="secondary"
              size="large"
              fullWidth
              onPress={onSkipTask}
            />
            <ThemedButton
              testID="complete-button"
              label="Complete"
              variant="primary"
              size="large"
              fullWidth
              onPress={onCompleteTask}
            />
          </View>
        </View>

        {/* Motivation */}
        <View className="items-center mt-6">
          <ThemedText variant="body" color="primary" weight="semibold" align="center">
            Keep the momentum going! 🚀
          </ThemedText>
          <ThemedText variant="caption" color="tertiary" align="center" className="mt-1">
            Quick wins build confidence and energy
          </ThemedText>
        </View>
      </View>
    </ThemedContainer>
  );
};

export default ScatteredModeView;
