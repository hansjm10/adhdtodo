// ABOUTME: Pure presentation component for focus mode selection
// Displays mode options and task selection without data dependencies

import React from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ListRenderItemInfo } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import type { Task } from '../types/task.types';

interface FocusModeViewProps {
  tasks: Task[];
  selectedMode: 'hyperfocus' | 'scattered' | null;
  selectedTask: Task | null;
  onModeSelect: (mode: 'hyperfocus' | 'scattered') => void;
  onTaskSelect: (task: Task) => void;
  onStartPress: () => void;
}

interface Styles {
  container: ViewStyle;
  scrollContent: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  modesContainer: ViewStyle;
  modeCard: ViewStyle;
  modeCardSelected: ViewStyle;
  modeIcon: TextStyle;
  modeTitle: TextStyle;
  modeDescription: TextStyle;
  modeFeatures: ViewStyle;
  featureText: TextStyle;
  taskSection: ViewStyle;
  sectionTitle: TextStyle;
  taskList: ViewStyle;
  taskCard: ViewStyle;
  taskCardSelected: ViewStyle;
  taskTitle: TextStyle;
  taskTime: TextStyle;
  emptyState: ViewStyle;
  emptyText: TextStyle;
  startButton: ViewStyle;
  startButtonDisabled: ViewStyle;
  startButtonText: TextStyle;
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
      <TouchableOpacity
        testID={`task-${item.id}`}
        style={[styles.taskCard, isSelected && styles.taskCardSelected]}
        onPress={() => {
          onTaskSelect(item);
        }}
      >
        <Text style={styles.taskTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.taskTime}>{timeLabel}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyTaskList = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No tasks available</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Focus Mode</Text>
          <Text style={styles.subtitle}>Select a mode that matches your current energy</Text>
        </View>

        <View style={styles.modesContainer}>
          <TouchableOpacity
            testID="hyperfocus-mode"
            style={[styles.modeCard, selectedMode === 'hyperfocus' && styles.modeCardSelected]}
            onPress={() => {
              onModeSelect('hyperfocus');
            }}
          >
            <Text style={styles.modeIcon}>🎯</Text>
            <Text style={styles.modeTitle}>Hyperfocus Mode</Text>
            <Text style={styles.modeDescription}>
              Deep focus on a single task with timed sessions and breaks
            </Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.featureText}>• 25-minute sessions</Text>
              <Text style={styles.featureText}>• Built-in breaks</Text>
              <Text style={styles.featureText}>• Distraction-free</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            testID="scattered-mode"
            style={[styles.modeCard, selectedMode === 'scattered' && styles.modeCardSelected]}
            onPress={() => {
              onModeSelect('scattered');
            }}
          >
            <Text style={styles.modeIcon}>⚡</Text>
            <Text style={styles.modeTitle}>Scattered Mode</Text>
            <Text style={styles.modeDescription}>
              Quick task switching for high-energy, low-focus times
            </Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.featureText}>• 5-15 minute tasks</Text>
              <Text style={styles.featureText}>• Rapid switching</Text>
              <Text style={styles.featureText}>• Momentum building</Text>
            </View>
          </TouchableOpacity>
        </View>

        {selectedMode && (
          <View style={styles.taskSection}>
            <Text style={styles.sectionTitle}>
              {selectedMode === 'hyperfocus' ? 'Select a Task' : 'Quick Tasks'}
            </Text>
            <View style={styles.taskList}>
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

        <TouchableOpacity
          testID="start-button"
          style={[
            styles.startButton,
            (!selectedMode || !selectedTask) && styles.startButtonDisabled,
          ]}
          onPress={onStartPress}
          disabled={!selectedMode || !selectedTask}
        >
          <Text style={styles.startButtonText}>Start Focus Mode</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modesContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  modeCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 12,
    textAlign: 'center',
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  modeFeatures: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  taskList: {
    maxHeight: 300,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  taskCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  taskTime: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default FocusModeView;
