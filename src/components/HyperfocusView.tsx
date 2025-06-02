// ABOUTME: Pure presentation component for hyperfocus timer interface
// Displays task, timer, and controls without business logic

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task } from '../types/task.types';
import { getTimerSize, responsiveFontSize, responsivePadding } from '../utils/ResponsiveDimensions';

interface HyperfocusViewProps {
  task: Task | null;
  timeLeft: number;
  isRunning: boolean;
  isBreak: boolean;
  sessionCount: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onExit: () => void;
}

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

export const HyperfocusView: React.FC<HyperfocusViewProps> = ({
  task,
  timeLeft,
  isRunning,
  isBreak,
  sessionCount,
  onStart,
  onPause,
  onReset,
  onExit,
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!task) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>Task not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const containerStyle = isBreak ? styles.breakContainer : styles.container;

  return (
    <SafeAreaView style={containerStyle}>
      <View style={styles.header}>
        <TouchableOpacity testID="exit-button" style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Exit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.modeLabel}>{isBreak ? 'Break Time' : 'Focus Time'}</Text>
        <Text style={styles.taskTitle} numberOfLines={2}>
          {task.title}
        </Text>

        <View style={styles.timerContainer}>
          <Text testID="timer-display" style={styles.timer}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        <View style={styles.controls}>
          {!isRunning ? (
            <TouchableOpacity testID="start-button" style={styles.controlButton} onPress={onStart}>
              <Text style={styles.controlButtonText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="pause-button"
              style={[styles.controlButton, styles.pauseButton]}
              onPress={onPause}
            >
              <Text style={styles.controlButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="reset-button"
            style={[styles.controlButton, styles.resetButton]}
            onPress={onReset}
          >
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stats}>
          <Text style={styles.statsText}>Sessions: {sessionCount}</Text>
          <Text style={styles.statsText}>Total: {sessionCount * 25} minutes</Text>
        </View>

        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            {isBreak
              ? '🌟 Great job! Enjoy your break'
              : isRunning
                ? '🎯 Stay focused, you got this!'
                : '💪 Ready when you are'}
          </Text>
        </View>
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
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: responsivePadding(16),
  },
  exitButton: {
    padding: responsivePadding(10),
  },
  exitButtonText: {
    color: '#666',
    fontSize: responsiveFontSize(16),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: responsivePadding(20),
  },
  modeLabel: {
    fontSize: responsiveFontSize(18),
    color: '#888',
    marginBottom: responsivePadding(8),
  },
  taskTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: responsivePadding(40),
  },
  timerContainer: {
    width: getTimerSize(),
    height: getTimerSize(),
    borderRadius: getTimerSize() / 2,
    borderWidth: 4,
    borderColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsivePadding(40),
  },
  timer: {
    fontSize: responsiveFontSize(48),
    fontWeight: 'bold',
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: responsivePadding(30),
  },
  controlButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(32),
    borderRadius: 25,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
  },
  resetButton: {
    backgroundColor: '#666',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: responsivePadding(20),
  },
  statsText: {
    color: '#888',
    fontSize: responsiveFontSize(14),
  },
  motivationContainer: {
    marginTop: responsivePadding(20),
  },
  motivationText: {
    fontSize: responsiveFontSize(18),
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: responsiveFontSize(18),
    color: '#ff6b6b',
  },
});

export default HyperfocusView;
