// ABOUTME: Screen for displaying list of tasks with ADHD-friendly design
// Shows tasks in a clean, organized list with visual feedback and empty states

import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import TaskStorageService from '../services/TaskStorageService';
import TaskItem from '../components/TaskItem';

const TaskListScreen = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    const loadedTasks = await TaskStorageService.getAllTasks();
    setTasks(loadedTasks);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const renderTask = ({ item }) => {
    return (
      <TaskItem
        task={item}
        onUpdate={loadTasks}
        onPress={() => navigation.navigate('EditTask', { taskId: item.id })}
      />
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No tasks yet</Text>
      <Text style={styles.emptySubtitle}>Tap the + button to create your first task</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={EmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={tasks.length === 0 ? styles.emptyList : null}
      />

      <TouchableOpacity
        testID="add-task-button"
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateTask')}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default TaskListScreen;
