// ABOUTME: Pure presentation component for displaying tasks
// Receives tasks as props, making it easily testable

import React, { useState, useEffect } from 'react';
import type {
  ViewStyle,
  TextStyle} from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import TaskItem from './TaskItem';
import { TASK_CATEGORIES } from '../constants/TaskConstants';
import type { Task, TaskCategory } from '../types/task.types';
import type { User } from '../types/user.types';
import settingsService from '../services/SettingsService';

interface TaskListViewProps {
  tasks: Task[];
  currentUser: User | null;
  partner?: User | null;
  selectedCategory: string | null;
  showAssignedOnly: boolean;
  refreshing: boolean;
  onTaskPress: (task: Task) => void;
  onAddPress: () => void;
  onRefresh: () => void;
  onCategorySelect: (categoryId: string | null) => void;
  onToggleAssigned: (show: boolean) => void;
}

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
  showMoreContainer: ViewStyle;
  showMoreButton: ViewStyle;
  showMoreText: TextStyle;
  taskCountText: TextStyle;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  currentUser,
  partner,
  selectedCategory,
  showAssignedOnly,
  refreshing,
  onTaskPress,
  onAddPress,
  onRefresh,
  onCategorySelect,
  onToggleAssigned,
}) => {
  const [taskLimit, setTaskLimit] = useState(5);
  const [showAll, setShowAll] = useState(false);

  // Load task limit from settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await settingsService.loadSettings();
      setTaskLimit(settings.taskLimit);
    };
    loadSettings();
  }, []);

  // Calculate visible tasks based on limit
  const visibleTasks = showAll ? tasks : tasks.slice(0, taskLimit);
  const hasMoreTasks = tasks.length > taskLimit;

  const renderTask = ({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onPress={() => { onTaskPress(item); }}
      currentUser={currentUser}
      partner={partner}
    />
  );

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No tasks yet</Text>
      <Text style={styles.emptySubtitle}>Tap the + button to create your first task</Text>
    </View>
  );

  const CategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      {partner && (
        <TouchableOpacity
          style={[styles.categoryChip, showAssignedOnly && styles.categoryChipActive]}
          onPress={() => {
            onToggleAssigned(true);
            onCategorySelect(null);
          }}
          accessible
          accessibilityLabel={`Show tasks from ${partner.name}`}
          accessibilityHint="Double tap to filter tasks assigned by your partner"
          accessibilityRole="button"
          accessibilityState={{ selected: showAssignedOnly }}
        >
          <Text
            style={[styles.categoryChipText, showAssignedOnly && styles.categoryChipTextActive]}
          >
            Assigned
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.categoryChip,
          !selectedCategory && !showAssignedOnly && styles.categoryChipActive,
        ]}
        onPress={() => {
          onCategorySelect(null);
          onToggleAssigned(false);
        }}
        accessible
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
            ]}
            onPress={() => { onCategorySelect(category.id); }}
            accessible
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
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
    </ScrollView>
  );

  const ShowMoreButton = () => {
    if (!hasMoreTasks) return null;

    return (
      <View style={styles.showMoreContainer}>
        <Text style={styles.taskCountText}>
          Showing {visibleTasks.length} of {tasks.length} tasks
        </Text>
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => { setShowAll(!showAll); }}
          accessible
          accessibilityLabel={showAll ? 'Show fewer tasks' : `Show all ${tasks.length} tasks`}
          accessibilityHint={
            showAll ? 'Double tap to limit visible tasks' : 'Double tap to show all tasks'
          }
          accessibilityRole="button"
        >
          <Text style={styles.showMoreText}>
            {showAll ? 'Show Less' : `Show All (${tasks.length - visibleTasks.length} more)`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CategoryFilter />

      {tasks.length === 0 ? (
        <ScrollView
          testID="task-list"
          contentContainerStyle={styles.emptyList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <EmptyState />
        </ScrollView>
      ) : (
        <FlashList<Task>
            testID="task-list"
            data={visibleTasks}
            renderItem={renderTask}
            keyExtractor={(item: Task) => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            estimatedItemSize={100}
            drawDistance={200}
            ListFooterComponent={ShowMoreButton}
          />
      )}

      <TouchableOpacity
        testID="add-task-button"
        style={styles.addButton}
        onPress={onAddPress}
        accessible
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
    fontWeight: 'bold',
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
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    backgroundColor: '#4A90E2',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  categoryFilter: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  showMoreContainer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginBottom: 80, // Space for FAB
  },
  showMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 24,
    marginTop: 8,
  },
  showMoreText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  taskCountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});

export default TaskListView;
