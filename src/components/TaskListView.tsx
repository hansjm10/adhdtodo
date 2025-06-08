// ABOUTME: Pure presentation component for displaying tasks
// Receives tasks as props, making it easily testable

import React, { useState, useEffect } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
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

// Empty state component
const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>No tasks yet</Text>
    <Text style={styles.emptySubtitle}>Tap the + button to create your first task</Text>
  </View>
);

// Category filter component
interface CategoryFilterProps {
  partner: User | null | undefined;
  showAssignedOnly: boolean;
  selectedCategory: string | null;
  onToggleAssigned: (show: boolean) => void;
  onCategorySelect: (categoryId: string | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  partner,
  showAssignedOnly,
  selectedCategory,
  onToggleAssigned,
  onCategorySelect,
}) => (
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
        <Text style={[styles.categoryChipText, showAssignedOnly && styles.categoryChipTextActive]}>
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
          onPress={() => {
            onCategorySelect(category.id);
          }}
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

// Show more button component
interface ShowMoreButtonProps {
  hasMoreTasks: boolean;
  visibleTasksCount: number;
  totalTasksCount: number;
  showAll: boolean;
  onToggle: () => void;
}

const ShowMoreButton: React.FC<ShowMoreButtonProps> = ({
  hasMoreTasks,
  visibleTasksCount,
  totalTasksCount,
  showAll,
  onToggle,
}) => {
  if (!hasMoreTasks) return null;

  return (
    <View style={styles.showMoreContainer}>
      <Text style={styles.taskCountText}>
        Showing {visibleTasksCount} of {totalTasksCount} tasks
      </Text>
      <TouchableOpacity
        style={styles.showMoreButton}
        onPress={onToggle}
        accessible
        accessibilityLabel={showAll ? 'Show fewer tasks' : `Show all ${totalTasksCount} tasks`}
        accessibilityHint={
          showAll ? 'Double tap to limit visible tasks' : 'Double tap to show all tasks'
        }
        accessibilityRole="button"
      >
        <Text style={styles.showMoreText}>
          {showAll ? 'Show Less' : `Show All (${totalTasksCount - visibleTasksCount} more)`}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

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
  taskCountText: TextStyle;
  showMoreButton: ViewStyle;
  showMoreText: TextStyle;
}

const TaskListView: React.FC<TaskListViewProps> = ({
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
  const [taskLimit, setTaskLimit] = useState(10);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const result = await settingsService.loadSettings();
      if (result.success && result.data) {
        setTaskLimit(result.data.taskLimit);
      }
    };
    void loadSettings();
  }, []);

  // Calculate visible tasks based on limit
  const visibleTasks = showAll ? tasks : tasks.slice(0, taskLimit);
  const hasMoreTasks = tasks.length > taskLimit;

  const renderTask = ({ item }: { item: Task }) => (
    <TaskItem
      task={item}
      onPress={() => {
        onTaskPress(item);
      }}
      currentUser={currentUser}
      partner={partner}
    />
  );

  return (
    <View style={styles.container} testID="task-list-view">
      <CategoryFilter
        partner={partner}
        showAssignedOnly={showAssignedOnly}
        selectedCategory={selectedCategory}
        onToggleAssigned={onToggleAssigned}
        onCategorySelect={onCategorySelect}
      />

      {tasks.length === 0 ? (
        <View style={styles.emptyList}>
          <EmptyState />
        </View>
      ) : (
        <>
          <FlashList
            data={visibleTasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            estimatedItemSize={100}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={EmptyState}
            contentContainerStyle={styles.emptyContainer}
            testID="task-list"
          />
          <ShowMoreButton
            hasMoreTasks={hasMoreTasks}
            visibleTasksCount={visibleTasks.length}
            totalTasksCount={tasks.length}
            showAll={showAll}
            onToggle={() => {
              setShowAll(!showAll);
            }}
          />
        </>
      )}

      <TouchableOpacity
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
    paddingTop: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  categoryFilter: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    gap: 4,
  },
  categoryChipActive: {
    backgroundColor: '#4ECDC4',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryIcon: {
    fontSize: 16,
  },
  showMoreContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  taskCountText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  showMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  showMoreText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});

export default TaskListView;
