// ABOUTME: Screen for displaying list of tasks with ADHD-friendly design
// Shows tasks in a clean, organized list with visual feedback and empty states

import React, { useState, useMemo, FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { useUser, useTasks } from '../contexts';
import TaskItem from '../components/TaskItem';
import { TASK_CATEGORIES } from '../constants/TaskConstants';
import { TaskListScreenNavigationProp } from '../types/navigation.types';
import { TaskCategory, Task } from '../types/task.types';

// Define the LegacyTask interface that matches what TaskContext returns
interface LegacyTask extends Omit<Task, 'completed' | 'createdAt' | 'updatedAt' | 'completedAt'> {
  isComplete: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// Styles interface
interface Styles {
  container: ViewStyle;
  emptyContainer: ViewStyle;
  emptyList: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
  addButton: ViewStyle;
  addButtonText: TextStyle;
  categoryFilter: ViewStyle;
  categoryFilterContent: ViewStyle;
  categoryChip: ViewStyle;
  categoryChipActive: ViewStyle;
  categoryChipText: TextStyle;
  categoryChipTextActive: TextStyle;
  categoryIcon: TextStyle;
}

const TaskListScreen: FC = () => {
  const navigation = useNavigation<TaskListScreenNavigationProp>();
  const { user: currentUser, partner } = useUser();
  const { tasks: allTasks, refreshTasks } = useTasks();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAssignedOnly, setShowAssignedOnly] = useState<boolean>(false);

  // Filter and sort tasks based on current filters
  const filteredTasks = useMemo<LegacyTask[]>(() => {
    if (!currentUser) return [];

    let filtered = allTasks;

    if (showAssignedOnly) {
      // Show only tasks assigned by partner
      filtered = allTasks.filter((task) => task.assignedBy && task.assignedBy !== currentUser.id);
    } else {
      // Show tasks for current user
      filtered = allTasks.filter((task) => task.userId === currentUser.id);

      if (selectedCategory) {
        filtered = filtered.filter((task) => task.category === selectedCategory);
      }
    }

    // Sort tasks: incomplete first, then by priority and due date
    return filtered.sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      if (a.dueDate && b.dueDate) {
        const dateA = typeof a.dueDate === 'string' ? new Date(a.dueDate) : a.dueDate;
        const dateB = typeof b.dueDate === 'string' ? new Date(b.dueDate) : b.dueDate;
        return dateA.getTime() - dateB.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [allTasks, currentUser, selectedCategory, showAssignedOnly]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await refreshTasks();
    setRefreshing(false);
  };

  const renderTask = ({ item }: { item: LegacyTask }) => {
    // Convert LegacyTask to Task format for navigation
    const taskForNavigation: Task = {
      ...item,
      completed: item.isComplete,
      createdAt: new Date(item.createdAt),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(item.createdAt),
      completedAt: item.completedAt ? new Date(item.completedAt) : null,
    };

    return (
      <TaskItem
        task={taskForNavigation}
        onUpdate={refreshTasks}
        onPress={() => navigation.navigate('EditTask', { task: taskForNavigation })}
        currentUser={currentUser}
        partner={partner}
      />
    );
  };

  const EmptyState: FC = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No tasks yet</Text>
      <Text style={styles.emptySubtitle}>Tap the + button to create your first task</Text>
    </View>
  );

  const CategoryFilter: FC = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      <TouchableOpacity
        style={[styles.categoryChip, showAssignedOnly && styles.categoryChipActive]}
        onPress={() => {
          setShowAssignedOnly(!showAssignedOnly);
          setSelectedCategory(null);
        }}
        accessible={true}
        accessibilityLabel={partner ? `Show tasks from ${partner.name}` : 'Show assigned tasks'}
        accessibilityHint="Double tap to filter tasks assigned by your partner"
        accessibilityRole="button"
        accessibilityState={{ selected: showAssignedOnly }}
      >
        <Text style={[styles.categoryChipText, showAssignedOnly && styles.categoryChipTextActive]}>
          {partner ? `From ${partner.name}` : 'Assigned'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && !showAssignedOnly && styles.categoryChipActive,
        ]}
        onPress={() => {
          setSelectedCategory(null);
          setShowAssignedOnly(false);
        }}
        accessible={true}
        accessibilityLabel="Show all tasks"
        accessibilityHint="Double tap to show all tasks"
        accessibilityRole="button"
        accessibilityState={{ selected: !selectedCategory && !showAssignedOnly }}
      >
        <Text
          style={[
            styles.categoryChipText,
            !selectedCategory && !showAssignedOnly && styles.categoryChipTextActive,
          ]}
        >
          All Tasks
        </Text>
      </TouchableOpacity>

      {!showAssignedOnly &&
        Object.values(TASK_CATEGORIES).map((category: TaskCategory) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
              { borderColor: category.color },
            ]}
            onPress={() => setSelectedCategory(category.id)}
            accessible={true}
            accessibilityLabel={`Filter by ${category.label} category`}
            accessibilityHint={`Double tap to show only ${category.label} tasks`}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === category.id }}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextActive,
                selectedCategory === category.id && { color: category.color },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <CategoryFilter />
      <FlashList<LegacyTask>
        testID="task-list"
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item: LegacyTask) => item.id}
        ListEmptyComponent={EmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={filteredTasks.length === 0 ? styles.emptyList : undefined}
        estimatedItemSize={100}
        drawDistance={200}
      />

      <TouchableOpacity
        testID="add-task-button"
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateTask', {})}
        accessible={true}
        accessibilityLabel="Add new task"
        accessibilityHint="Double tap to create a new task"
        accessibilityRole="button"
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
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
    paddingHorizontal: 32,
  },
  emptyList: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
  categoryFilter: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#f0f0f0',
    borderColor: '#4ECDC4',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  categoryChipTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  categoryIcon: {
    fontSize: 16,
  },
});

export default TaskListScreen;
