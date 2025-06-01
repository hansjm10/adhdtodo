// ABOUTME: Profile screen showing user information and account settings
// Includes logout functionality and password change options

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts';
import AuthService from '../services/AuthService';
import { USER_ROLE } from '../constants/UserConstants';
import { ProfileScreenNavigationProp } from '../types/navigation.types';
import { UserRole } from '../types/user.types';

interface _ProfileScreenProps {
  navigation?: ProfileScreenNavigationProp;
}

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  showArrow?: boolean;
}

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogout = async (): Promise<void> => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async (): Promise<void> => {
          setLoading(true);
          const result = await AuthService.logout();
          if (result.success) {
            // Navigate to auth screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          } else {
            Alert.alert('Error', 'Failed to logout. Please try again.');
            setLoading(false);
          }
        },
      },
    ]);
  };

  const getUserRoleLabel = (role: UserRole | string): string => {
    switch (role) {
      case USER_ROLE.ADHD_USER:
        return 'ADHD User';
      case USER_ROLE.PARTNER:
        return 'Accountability Partner';
      case USER_ROLE.BOTH:
        return 'Both ADHD User & Partner';
      default:
        return role;
    }
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  if (!currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const MenuItem = ({ icon, label, onPress, color = '#333', showArrow = true }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={loading}>
      <View style={styles.menuItemContent}>
        <Ionicons name={icon} size={24} color={color} style={styles.menuIcon} />
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={20} color="#999" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.userName}>{currentUser.name || 'Anonymous'}</Text>
          <Text style={styles.userEmail}>{currentUser.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getUserRoleLabel(currentUser.role)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem
            icon="key-outline"
            label="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon!')}
          />
          <MenuItem
            icon="mail-outline"
            label="Email Preferences"
            onPress={() => Alert.alert('Coming Soon', 'Email preferences coming soon!')}
          />
          <MenuItem
            icon="notifications-outline"
            label="Notification Settings"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon!')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentUser.stats?.tasksCompleted || 0}</Text>
              <Text style={styles.statLabel}>Tasks Done</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentUser.stats?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentUser.stats?.totalXP || 0}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>{formatDate(currentUser.createdAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Login</Text>
            <Text style={styles.infoValue}>{formatDate(currentUser.lastLoginAt)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account ID</Text>
            <Text style={styles.infoValue}>{currentUser.id.slice(-8)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <MenuItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            color="#E74C3C"
            showArrow={false}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ADHD Todo v1.0.0</Text>
          <Text style={styles.footerText}>Your accountability partner app</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

interface Styles {
  container: ViewStyle;
  centered: ViewStyle;
  errorText: TextStyle;
  header: ViewStyle;
  avatarContainer: ViewStyle;
  avatarText: TextStyle;
  userName: TextStyle;
  userEmail: TextStyle;
  roleBadge: ViewStyle;
  roleText: TextStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  menuItem: ViewStyle;
  menuItemContent: ViewStyle;
  menuIcon: ViewStyle;
  menuLabel: TextStyle;
  statsContainer: ViewStyle;
  statItem: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  infoRow: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
  footer: ViewStyle;
  footerText: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuLabel: {
    fontSize: 16,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  infoValue: {
    fontSize: 16,
    color: '#2C3E50',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
});

export default ProfileScreen;
