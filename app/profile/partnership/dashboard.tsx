// ABOUTME: Mac-inspired partnership dashboard using NativeWind
// Clean task tracking interface with stats and progress visualization

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import type { ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import type { Ionicons } from '@expo/vector-icons';
import {
  ThemedText,
  ThemedContainer,
  ThemedButton,
  ThemedIcon,
  ThemedCard,
} from '../../../src/components/themed';
import {
  getProgressBarStyle,
  getTextColorStyle,
  PRIORITY_COLORS,
  STATUS_COLORS,
  spacing,
} from '../../../src/styles/dynamicStyles';
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
  name: string;
  color: string;
}

interface TabButtonProps {
  tab: string;
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}

const TabButton = ({ tab: _tab, label, count, isActive, onPress }: TabButtonProps) => (
  <TouchableOpacity
    className={`flex-1 flex-row items-center justify-center py-3 border-b-2 ${isActive ? 'border-primary-500' : 'border-transparent'}`}
    onPress={onPress}
  >
    <ThemedText variant="body" color={isActive ? 'primary' : 'tertiary'} weight="semibold">
      {label}
    </ThemedText>
    {count > 0 && (
      <View
        className={`ml-2 px-2 py-0.5 rounded-full ${isActive ? 'bg-primary-500' : 'bg-neutral-200'}`}
      >
        <ThemedText variant="caption" color={isActive ? 'white' : 'tertiary'} weight="semibold">
          {count}
        </ThemedText>
      </View>
    )}
  </TouchableOpacity>
);

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
    const priorityKey = priority.toLowerCase() as keyof typeof PRIORITY_COLORS;
    return PRIORITY_COLORS[priorityKey] ?? PRIORITY_COLORS.default;
  };

  const getStatusIcon = (task: Task): StatusIcon => {
    if (task.completed) {
      return { name: 'checkmark-circle', color: STATUS_COLORS.success };
    }
    if (task.status === TASK_STATUS.IN_PROGRESS) {
      return { name: 'play-circle', color: STATUS_COLORS.primary };
    }
    if (isOverdue(task)) {
      return { name: 'alert-circle', color: STATUS_COLORS.danger };
    }
    return { name: 'time-outline', color: PRIORITY_COLORS.default };
  };

  const renderTaskItem: ListRenderItem<Task> = ({ item: task }) => {
    const statusIcon = getStatusIcon(task);
    const timeUntilDue = task.dueDate
      ? new Date(task.dueDate).getTime() - new Date().getTime()
      : null;
    const daysUntilDue = timeUntilDue ? Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24)) : null;

    return (
      <View className="mb-3">
        <ThemedCard variant="outlined" spacing="medium">
          <View className="flex-row items-start">
            <ThemedIcon
              name={statusIcon.name as keyof typeof Ionicons.glyphMap}
              size="md"
              style={getTextColorStyle(statusIcon.color)}
            />
            <View className="flex-1 ml-3">
              <ThemedText
                variant="body"
                color="primary"
                weight="semibold"
                numberOfLines={2}
                className="mb-1"
              >
                {task.title}
              </ThemedText>
              <View className="flex-row items-center flex-wrap gap-2">
                {task.priority !== TASK_PRIORITY.MEDIUM && (
                  <View
                    className="w-2 h-2 rounded-full"
                    style={
                      getTextColorStyle(getPriorityColor(task.priority)).color
                        ? { backgroundColor: getPriorityColor(task.priority) }
                        : {}
                    }
                  />
                )}
                {task.dueDate && (
                  <ThemedText
                    variant="caption"
                    color={isOverdue(task) ? 'danger' : 'tertiary'}
                    weight={isOverdue(task) ? 'semibold' : 'medium'}
                  >
                    {(() => {
                      if (isOverdue(task)) {
                        return `Overdue by ${Math.abs(daysUntilDue!)} days`;
                      }
                      if (task.completed) {
                        return `Completed ${task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'recently'}`;
                      }
                      return `Due in ${daysUntilDue} days`;
                    })()}
                  </ThemedText>
                )}
                {task.status === TASK_STATUS.IN_PROGRESS && (
                  <ThemedText variant="caption" color="primary" weight="semibold">
                    In Progress
                  </ThemedText>
                )}
              </View>
            </View>
          </View>

          {!task.completed && (
            <TouchableOpacity
              className="flex-row items-center self-start mt-3 py-1.5 px-3 bg-danger-50 rounded-full"
              onPress={() => {
                sendEncouragement(task).catch(() => {});
              }}
            >
              <ThemedIcon name="heart-outline" size="sm" color="danger" />
              <ThemedText variant="caption" color="danger" weight="semibold" className="ml-1.5">
                Encourage
              </ThemedText>
            </TouchableOpacity>
          )}

          {task.completed && task.timeSpent > 0 && (
            <ThemedText variant="caption" color="success" className="mt-2">
              Time spent: {Math.round(task.timeSpent / 60)} min
            </ThemedText>
          )}
        </ThemedCard>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <ActivityIndicator size="large" color="#3498DB" />
      </ThemedContainer>
    );
  }

  if (!partner) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <View className="px-5">
          <ThemedIcon name="people-outline" size="xl" color="tertiary" />
          <ThemedText variant="h3" color="secondary" className="mt-4 mb-6">
            No active partnership
          </ThemedText>
          <ThemedButton
            label="Set up Partnership"
            variant="primary"
            size="medium"
            onPress={() => {
              router.push('/profile/partnership');
            }}
          />
        </View>
      </ThemedContainer>
    );
  }

  const stats = getTaskStats();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            onRefresh().catch((error) => {
              if (global.__DEV__) {
                console.error('Failed to refresh:', error);
              }
            });
          }}
        />
      }
    >
      {/* Header */}
      <View className="p-5 bg-white border-b border-neutral-200">
        <ThemedText variant="h2" color="primary" weight="bold">
          {partner.name}&apos;s Progress
        </ThemedText>
        <ThemedText variant="body" color="tertiary" className="mt-1">
          Tracking {stats.total} assigned tasks
        </ThemedText>
      </View>

      {/* Stats */}
      <View className="p-5">
        <View className="mb-4">
          <ThemedCard variant="elevated" spacing="large">
            <ThemedText variant="h1" color="primary" weight="bold">
              {stats.completionRate}%
            </ThemedText>
            <ThemedText variant="body" color="secondary" className="mt-1">
              Completion Rate
            </ThemedText>
            <View className="h-2 bg-neutral-200 rounded-full mt-3 overflow-hidden">
              <View
                className="h-full bg-primary-500 rounded-full"
                style={getProgressBarStyle(stats.completionRate)}
              />
            </View>
          </ThemedCard>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 items-center p-4 rounded-xl bg-blue-50">
            <ThemedIcon name="time-outline" size="md" color="primary" />
            <ThemedText variant="h3" color="primary" weight="bold" className="mt-2">
              {stats.active}
            </ThemedText>
            <ThemedText variant="caption" color="tertiary" className="mt-1">
              Active
            </ThemedText>
          </View>
          <View className="flex-1 items-center p-4 rounded-xl bg-success-50">
            <ThemedIcon name="checkmark-circle" size="md" color="success" />
            <ThemedText variant="h3" color="success" weight="bold" className="mt-2">
              {stats.completed}
            </ThemedText>
            <ThemedText variant="caption" color="tertiary" className="mt-1">
              Completed
            </ThemedText>
          </View>
          <View className="flex-1 items-center p-4 rounded-xl bg-danger-50">
            <ThemedIcon name="alert-circle" size="md" color="danger" />
            <ThemedText variant="h3" color="danger" weight="bold" className="mt-2">
              {stats.overdue}
            </ThemedText>
            <ThemedText variant="caption" color="tertiary" className="mt-1">
              Overdue
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 mb-4">
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

      {/* Task List */}
      <FlashList
        data={assignedTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={{ paddingHorizontal: spacing.xl }}
        estimatedItemSize={120}
        ListEmptyComponent={
          <View className="py-10 items-center">
            <ThemedText variant="body" color="tertiary">
              {selectedTab === 'all' ? 'No tasks assigned yet' : `No ${selectedTab} tasks`}
            </ThemedText>
          </View>
        }
      />

      {/* Assign Button */}
      <View className="m-5">
        <ThemedButton
          label="Assign New Task"
          variant="primary"
          size="large"
          icon="add-circle"
          onPress={() => {
            router.push('/profile/partnership/assign');
          }}
        />
      </View>
    </ScrollView>
  );
};

export default PartnerDashboardScreen;
