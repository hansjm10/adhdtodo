// ABOUTME: Dashboard for accountability partners to track assigned task progress
// Shows task completion stats, overdue tasks, and progress visualization

import React, { useState, useEffect, useCallback } from 'react';
import type { ViewStyle, TextStyle } from 'react-native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import type { ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import UserStorageService from '../../../src/services/UserStorageService';
import TaskStorageService from '../../../src/services/TaskStorageService';
import PartnershipService from '../../../src/services/PartnershipService';
import NotificationService from '../../../src/services/NotificationService';
import { TASK_PRIORITY, TASK_STATUS } from '../../../src/constants/TaskConstants';
import { DEFAULT_ENCOURAGEMENT_MESSAGES } from '../../../src/constants/UserConstants';
import type { User } from '../../../src/types/user.types';
import type { Task } from '../../../src/types/task.types';
import type { Partnership } from '../../../src/types/user.types';

interface TaskStats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  completionRate: number;
}

interface StatusIcon {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface TabButtonProps {
  tab: string;
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

const TabButton = ({ tab, label, count, isActive, onPress }: TabButtonProps) => (
  <TouchableOpacity
    style={[styles.tabButton, isActive && styles.tabButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
    {count > 0 && (
      <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
        <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

interface Styles {
  container: ViewStyle;
  loadingContainer: ViewStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  goToPartnershipButton: ViewStyle;
  goToPartnershipText: TextStyle;
  header: ViewStyle;
  partnerName: TextStyle;
  subtitle: TextStyle;
  statsContainer: ViewStyle;
  statCard: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  progressBar: ViewStyle;
  progressFill: ViewStyle;
  statsRow: ViewStyle;
  statItem: ViewStyle;
  statItemValue: TextStyle;
  statItemLabel: TextStyle;
  statItemActive: ViewStyle;
  statItemCompleted: ViewStyle;
  statItemOverdue: ViewStyle;
  statItemValueActive: TextStyle;
  statItemValueCompleted: TextStyle;
  statItemValueOverdue: TextStyle;
  tabContainer: ViewStyle;
  tabButton: ViewStyle;
  tabButtonActive: ViewStyle;
  tabLabel: TextStyle;
  tabLabelActive: TextStyle;
  tabBadge: ViewStyle;
  tabBadgeActive: ViewStyle;
  tabBadgeText: TextStyle;
  tabBadgeTextActive: TextStyle;
  taskList: ViewStyle;
  taskCard: ViewStyle;
  taskHeader: ViewStyle;
  taskInfo: ViewStyle;
  taskTitle: TextStyle;
  taskMeta: ViewStyle;
  priorityIndicator: ViewStyle;
  dueText: TextStyle;
  overdueText: TextStyle;
  inProgressText: TextStyle;
  timeSpentText: TextStyle;
  encourageButton: ViewStyle;
  encourageButtonText: TextStyle;
  emptyTaskContainer: ViewStyle;
  emptyTaskText: TextStyle;
  assignButton: ViewStyle;
  assignButtonText: TextStyle;
}

const PartnerDashboardScreen = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all'); // all, active, completed, overdue

  const isOverdue = useCallback((task: Task): boolean => {
    return !!(task.dueDate && new Date(task.dueDate) < new Date() && !task.completed);
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const user = await UserStorageService.getCurrentUser();
      setCurrentUser(user);

      if (user) {
        const activePartnership = await PartnershipService.getActivePartnership(user.id);
        setPartnership(activePartnership);

        if (activePartnership) {
          const partnerId =
            activePartnership.adhdUserId === user.id
              ? activePartnership.partnerId
              : activePartnership.adhdUserId;
          const partnerUser = partnerId ? await UserStorageService.getUserById(partnerId) : null;
          setPartner(partnerUser);
        }
      }
    } catch (error) {
      // Error loading data
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    if (!currentUser) return;

    try {
      const tasks = await TaskStorageService.getTasksAssignedByUser(currentUser.id);

      let filteredTasks = tasks;
      switch (selectedTab) {
        case 'active':
          filteredTasks = tasks.filter((t) => !t.completed && !isOverdue(t));
          break;
        case 'completed':
          filteredTasks = tasks.filter((t) => t.completed);
          break;
        case 'overdue':
          filteredTasks = tasks.filter((t) => !t.completed && isOverdue(t));
          break;
      }

      // Sort tasks by priority and due date
      filteredTasks.sort((a, b) => {
        const aCompleted = a.completed;
        const bCompleted = b.completed;
        if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
        if (isOverdue(a) && !isOverdue(b)) return -1;
        if (!isOverdue(a) && isOverdue(b)) return 1;
        if (a.dueDate && b.dueDate)
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return 0;
      });

      setAssignedTasks(filteredTasks);
    } catch (error) {
      // Error loading tasks
    }
  }, [currentUser, selectedTab, isOverdue]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  useEffect(() => {
    loadInitialData().catch(() => {});
  }, [loadInitialData]);

  useFocusEffect(
    React.useCallback(() => {
      if (currentUser) {
        loadTasks().catch(() => {});
      }
    }, [currentUser, selectedTab, loadTasks]),
  );

  const getTaskStats = (): TaskStats => {
    const total = assignedTasks.length;
    const completed = assignedTasks.filter((t) => t.completed).length;
    const active = assignedTasks.filter((t) => !t.completed && !isOverdue(t)).length;
    const overdue = assignedTasks.filter((t) => isOverdue(t)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, active, overdue, completionRate };
  };

  const sendEncouragement = useCallback(
    async (task: Task) => {
      if (!partner || !currentUser) return;

      const randomMessage =
        DEFAULT_ENCOURAGEMENT_MESSAGES[
          Math.floor(Math.random() * DEFAULT_ENCOURAGEMENT_MESSAGES.length)
        ];

      const sent = await NotificationService.sendEncouragement(
        currentUser.id,
        partner.id,
        randomMessage,
        task.id,
      );

      if (sent && partnership) {
        await PartnershipService.incrementPartnershipStat(partnership.id, 'encouragementsSent');
        Alert.alert('Success', 'Encouragement sent! 💪');
      }
    },
    [partner, currentUser, partnership],
  );

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case TASK_PRIORITY.LOW:
        return '#27AE60';
      case TASK_PRIORITY.MEDIUM:
        return '#F39C12';
      case TASK_PRIORITY.HIGH:
        return '#E74C3C';
      case TASK_PRIORITY.URGENT:
        return '#C0392B';
      default:
        return '#7F8C8D';
    }
  };

  const getStatusIcon = (task: Task): StatusIcon => {
    if (task.completed) {
      return { name: 'checkmark-circle', color: '#27AE60' };
    }
    if (task.status === TASK_STATUS.IN_PROGRESS) {
      return { name: 'play-circle', color: '#3498DB' };
    }
    if (isOverdue(task)) {
      return { name: 'alert-circle', color: '#E74C3C' };
    }
    return { name: 'time-outline', color: '#7F8C8D' };
  };

  const renderTaskItem: ListRenderItem<Task> = ({ item: task }) => {
    const statusIcon = getStatusIcon(task);
    const timeUntilDue = task.dueDate
      ? new Date(task.dueDate).getTime() - new Date().getTime()
      : null;
    const daysUntilDue = timeUntilDue ? Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24)) : null;

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Ionicons name={statusIcon.name} size={24} color={statusIcon.color} />
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={styles.taskMeta}>
              {task.priority !== TASK_PRIORITY.MEDIUM && (
                <View
                  style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(task.priority) },
                  ]}
                />
              )}
              {task.dueDate && (
                <Text style={[styles.dueText, isOverdue(task) && styles.overdueText]}>
                  {isOverdue(task)
                    ? `Overdue by ${Math.abs(daysUntilDue!)} days`
                    : task.completed
                      ? `Completed ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'recently'}`
                      : `Due in ${daysUntilDue} days`}
                </Text>
              )}
              {task.status === TASK_STATUS.IN_PROGRESS && (
                <Text style={styles.inProgressText}>In Progress</Text>
              )}
            </View>
          </View>
        </View>

        {!task.completed && (
          <TouchableOpacity
            style={styles.encourageButton}
            onPress={() => {
              sendEncouragement(task).catch(() => {});
            }}
          >
            <Ionicons name="heart-outline" size={20} color="#E74C3C" />
            <Text style={styles.encourageButtonText}>Encourage</Text>
          </TouchableOpacity>
        )}

        {task.completed && task.timeSpent > 0 && (
          <Text style={styles.timeSpentText}>
            Time spent: {Math.round(task.timeSpent / 60)} min
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color="#BDC3C7" />
        <Text style={styles.emptyText}>No active partnership</Text>
        <TouchableOpacity
          style={styles.goToPartnershipButton}
          onPress={() => {
            router.push('/profile/partnership');
          }}
        >
          <Text style={styles.goToPartnershipText}>Set up Partnership</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = getTaskStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.partnerName}>{partner.name}&apos;s Progress</Text>
        <Text style={styles.subtitle}>Tracking {stats.total} assigned tasks</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completionRate}%</Text>
          <Text style={styles.statLabel}>Completion Rate</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.completionRate}%` }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statItem, styles.statItemActive]}>
            <Ionicons name="time-outline" size={24} color="#3498DB" />
            <Text style={[styles.statItemValue, styles.statItemValueActive]}>{stats.active}</Text>
            <Text style={styles.statItemLabel}>Active</Text>
          </View>
          <View style={[styles.statItem, styles.statItemCompleted]}>
            <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
            <Text style={[styles.statItemValue, styles.statItemValueCompleted]}>
              {stats.completed}
            </Text>
            <Text style={styles.statItemLabel}>Completed</Text>
          </View>
          <View style={[styles.statItem, styles.statItemOverdue]}>
            <Ionicons name="alert-circle" size={24} color="#E74C3C" />
            <Text style={[styles.statItemValue, styles.statItemValueOverdue]}>{stats.overdue}</Text>
            <Text style={styles.statItemLabel}>Overdue</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TabButton
          tab="all"
          label="All Tasks"
          count={0}
          isActive={selectedTab === 'all'}
          onPress={() => {
            setSelectedTab('all');
          }}
        />
        <TabButton
          tab="active"
          label="Active"
          count={stats.active}
          isActive={selectedTab === 'active'}
          onPress={() => {
            setSelectedTab('active');
          }}
        />
        <TabButton
          tab="completed"
          label="Completed"
          count={stats.completed}
          isActive={selectedTab === 'completed'}
          onPress={() => {
            setSelectedTab('completed');
          }}
        />
        <TabButton
          tab="overdue"
          label="Overdue"
          count={stats.overdue}
          isActive={selectedTab === 'overdue'}
          onPress={() => {
            setSelectedTab('overdue');
          }}
        />
      </View>

      <FlashList
        data={assignedTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.taskList}
        estimatedItemSize={120}
        ListEmptyComponent={
          <View style={styles.emptyTaskContainer}>
            <Text style={styles.emptyTaskText}>
              {selectedTab === 'all' ? 'No tasks assigned yet' : `No ${selectedTab} tasks`}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.assignButton}
        onPress={() => {
          router.push('/profile/partnership/assign');
        }}
      >
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.assignButtonText}>Assign New Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#7F8C8D',
    marginTop: 16,
    marginBottom: 24,
  },
  goToPartnershipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3498DB',
    borderRadius: 8,
  },
  goToPartnershipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  partnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  statLabel: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statItemLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#3498DB',
  },
  tabLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#3498DB',
  },
  tabBadge: {
    marginLeft: 8,
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: '#3498DB',
  },
  tabBadgeText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  tabBadgeTextActive: {
    color: 'white',
  },
  taskList: {
    paddingHorizontal: 20,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dueText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  overdueText: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  inProgressText: {
    fontSize: 12,
    color: '#3498DB',
    fontWeight: '600',
  },
  timeSpentText: {
    fontSize: 12,
    color: '#27AE60',
    marginTop: 8,
  },
  encourageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FADBD8',
    borderRadius: 20,
  },
  encourageButtonText: {
    fontSize: 14,
    color: '#E74C3C',
    marginLeft: 6,
    fontWeight: '600',
  },
  emptyTaskContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTaskText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  assignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statItemActive: {
    backgroundColor: '#EBF5FB',
  },
  statItemCompleted: {
    backgroundColor: '#D5F4E6',
  },
  statItemOverdue: {
    backgroundColor: '#FADBD8',
  },
  statItemValueActive: {
    color: '#3498DB',
  },
  statItemValueCompleted: {
    color: '#27AE60',
  },
  statItemValueOverdue: {
    color: '#E74C3C',
  },
});

export default PartnerDashboardScreen;
