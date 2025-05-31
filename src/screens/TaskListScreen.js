// ABOUTME: Screen for displaying list of tasks with ADHD-friendly design
// Shows tasks in a clean, organized list with visual feedback and empty states

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import TaskStorageService from '../services/TaskStorageService';
import UserStorageService from '../services/UserStorageService';
import PartnershipService from '../services/PartnershipService';
import TaskItem from '../components/TaskItem';
import { TASK_CATEGORIES } from '../constants/TaskConstants';

const TaskListScreen = () => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [partner, setPartner] = useState(null);
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);

  const loadUserData = async () => {
    try {
      const user = await UserStorageService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        const activePartnership = await PartnershipService.getActivePartnership(user.id);
        if (activePartnership) {
          const partnerId =
            activePartnership.adhdUserId === user.id
              ? activePartnership.partnerId
              : activePartnership.adhdUserId;
          const partnerUser = await UserStorageService.getUserById(partnerId);
          setPartner(partnerUser);
        }
      }
    } catch (error) {
      // Error loading user data
    }
  };

  const loadTasks = async () => {
    if (!currentUser) return;

    let loadedTasks;
    if (showAssignedOnly) {
      // Show only tasks assigned by/to partner
      loadedTasks = await TaskStorageService.getAssignedTasks(currentUser.id);
    } else if (selectedCategory) {
      // Show tasks for current user in selected category
      const userTasks = await TaskStorageService.getTasksForUser(currentUser.id);
      loadedTasks = userTasks.filter((task) => task.category === selectedCategory);
    } else {
      // Show all tasks for current user
      loadedTasks = await TaskStorageService.getTasksForUser(currentUser.id);
    }

    // Sort tasks: incomplete first, then by priority and due date
    loadedTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

    setTasks(loadedTasks);
  };

  useEffect(() => {
    loadUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (currentUser) {
        loadTasks();
      }
    }, [selectedCategory, showAssignedOnly, currentUser]),
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
        currentUser={currentUser}
        partner={partner}
      />
    );
  };

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
      <TouchableOpacity
        style={[styles.categoryChip, showAssignedOnly && styles.categoryChipActive]}
        onPress={() => {
          setShowAssignedOnly(!showAssignedOnly);
          setSelectedCategory(null);
        }}
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
        Object.values(TASK_CATEGORIES).map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
              { borderColor: category.color },
            ]}
            onPress={() => setSelectedCategory(category.id)}
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
      <FlatList
        testID="task-list"
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
