// ABOUTME: Mac-inspired minimalist focus mode selection using NativeWind
// Clean design with clear mode distinctions and task selection

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import type { ListRenderItemInfo } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { ThemedContainer, ThemedText, ThemedCard, ThemedButton, ThemedIcon } from './themed';
import { getModeCardStyle, getScaleTransform, spacing } from '../styles/dynamicStyles';
import type { Task } from '../types/task.types';

interface FocusModeViewProps {
  tasks: Task[];
  selectedMode: 'hyperfocus' | 'scattered' | null;
  selectedTask: Task | null;
  onModeSelect: (mode: 'hyperfocus' | 'scattered') => void;
  onTaskSelect: (task: Task) => void;
  onStartPress: () => void;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  tasks,
  selectedMode,
  selectedTask,
  onModeSelect,
  onTaskSelect,
  onStartPress,
}) => {
  const quickTasks = tasks.filter((task) => task.timeEstimate && task.timeEstimate <= 15);

  const renderTask = ({ item }: ListRenderItemInfo<Task>): React.ReactElement => {
    const isSelected = selectedTask?.id === item.id;
    const timeLabel = item.timeEstimate ? `${item.timeEstimate} min` : 'No estimate';

    return (
      <ThemedCard
        variant="outlined"
        spacing="medium"
        onPress={() => {
          onTaskSelect(item);
        }}
        testID={`task-${item.id}`}
        style={getModeCardStyle(isSelected)}
        className="mb-2"
      >
        <View className="flex-row justify-between items-center">
          <ThemedText variant="body" color="primary" numberOfLines={1} className="flex-1 mr-2">
            {item.title}
          </ThemedText>
          <ThemedText variant="caption" color="secondary">
            {timeLabel}
          </ThemedText>
        </View>
      </ThemedCard>
    );
  };

  const renderEmptyTaskList = () => (
    <View className="p-8 items-center">
      <ThemedIcon name="folder-open-outline" size="lg" color="tertiary" />
      <ThemedText variant="body" color="secondary" align="center" className="mt-2">
        No tasks available
      </ThemedText>
    </View>
  );

  return (
    <ThemedContainer variant="screen" safeArea>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Header */}
        <View className="p-6 items-center">
          <ThemedText variant="h1" color="primary" align="center" className="mb-2">
            Choose Your Focus Mode
          </ThemedText>
          <ThemedText variant="body" color="secondary" align="center">
            Select a mode that matches your current energy
          </ThemedText>
        </View>

        {/* Mode Selection */}
        <View className="px-4 mb-6">
          <TouchableOpacity
            testID="hyperfocus-mode"
            className={`mb-4${selectedMode === 'hyperfocus' ? ' transform scale-105' : ''}`}
            onPress={() => {
              onModeSelect('hyperfocus');
            }}
            style={getScaleTransform(selectedMode === 'hyperfocus')}
          >
            <ThemedCard
              variant="elevated"
              spacing="large"
              style={getModeCardStyle(selectedMode === 'hyperfocus')}
            >
              <View className="items-center">
                <Text className="text-5xl mb-3">🎯</Text>
                <ThemedText variant="h3" color="primary" align="center" className="mb-2">
                  Hyperfocus Mode
                </ThemedText>
                <ThemedText variant="body" color="secondary" align="center" className="mb-3">
                  Deep focus on a single task with timed sessions and breaks
                </ThemedText>
                <View className="w-full">
                  <ThemedText variant="caption" color="tertiary" className="mb-1">
                    • 25-minute sessions
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary" className="mb-1">
                    • Built-in breaks
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    • Distraction-free
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          </TouchableOpacity>

          <TouchableOpacity
            testID="scattered-mode"
            className={`mb-4${selectedMode === 'scattered' ? ' transform scale-105' : ''}`}
            onPress={() => {
              onModeSelect('scattered');
            }}
            style={getScaleTransform(selectedMode === 'scattered')}
          >
            <ThemedCard
              variant="elevated"
              spacing="large"
              style={getModeCardStyle(selectedMode === 'scattered')}
            >
              <View className="items-center">
                <Text className="text-5xl mb-3">⚡</Text>
                <ThemedText variant="h3" color="primary" align="center" className="mb-2">
                  Scattered Mode
                </ThemedText>
                <ThemedText variant="body" color="secondary" align="center" className="mb-3">
                  Quick task switching for high-energy, low-focus times
                </ThemedText>
                <View className="w-full">
                  <ThemedText variant="caption" color="tertiary" className="mb-1">
                    • 5-15 minute tasks
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary" className="mb-1">
                    • Rapid switching
                  </ThemedText>
                  <ThemedText variant="caption" color="tertiary">
                    • Momentum building
                  </ThemedText>
                </View>
              </View>
            </ThemedCard>
          </TouchableOpacity>
        </View>

        {/* Task Selection */}
        {selectedMode && (
          <View className="px-4 mb-6">
            <ThemedText variant="h4" color="primary" className="mb-3">
              {selectedMode === 'hyperfocus' ? 'Select a Task' : 'Quick Tasks'}
            </ThemedText>
            <View className="max-h-[300px]">
              <FlashList
                testID="task-list"
                data={selectedMode === 'scattered' ? quickTasks : tasks}
                renderItem={renderTask}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmptyTaskList}
                scrollEnabled={false}
                estimatedItemSize={60}
              />
            </View>
          </View>
        )}

        {/* Start Button */}
        <View className="px-4">
          <ThemedButton
            label="Start Focus Mode"
            variant="primary"
            size="large"
            fullWidth
            disabled={!selectedMode || !selectedTask}
            onPress={onStartPress}
            testID="start-button"
          />
        </View>
      </ScrollView>
    </ThemedContainer>
  );
};

export default FocusModeView;
