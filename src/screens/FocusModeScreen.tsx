// ABOUTME: Focus mode selection screen - choose between Hyperfocus and Scattered modes
// Allows users to select tasks and enter specialized ADHD-friendly focus modes

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
  ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '../contexts';
import { createTestNotifications } from '../utils/NotificationTestHelper';
import { Task } from '../types/task.types';
import { FocusStackParamList } from '../navigation/AppNavigator';

// Import LegacyTask interface to match TaskContext
interface LegacyTask extends Omit<Task, 'completed' | 'createdAt' | 'updatedAt' | 'completedAt'> {
  isComplete: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

type FocusModeScreenNavigationProp = StackNavigationProp<FocusStackParamList, 'FocusMode'>;
type FocusMode = 'hyperfocus' | 'scattered' | null;

const FocusModeScreen = () => {
  const navigation = useNavigation<FocusModeScreenNavigationProp>();
  const [selectedMode, setSelectedMode] = useState<FocusMode>(null);
  const [selectedTask, setSelectedTask] = useState<LegacyTask | null>(null);
  const { getPendingTasks } = useTasks();

  // Get pending tasks from context
  const tasks = useMemo(() => getPendingTasks(), [getPendingTasks]);

  const startFocusMode = (): void => {
    if (!selectedTask) {
      Alert.alert('Select a Task', 'Please select a task first');
      return;
    }

    if (selectedMode === 'hyperfocus') {
      navigation.navigate('Hyperfocus', { taskId: selectedTask.id });
    } else if (selectedMode === 'scattered') {
      navigation.navigate('Scattered');
    }
  };

  const getQuickTasks = (): LegacyTask[] => {
    return tasks.filter((task) => task.timeEstimate && task.timeEstimate <= 15);
  };

  const renderTask = ({ item }: ListRenderItemInfo<LegacyTask>): React.ReactElement => {
    const isSelected = selectedTask?.id === item.id;
    const timeLabel = item.timeEstimate ? `${item.timeEstimate} min` : 'No estimate';

    return (
      <TouchableOpacity
        style={[styles.taskCard, isSelected && styles.taskCardSelected]}
        onPress={() => setSelectedTask(item)}
      >
        <Text style={styles.taskTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.taskTime}>{timeLabel}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Focus Mode</Text>
          <Text style={styles.subtitle}>Select a mode that matches your current energy</Text>
        </View>

        <View style={styles.modesContainer}>
          <TouchableOpacity
            style={[styles.modeCard, selectedMode === 'hyperfocus' && styles.modeCardSelected]}
            onPress={() => setSelectedMode('hyperfocus')}
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
            style={[styles.modeCard, selectedMode === 'scattered' && styles.modeCardSelected]}
            onPress={() => setSelectedMode('scattered')}
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
              {selectedMode === 'hyperfocus'
                ? 'Select a Task to Focus On'
                : `Quick Tasks Available (${getQuickTasks().length})`}
            </Text>
            <FlatList
              data={selectedMode === 'hyperfocus' ? tasks : getQuickTasks()}
              renderItem={renderTask}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.taskList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {selectedMode === 'hyperfocus'
                    ? 'No tasks available'
                    : 'No quick tasks (≤15 min) available'}
                </Text>
              }
            />
          </View>
        )}

        {selectedMode && (
          <TouchableOpacity
            style={[styles.startButton, !selectedTask && styles.startButtonDisabled]}
            onPress={startFocusMode}
            disabled={!selectedTask}
          >
            <Text style={styles.startButtonText}>
              Start {selectedMode === 'hyperfocus' ? 'Hyperfocus' : 'Scattered'} Mode
            </Text>
          </TouchableOpacity>
        )}

        {/* Test button for notifications - remove in production */}
        <TouchableOpacity style={[styles.testButton]} onPress={createTestNotifications}>
          <Text style={styles.testButtonText}>Test Notifications</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

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
  emptyText: TextStyle;
  startButton: ViewStyle;
  startButtonDisabled: ViewStyle;
  startButtonText: TextStyle;
  testButton: ViewStyle;
  testButtonText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  modesContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 32,
  },
  modeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: '#f0fffd',
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  modeFeatures: {
    gap: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#888',
  },
  taskSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  taskList: {
    paddingHorizontal: 20,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: '#f0fffd',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 18,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  testButton: {
    backgroundColor: '#9B59B6',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});

export default FocusModeScreen;
