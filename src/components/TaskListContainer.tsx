// ABOUTME: Container component that connects TaskListView with data from contexts
// Handles data fetching and state management

import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useUser, useTasks } from '../contexts';
import TaskListView from './TaskListView';
import { Task } from '../types/task.types';

// Convert context's LegacyTask to Task
interface LegacyTask extends Omit<Task, 'completed' | 'createdAt' | 'updatedAt' | 'completedAt'> {
  isComplete: boolean;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

const legacyToTask = (legacy: LegacyTask): Task => ({
  ...legacy,
  completed: legacy.isComplete,
  createdAt: new Date(legacy.createdAt),
  updatedAt: legacy.updatedAt ? new Date(legacy.updatedAt) : new Date(legacy.createdAt),
  completedAt: legacy.completedAt ? new Date(legacy.completedAt) : null,
});

export const TaskListContainer: React.FC = () => {
  const router = useRouter();
  const { user: currentUser, partner } = useUser();
  const { tasks: allTasks, refreshTasks } = useTasks();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);

  // Convert and filter tasks
  const tasks = useMemo<Task[]>(() => {
    if (!currentUser) return [];

    let filtered = allTasks;

    if (showAssignedOnly) {
      filtered = allTasks.filter((task) => task.assignedBy && task.assignedBy !== currentUser.id);
    } else {
      filtered = allTasks.filter((task) => task.userId === currentUser.id);
      if (selectedCategory) {
        filtered = filtered.filter((task) => task.category === selectedCategory);
      }
    }

    // Convert to Task format and sort
    return filtered.map(legacyToTask).sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [allTasks, currentUser, selectedCategory, showAssignedOnly]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTasks();
    setRefreshing(false);
  };

  const handleTaskPress = (task: Task) => {
    router.push(`/task/${task.id}`);
  };

  const handleAddPress = () => {
    router.push('/task/create');
  };

  return (
    <TaskListView
      tasks={tasks}
      currentUser={currentUser}
      partner={partner}
      selectedCategory={selectedCategory}
      showAssignedOnly={showAssignedOnly}
      refreshing={refreshing}
      onTaskPress={handleTaskPress}
      onAddPress={handleAddPress}
      onRefresh={handleRefresh}
      onCategorySelect={setSelectedCategory}
      onToggleAssigned={setShowAssignedOnly}
    />
  );
};

export default TaskListContainer;
