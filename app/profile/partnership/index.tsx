// ABOUTME: Mac-inspired partnership screen using NativeWind
// Clean partnership management with invite creation and stats

import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ThemedText,
  ThemedContainer,
  ThemedButton,
  ThemedIcon,
  ThemedCard,
} from '../../../src/components/themed';
import UserStorageService from '../../../src/services/UserStorageService';
import PartnershipService from '../../../src/services/PartnershipService';
import { terminatePartnership } from '../../../src/utils/PartnershipModel';
import { PARTNERSHIP_STATUS, USER_ROLE } from '../../../src/constants/UserConstants';
import type { User, Partnership, UserRole } from '../../../src/types/user.types';

const PartnershipScreen = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const loadPartnershipData = useCallback(async (): Promise<void> => {
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
          if (partnerId) {
            const partnerUser = await UserStorageService.getUserById(partnerId);
            if (partnerUser) {
              setPartner(partnerUser);
            } else {
              // Handle deleted partner
              Alert.alert(
                'Partner Not Found',
                'Your partner account appears to have been deleted.',
                [
                  {
                    text: 'OK',
                    onPress: (): void => {
                      if (activePartnership) {
                        const updatedPartnership = terminatePartnership(activePartnership);
                        PartnershipService.updatePartnership(updatedPartnership)
                          .then(() => {
                            setPartnership(null);
                            setPartner(null);
                          })
                          .catch((error) => {
                            if (global.__DEV__) {
                              console.error('Failed to terminate partnership:', error);
                            }
                          });
                      }
                    },
                  },
                ],
              );
            }
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load partnership data');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvite = useCallback(async (): Promise<void> => {
    try {
      if (!currentUser) return;

      const invitedRole: UserRole =
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
  }, [currentUser]);

  const shareInviteCode = useCallback(async (): Promise<void> => {
    if (!inviteCode || !currentUser) return;

    try {
      await Share.share({
        message: `Join me on ADHD Todo! Use this invite code to become my ${
          currentUser.role === USER_ROLE.ADHD_USER ? 'accountability partner' : 'ADHD buddy'
        }: ${inviteCode}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite code');
    }
  }, [inviteCode, currentUser]);

  const navigateToInviteScreen = useCallback((): void => {
    router.push('/profile/partnership/invite');
  }, [router]);

  const endPartnership = useCallback((): void => {
    if (!partnership) return;

    Alert.alert(
      'End Partnership?',
      'Are you sure you want to end this partnership? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Partnership',
          style: 'destructive',
          onPress: (): void => {
            const updatedPartnership = terminatePartnership(partnership);
            PartnershipService.updatePartnership(updatedPartnership)
              .then((success) => {
                if (success) {
                  return loadPartnershipData();
                }
                return Promise.resolve();
              })
              .then(() => {
                Alert.alert('Partnership Ended', 'The partnership has been terminated.');
              })
              .catch(() => {
                Alert.alert('Error', 'Failed to end partnership');
              });
          },
        },
      ],
    );
  }, [partnership, loadPartnershipData]);

  useEffect(() => {
    loadPartnershipData().catch((error) => {
      if (global.__DEV__) {
        console.error('Failed to load partnership data:', error);
      }
    });
  }, [loadPartnershipData]);

  if (loading) {
    return (
      <ThemedContainer variant="screen" safeArea centered>
        <ActivityIndicator size="large" color="#3498DB" />
      </ThemedContainer>
    );
  }

  const renderNoPartnership = (): React.ReactElement => (
    <View className="flex-1 justify-center items-center px-5">
      <ThemedIcon name="people-outline" size="xl" color="tertiary" />
      <ThemedText variant="h2" color="primary" weight="bold" align="center" className="mt-5 mb-2.5">
        No Active Partnership
      </ThemedText>
      <ThemedText variant="body" color="secondary" align="center" className="mb-8 px-5">
        {currentUser?.role === USER_ROLE.ADHD_USER
          ? 'Connect with an accountability partner to help you stay on track!'
          : 'Connect with someone who needs your support to stay organized!'}
      </ThemedText>

      <View className="mb-4 px-8">
        <ThemedButton
          label="Create Invite Code"
          variant="primary"
          size="large"
          onPress={() => {
            createInvite().catch((error) => {
              if (global.__DEV__) {
                console.error('Failed to create invite:', error);
              }
            });
          }}
          icon={<ThemedIcon name="add-circle-outline" size="sm" color="white" />}
        />
      </View>

      <View className="px-8">
        <ThemedButton
          label="Enter Invite Code"
          variant="secondary"
          size="large"
          onPress={navigateToInviteScreen}
          icon={<ThemedIcon name="enter-outline" size="sm" color="primary" />}
        />
      </View>

      {inviteCode && (
        <View className="items-center mt-10">
          <ThemedCard variant="elevated" spacing="large">
            <View className="items-center">
              <ThemedText variant="caption" color="tertiary" className="mb-2">
                Your Invite Code:
              </ThemedText>
              <ThemedText
                variant="h1"
                color="primary"
                weight="bold"
                className="mb-4 tracking-wider"
              >
                {inviteCode}
              </ThemedText>
              <TouchableOpacity
                className="flex-row items-center bg-primary-50 px-5 py-2.5 rounded-lg"
                onPress={() => {
                  shareInviteCode().catch((error) => {
                    if (global.__DEV__) {
                      console.error('Failed to share invite code:', error);
                    }
                  });
                }}
              >
                <ThemedIcon name="share-outline" size="sm" color="primary" />
                <ThemedText variant="body" color="primary" weight="semibold" className="ml-2">
                  Share Code
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedCard>
        </View>
      )}
    </View>
  );

  const renderActivePartnership = (): React.ReactElement => (
    <ScrollView className="flex-1 bg-neutral-50" showsVerticalScrollIndicator={false}>
      <View className="mx-5 mt-5">
        <ThemedCard variant="elevated" spacing="large">
          <View className="flex-row items-center mb-5">
            <ThemedIcon name="person-circle-outline" size="xl" color="primary" />
            <View className="ml-4 flex-1">
              <ThemedText variant="h3" color="primary" weight="bold">
                {partner?.name ?? 'Partner'}
              </ThemedText>
              <ThemedText variant="body" color="secondary" className="mt-1">
                {partnership?.adhdUserId === currentUser?.id
                  ? 'Your Accountability Partner'
                  : 'Your ADHD Buddy'}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-around pt-4 border-t border-neutral-200">
            <View className="items-center">
              <ThemedText variant="h2" color="primary" weight="bold">
                {partnership?.stats?.tasksAssigned ?? 0}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" className="mt-1">
                Tasks Assigned
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText variant="h2" color="primary" weight="bold">
                {partnership?.stats?.tasksCompleted ?? 0}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" className="mt-1">
                Completed
              </ThemedText>
            </View>
            <View className="items-center">
              <ThemedText variant="h2" color="primary" weight="bold">
                {partnership?.stats?.encouragementsSent ?? 0}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" className="mt-1">
                Encouragements
              </ThemedText>
            </View>
          </View>
        </ThemedCard>
      </View>

      <View className="px-5 mt-6">
        {currentUser?.role !== USER_ROLE.ADHD_USER && (
          <TouchableOpacity
            className="flex-row items-center bg-white p-4 rounded-xl mb-3 shadow-sm"
            onPress={() => {
              router.push({ pathname: '/profile/partnership/assign', params: { taskId: '' } });
            }}
          >
            <ThemedIcon name="add-circle-outline" size="md" color="primary" />
            <ThemedText variant="body" color="primary" weight="semibold" className="ml-3">
              Assign Task
            </ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="flex-row items-center bg-white p-4 rounded-xl mb-3 shadow-sm"
          onPress={() => {
            router.push('/profile/partnership/dashboard');
          }}
        >
          <ThemedIcon name="bar-chart-outline" size="md" color="primary" />
          <ThemedText variant="body" color="primary" weight="semibold" className="ml-3">
            View Progress
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center bg-white p-4 rounded-xl mb-3 shadow-sm"
          onPress={() => {
            Alert.alert(
              'Coming Soon',
              'Partnership settings will be available in the next update.',
            );
          }}
        >
          <ThemedIcon name="settings-outline" size="md" color="primary" />
          <ThemedText variant="body" color="primary" weight="semibold" className="ml-3">
            Settings
          </ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity className="items-center py-4 mt-8 mb-5" onPress={endPartnership}>
        <ThemedText variant="body" color="danger" weight="semibold">
          End Partnership
        </ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <ThemedContainer variant="screen" safeArea>
      {partnership && partnership.status === PARTNERSHIP_STATUS.ACTIVE
        ? renderActivePartnership()
        : renderNoPartnership()}
    </ThemedContainer>
  );
};

export default PartnershipScreen;
