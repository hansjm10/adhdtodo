// ABOUTME: Hyperfocus mode screen for ADHD users - single task focus with timer
// Provides distraction-free interface with built-in timer and break reminders

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Vibration, 
  Platform,
  ViewStyle,
  TextStyle,
  AlertButton
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '../contexts';
import { getTimerSize, responsiveFontSize, responsivePadding } from '../utils/ResponsiveDimensions';
import { FocusStackParamList } from '../navigation/AppNavigator';

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

// Type definitions
type HyperfocusScreenRouteProp = RouteProp<FocusStackParamList, 'Hyperfocus'>;
type HyperfocusScreenNavigationProp = StackNavigationProp<FocusStackParamList, 'Hyperfocus'>;

interface Styles {
  container: ViewStyle;
  breakContainer: ViewStyle;
  header: ViewStyle;
  exitButton: ViewStyle;
  exitButtonText: TextStyle;
  content: ViewStyle;
  modeLabel: TextStyle;
  taskTitle: TextStyle;
  timerContainer: ViewStyle;
  timer: TextStyle;
  controls: ViewStyle;
  controlButton: ViewStyle;
  pauseButton: ViewStyle;
  resetButton: ViewStyle;
  controlButtonText: TextStyle;
  stats: ViewStyle;
  statsText: TextStyle;
  motivationContainer: ViewStyle;
  motivationText: TextStyle;
  errorText: TextStyle;
}

const HyperfocusScreen: React.FC = () => {
  const route = useRoute<HyperfocusScreenRouteProp>();
  const navigation = useNavigation<HyperfocusScreenNavigationProp>();
  const { taskId } = route.params;
  const { tasks, updateTask } = useTasks();

  const [timeLeft, setTimeLeft] = useState<number>(WORK_DURATION);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find the task from context
  const task = useMemo(() => {
    return tasks.find((t) => t.id === taskId);
  }, [tasks, taskId]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, isBreak]);

  const handleTimerComplete = (): void => {
    // Platform-specific vibration handling
    if (Platform.OS !== 'web' && Vibration?.vibrate) {
      if (Platform.OS === 'android') {
        // Android: Use short vibration duration
        Vibration.vibrate(100);
      } else if (Platform.OS === 'ios') {
        // iOS: Simple vibration without duration
        Vibration.vibrate();
      }
    }
    setIsRunning(false);

    if (isBreak) {
      const buttons: AlertButton[] = [
        {
          text: 'Start Working',
          onPress: () => {
            setIsBreak(false);
            setTimeLeft(WORK_DURATION);
            setIsRunning(true);
          },
        },
        {
          text: 'Exit',
          onPress: () => navigation.goBack(),
        },
      ];
      Alert.alert('Break Complete!', 'Ready to get back to work?', buttons);
    } else {
      setSessionCount((prev) => prev + 1);
      updateTaskTimeSpent();

      const buttons: AlertButton[] = [
        {
          text: 'Start Break',
          onPress: () => {
            setIsBreak(true);
            setTimeLeft(BREAK_DURATION);
            setIsRunning(true);
          },
        },
        {
          text: 'Skip Break',
          onPress: () => {
            setTimeLeft(WORK_DURATION);
          },
        },
      ];
      Alert.alert('Great Work!', 'Time for a break. You deserve it!', buttons);
    }
  };

  const updateTaskTimeSpent = async (): Promise<void> => {
    if (!task) return;

    try {
      await updateTask(task.id, {
        timeSpent: (task.timeSpent || 0) + Math.round(WORK_DURATION / 60),
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to update task progress.');
    }
  };

  const toggleTimer = (): void => {
    setIsRunning(!isRunning);
  };

  const resetTimer = (): void => {
    setIsRunning(false);
    setTimeLeft(isBreak ? BREAK_DURATION : WORK_DURATION);
  };

  const exitHyperfocus = (): void => {
    const buttons: AlertButton[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', onPress: () => navigation.goBack() },
    ];
    Alert.alert('Exit Hyperfocus?', 'Are you sure you want to leave hyperfocus mode?', buttons);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Task not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isBreak && styles.breakContainer]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={exitHyperfocus} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.modeLabel}>{isBreak ? 'Break Time' : 'Focus Time'}</Text>

        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.timerContainer}>
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, isRunning && styles.pauseButton]}
            onPress={toggleTimer}
          >
            <Text style={styles.controlButtonText}>{isRunning ? 'Pause' : 'Start'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.controlButton, styles.resetButton]} onPress={resetTimer}>
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <Text style={styles.statsText}>Sessions completed: {sessionCount}</Text>
          <Text style={styles.statsText}>Total focus time: {sessionCount * 25} minutes</Text>
        </View>
      </View>

      <View style={styles.motivationContainer}>
        <Text style={styles.motivationText}>
          {isBreak ? "Rest your mind. You've earned it! 🌟" : 'Stay focused. You can do this! 💪'}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  breakContainer: {
    backgroundColor: '#2d4a2b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsivePadding(32),
  },
  modeLabel: {
    color: '#888',
    fontSize: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 48,
  },
  timerContainer: {
    width: getTimerSize(),
    height: getTimerSize(),
    borderRadius: getTimerSize() / 2,
    borderWidth: 8,
    borderColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  timer: {
    color: '#fff',
    fontSize: responsiveFontSize(72),
    fontWeight: '300',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  controlButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#4ECDC4',
  },
  pauseButton: {
    backgroundColor: '#FF6B6B',
  },
  resetButton: {
    backgroundColor: '#666',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  stats: {
    alignItems: 'center',
  },
  statsText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 4,
  },
  motivationContainer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  motivationText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default HyperfocusScreen;
