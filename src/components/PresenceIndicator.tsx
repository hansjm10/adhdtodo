// ABOUTME: Mac-inspired presence indicators using NativeWind
// Clean real-time status display with visual indicators and activity descriptions

import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text } from 'react-native';
import { ThemedText } from './themed';
import { usePresence } from '../contexts/PresenceContext';
import {
  getPresenceDotStyle,
  getAvatarStyle,
  getBadgePositionStyle,
} from '../styles/dynamicStyles';
import type { PresenceState } from '../services/PresenceService';

interface PresenceIndicatorProps {
  userId: string;
  showActivity?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  showActivity = true,
  size = 'medium',
  style,
}) => {
  const { presenceStates, getUserActivity } = usePresence();

  const presence = presenceStates.get(userId);
  const activity = showActivity ? getUserActivity(userId) : null;

  if (!presence) {
    return null;
  }

  const getStatusText = (status: PresenceState['status']): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getDotSize = (): number => {
    switch (size) {
      case 'small':
        return 8;
      case 'medium':
        return 12;
      case 'large':
        return 16;
      default:
        return 12;
    }
  };

  const dotSize = getDotSize();

  return (
    <View className="flex-row items-center py-0.5" style={style}>
      <View
        className="mr-2 border-2 border-white shadow-sm"
        style={getPresenceDotStyle(presence.status, dotSize)}
      />
      {size !== 'small' && (
        <View className="flex-1">
          <ThemedText
            variant={size === 'large' ? 'body' : 'caption'}
            color="primary"
            weight="semibold"
          >
            {getStatusText(presence.status)}
          </ThemedText>
          {activity && presence.status !== 'offline' && (
            <ThemedText
              variant={size === 'large' ? 'caption' : 'caption'}
              color="tertiary"
              className="mt-0.5 italic"
            >
              {activity}
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
};

interface PresenceBadgeProps {
  userId: string;
  size?: number;
  style?: object;
}

export const PresenceBadge: React.FC<PresenceBadgeProps> = ({ userId, size = 12, style }) => {
  const { presenceStates } = usePresence();
  const presence = presenceStates.get(userId);

  if (!presence) {
    return null;
  }

  return (
    <View
      className="border-2 border-white shadow-sm"
      style={[getPresenceDotStyle(presence.status, size), style]}
    />
  );
};

interface PresenceListProps {
  userIds: string[];
  style?: object;
}

export const PresenceList: React.FC<PresenceListProps> = ({ userIds, style }) => {
  return (
    <View className="p-2" style={style}>
      {userIds.map((userId) => (
        <View key={userId} className="mb-2 px-3 py-2 rounded-lg bg-neutral-100">
          <PresenceIndicator userId={userId} size="medium" />
        </View>
      ))}
    </View>
  );
};

interface TaskPresenceIndicatorProps {
  taskId: string;
  currentUserId?: string;
  style?: object;
}

export const TaskPresenceIndicator: React.FC<TaskPresenceIndicatorProps> = ({
  taskId,
  currentUserId,
  style,
}) => {
  const { presenceStates } = usePresence();

  const taskEditors = Array.from(presenceStates.values()).filter(
    (presence) =>
      presence.currentTaskId === taskId &&
      presence.userId !== currentUserId &&
      presence.status === 'online',
  );

  if (taskEditors.length === 0) {
    return null;
  }

  return (
    <View
      className="flex-row items-center bg-primary-50 px-2 py-1 rounded-button gap-1.5"
      style={style}
    >
      <View className="flex-row items-center">
        {taskEditors.slice(0, 3).map((presence, index) => (
          <View
            key={presence.userId}
            className="border-2 border-white"
            style={index > 0 ? getAvatarStyle(16, index) : undefined}
          >
            <PresenceBadge userId={presence.userId} size={16} />
          </View>
        ))}
        {taskEditors.length > 3 && (
          <View className="w-4 h-4 rounded-full bg-neutral-500 items-center justify-center border-2 border-white -ml-1.5">
            <Text className="text-xs text-white font-bold">+{taskEditors.length - 3}</Text>
          </View>
        )}
      </View>
      <ThemedText variant="caption" color="primary" weight="medium">
        {taskEditors.length === 1 ? 'editing' : `${taskEditors.length} editing`}
      </ThemedText>
    </View>
  );
};

interface CollaboratorAvatarsProps {
  userIds: string[];
  maxDisplay?: number;
  size?: number;
  style?: object;
}

export const CollaboratorAvatars: React.FC<CollaboratorAvatarsProps> = ({
  userIds,
  maxDisplay = 3,
  size = 32,
  style,
}) => {
  const { presenceStates } = usePresence();

  const onlineCollaborators = userIds
    .map((userId) => presenceStates.get(userId))
    .filter((presence) => presence && presence.status === 'online');

  if (onlineCollaborators.length === 0) {
    return null;
  }

  const displayCollaborators = onlineCollaborators.slice(0, maxDisplay);
  const remainingCount = onlineCollaborators.length - maxDisplay;

  return (
    <View className="flex-row items-center" style={style}>
      {displayCollaborators.map((presence, index) => (
        <View
          key={presence!.userId}
          className="bg-primary-500 items-center justify-center border-2 border-white relative"
          style={{
            ...getAvatarStyle(size),
            zIndex: displayCollaborators.length - index,
          }}
        >
          <Text className="text-white font-bold text-base">
            {presence!.userId.charAt(0).toUpperCase()}
          </Text>
          <PresenceBadge
            userId={presence!.userId}
            size={size * 0.25}
            style={getBadgePositionStyle('bottom-right')}
          />
        </View>
      ))}

      {remainingCount > 0 && (
        <View
          className="bg-neutral-500 items-center justify-center border-2 border-white"
          style={getAvatarStyle(size, 1)}
        >
          <Text className="text-white font-bold text-sm">+{remainingCount}</Text>
        </View>
      )}
    </View>
  );
};

export default PresenceIndicator;
