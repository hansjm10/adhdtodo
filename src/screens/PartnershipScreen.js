// ABOUTME: Partnership management screen for viewing and managing accountability partnerships
// Displays current partnership status, allows invite creation, and partnership settings

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserStorageService from '../services/UserStorageService';
import PartnershipService from '../services/PartnershipService';
import { PARTNERSHIP_STATUS, USER_ROLE } from '../constants/UserConstants';

const PartnershipScreen = ({ navigation }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [partnership, setPartnership] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState(null);

  useEffect(() => {
    loadPartnershipData();
  }, []);

  const loadPartnershipData = async () => {
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
          const partnerUser = await UserStorageService.getUserById(partnerId);
          setPartner(partnerUser);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load partnership data');
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    try {
      const invitedRole =
        currentUser.role === USER_ROLE.ADHD_USER ? USER_ROLE.PARTNER : USER_ROLE.ADHD_USER;

      const newPartnership = await PartnershipService.createPartnershipInvite(
        currentUser.id,
        invitedRole,
      );

      if (newPartnership) {
        setInviteCode(newPartnership.inviteCode);
        Alert.alert(
          'Invite Created!',
          `Your invite code is: ${newPartnership.inviteCode}\n\nShare this code with your ${
            invitedRole === USER_ROLE.PARTNER ? 'accountability partner' : 'ADHD buddy'
          }.`,
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create invite');
    }
  };

  const shareInviteCode = async () => {
    if (!inviteCode) return;

    try {
      await Share.share({
        message: `Join me on ADHD Todo! Use this invite code to become my ${
          currentUser.role === USER_ROLE.ADHD_USER ? 'accountability partner' : 'ADHD buddy'
        }: ${inviteCode}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite code');
    }
  };

  const navigateToInviteScreen = () => {
    navigation.navigate('PartnerInvite');
  };

  const endPartnership = async () => {
    Alert.alert(
      'End Partnership?',
      'Are you sure you want to end this partnership? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Partnership',
          style: 'destructive',
          onPress: async () => {
            try {
              const terminated = await PartnershipService.terminatePartnership(partnership);
              if (terminated) {
                await loadPartnershipData();
                Alert.alert('Partnership Ended', 'The partnership has been terminated.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to end partnership');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  const renderNoPartnership = () => (
    <View style={styles.noPartnershipContainer}>
      <Ionicons name="people-outline" size={80} color="#BDC3C7" />
      <Text style={styles.noPartnershipTitle}>No Active Partnership</Text>
      <Text style={styles.noPartnershipText}>
        {currentUser?.role === USER_ROLE.ADHD_USER
          ? 'Connect with an accountability partner to help you stay on track!'
          : 'Connect with someone who needs your support to stay organized!'}
      </Text>

      <TouchableOpacity style={styles.primaryButton} onPress={createInvite}>
        <Text style={styles.primaryButtonText}>Create Invite Code</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={navigateToInviteScreen}>
        <Text style={styles.secondaryButtonText}>Enter Invite Code</Text>
      </TouchableOpacity>

      {inviteCode && (
        <View style={styles.inviteCodeContainer}>
          <Text style={styles.inviteCodeLabel}>Your Invite Code:</Text>
          <Text style={styles.inviteCode}>{inviteCode}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={shareInviteCode}>
            <Ionicons name="share-outline" size={20} color="#3498DB" />
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderActivePartnership = () => (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.partnerCard}>
        <View style={styles.partnerHeader}>
          <Ionicons name="person-circle-outline" size={60} color="#3498DB" />
          <View style={styles.partnerInfo}>
            <Text style={styles.partnerName}>{partner?.name || 'Partner'}</Text>
            <Text style={styles.partnerRole}>
              {partnership?.adhdUserId === currentUser?.id
                ? 'Your Accountability Partner'
                : 'Your ADHD Buddy'}
            </Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{partnership?.stats?.tasksAssigned || 0}</Text>
            <Text style={styles.statLabel}>Tasks Assigned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{partnership?.stats?.tasksCompleted || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{partnership?.stats?.encouragementsSent || 0}</Text>
            <Text style={styles.statLabel}>Encouragements</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {currentUser?.role !== USER_ROLE.ADHD_USER && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('TaskAssignment')}
          >
            <Ionicons name="add-circle-outline" size={24} color="#3498DB" />
            <Text style={styles.actionButtonText}>Assign Task</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('PartnerDashboard')}
        >
          <Ionicons name="bar-chart-outline" size={24} color="#3498DB" />
          <Text style={styles.actionButtonText}>View Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => {}}>
          <Ionicons name="settings-outline" size={24} color="#3498DB" />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.endPartnershipButton} onPress={endPartnership}>
        <Text style={styles.endPartnershipText}>End Partnership</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {partnership && partnership.status === PARTNERSHIP_STATUS.ACTIVE
        ? renderActivePartnership()
        : renderNoPartnership()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPartnershipContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPartnershipTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
  },
  noPartnershipText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 40,
  },
  primaryButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#3498DB',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#3498DB',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inviteCodeContainer: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCodeLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    letterSpacing: 4,
    marginBottom: 15,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EBF5FB',
  },
  shareButtonText: {
    color: '#3498DB',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  partnerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  partnerInfo: {
    marginLeft: 15,
    flex: 1,
  },
  partnerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  partnerRole: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498DB',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  actionsContainer: {
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 12,
    fontWeight: '600',
  },
  endPartnershipButton: {
    alignItems: 'center',
    padding: 15,
    marginTop: 30,
    marginBottom: 20,
  },
  endPartnershipText: {
    color: '#E74C3C',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PartnershipScreen;
