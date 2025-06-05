// ABOUTME: Component for displaying user presence status (online, away, offline)
// Shows real-time status with visual indicators and activity descriptions

import React from 'react';
import type { ViewStyle } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import { usePresence } from '../contexts/PresenceContext';
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

  const getStatusColor = (status: PresenceState['status']): string => {
    switch (status) {
      case 'online':
        return '#4CAF50'; // Green
      case 'away':
        return '#FF9800'; // Orange
      case 'offline':
        return '#9E9E9E'; // Gray
      default:
        return '#9E9E9E';
    }
  };

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
  const statusColor = getStatusColor(presence.status);

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.statusDot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: statusColor,
            borderRadius: dotSize / 2,
          },
        ]}
      />
      {size !== 'small' && (
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { fontSize: size === 'large' ? 14 : 12 }]}>
            {getStatusText(presence.status)}
          </Text>
          {activity && presence.status !== 'offline' && (
            <Text style={[styles.activityText, { fontSize: size === 'large' ? 12 : 10 }]}>
              {activity}
            </Text>
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

  const getStatusColor = (status: PresenceState['status']): string => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'away':
        return '#FF9800';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: getStatusColor(presence.status),
        },
        style,
      ]}
    />
  );
};

interface PresenceListProps {
  userIds: string[];
  style?: object;
}

export const PresenceList: React.FC<PresenceListProps> = ({ userIds, style }) => {
  return (
    <View style={[styles.list, style]}>
      {userIds.map((userId) => (
        <PresenceIndicator key={userId} userId={userId} size="medium" style={styles.listItem} />
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
    <View style={[styles.taskPresenceContainer, style]}>
      <View style={styles.editorsContainer}>
        {taskEditors.slice(0, 3).map((presence, index) => (
          <PresenceBadge
            key={presence.userId}
            userId={presence.userId}
            size={16}
            style={[styles.editorBadge, { marginLeft: index > 0 ? -6 : 0 }]}
          />
        ))}
        {taskEditors.length > 3 && (
          <View style={styles.overflowBadge}>
            <Text style={styles.overflowText}>+{taskEditors.length - 3}</Text>
          </View>
        )}
      </View>
      <Text style={styles.taskPresenceText}>
        {taskEditors.length === 1 ? 'editing' : `${taskEditors.length} editing`}
      </Text>
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
    <View style={[styles.collaboratorContainer, style]}>
      {displayCollaborators.map((presence, index) => (
        <View
          key={presence!.userId}
          style={[
            styles.collaboratorAvatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: index > 0 ? -size * 0.3 : 0,
              zIndex: displayCollaborators.length - index,
            },
          ]}
        >
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
            {presence!.userId.charAt(0).toUpperCase()}
          </Text>
          <PresenceBadge userId={presence!.userId} size={size * 0.25} style={styles.avatarBadge} />
        </View>
      ))}

      {remainingCount > 0 && (
        <View
          style={[
            styles.overflowAvatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size * 0.3,
            },
          ]}
        >
          <Text style={[styles.overflowAvatarText, { fontSize: size * 0.3 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  statusDot: {
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontWeight: '600',
    color: '#333',
  },
  activityText: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 1,
  },
  badge: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  list: {
    padding: 8,
  },
  listItem: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  taskPresenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  editorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorBadge: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  taskPresenceText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
  collaboratorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collaboratorAvatar: {
    backgroundColor: '#2196f3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'relative',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  overflowAvatar: {
    backgroundColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PresenceIndicator;
