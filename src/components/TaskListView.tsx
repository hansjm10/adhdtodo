// ABOUTME: Mac-inspired dashboard view using NativeWind
// Clean, widget-style layout with ADHD-friendly visual hierarchy

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import TaskItem from './TaskItem';
import { ThemedContainer, ThemedText, ThemedButton, ThemedIcon } from './themed';
import NativePullToRefresh from './native/NativePullToRefresh';
import { ListSkeleton } from './native/NativeLoadingStates';
import GradientView from './native/GradientView';
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
  <View className="flex-1 justify-center items-center px-8 py-12">
    <ThemedIcon name="checkmark-circle-outline" size="xl" color="tertiary" />
    <ThemedText variant="h3" color="primary" align="center" className="mt-4 mb-2">
      No tasks yet
    </ThemedText>
    <ThemedText variant="body" color="secondary" align="center">
      Tap the + button to create your first task
    </ThemedText>
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
    className="bg-white py-3 border-b border-neutral-100"
    contentContainerClassName="px-4 gap-2"
  >
    {partner && (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-2 rounded-full border-2 mr-2 ${showAssignedOnly ? 'bg-primary-500 border-primary-500' : 'bg-neutral-50 border-neutral-200'}`}
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
        <ThemedText
          variant="caption"
          weight="medium"
          color={showAssignedOnly ? 'white' : 'secondary'}
        >
          Assigned
        </ThemedText>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      className={`flex-row items-center px-4 py-2 rounded-full border-2 mr-2 ${!selectedCategory && !showAssignedOnly ? 'bg-primary-500 border-primary-500' : 'bg-neutral-50 border-neutral-200'}`}
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
      <ThemedText
        variant="caption"
        weight="medium"
        color={!selectedCategory && !showAssignedOnly ? 'white' : 'secondary'}
      >
        All Tasks
      </ThemedText>
    </TouchableOpacity>

    {!showAssignedOnly &&
      Object.values(TASK_CATEGORIES).map((category: TaskCategory) => (
        <TouchableOpacity
          key={category.id}
          className={`flex-row items-center px-4 py-2 rounded-full border-2 mr-2 gap-1 ${selectedCategory === category.id ? 'bg-primary-500 border-primary-500' : 'bg-neutral-50 border-neutral-200'}`}
          onPress={() => {
            onCategorySelect(category.id);
          }}
          accessible
          accessibilityLabel={`Filter by ${category.label} category`}
          accessibilityHint={`Double tap to show only ${category.label} tasks`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedCategory === category.id }}
        >
          <Text className="text-base">{category.icon}</Text>
          <ThemedText
            variant="caption"
            weight="medium"
            color={selectedCategory === category.id ? 'white' : 'secondary'}
          >
            {category.label}
          </ThemedText>
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
    <View className="items-center py-4 bg-white border-t border-neutral-100">
      <ThemedText variant="caption" color="secondary" className="mb-2">
        Showing {visibleTasksCount} of {totalTasksCount} tasks
      </ThemedText>
      <ThemedButton
        label={showAll ? 'Show Less' : `Show All (${totalTasksCount - visibleTasksCount} more)`}
        variant="ghost"
        size="small"
        onPress={onToggle}
        testID="show-more-button"
      />
    </View>
  );
};

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
      const settings = await settingsService.loadSettings();
      setTaskLimit(settings.taskLimit);
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
    <ThemedContainer variant="screen" testID="task-list-view">
      <CategoryFilter
        partner={partner}
        showAssignedOnly={showAssignedOnly}
        selectedCategory={selectedCategory}
        onToggleAssigned={onToggleAssigned}
        onCategorySelect={onCategorySelect}
      />

      {(() => {
        if (refreshing && tasks.length === 0) {
          return <ListSkeleton count={5} />;
        }
        if (tasks.length === 0) {
          return <EmptyState />;
        }
        return (
          <>
            <NativePullToRefresh
              onRefresh={async () => {
                onRefresh();
                await Promise.resolve();
              }}
              data={visibleTasks}
              renderItem={renderTask}
              keyExtractor={(item: Task) => item.id}
              estimatedItemSize={100}
              ListEmptyComponent={EmptyState}
              contentContainerClassName="pt-2"
              useFlashList
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
        );
      })()}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full justify-center items-center"
        onPress={onAddPress}
        accessible
        accessibilityLabel="Add new task"
        accessibilityHint="Double tap to create a new task"
        accessibilityRole="button"
      >
        <GradientView
          variant="primary"
          className="w-full h-full rounded-full justify-center items-center"
          style={Platform.select({
            ios: {
              shadowColor: '#a855f7',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            },
            android: {
              elevation: 8,
            },
          })}
        >
          <ThemedIcon name="add" size="lg" color="white" />
        </GradientView>
      </TouchableOpacity>
    </ThemedContainer>
  );
};

export default TaskListView;
