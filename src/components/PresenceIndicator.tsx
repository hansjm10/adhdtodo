// ABOUTME: Component for displaying user presence status (online, away, offline)
// Shows real-time status with visual indicators and activity descriptions

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePresence } from '../contexts/PresenceContext';
import { PresenceState } from '../services/PresenceService';

interface PresenceIndicatorProps {
  userId: string;
  showActivity?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
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
  style?: any;
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
  style?: any;
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
});

export default PresenceIndicator;
