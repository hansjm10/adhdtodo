// ABOUTME: Mac-inspired distraction-free hyperfocus timer using NativeWind
// Minimal design for deep focus with clean timer interface

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ThemedContainer, ThemedText, ThemedIcon } from './themed';
import { getTimerCircleStyle, getButtonBgStyle } from '../styles/dynamicStyles';
import type { Task } from '../types/task.types';

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
      <ThemedContainer variant="content" safeArea centered className="bg-[#171717]">
        <ThemedIcon name="alert-circle-outline" size="xl" color="danger" />
        <ThemedText variant="h3" color="danger" align="center" className="mt-4">
          Task not found
        </ThemedText>
      </ThemedContainer>
    );
  }

  // Background color based on mode
  const _backgroundColor = isBreak ? '#2E7D32' : '#1a1a1a';

  const motivationMessage = (() => {
    if (isBreak) return '🌟 Great job! Enjoy your break';
    if (isRunning) return '🎯 Stay focused, you got this!';
    return '💪 Ready when you are';
  })();

  return (
    <ThemedContainer
      variant="content"
      safeArea
      className={isBreak ? 'bg-[#2E7D32]' : 'bg-[#1a1a1a]'}
    >
      {/* Header with Exit Button */}
      <View className="flex-row justify-end p-4">
        <TouchableOpacity testID="exit-button" className="p-3 rounded-lg" onPress={onExit}>
          <ThemedIcon name="close" size="md" color="tertiary" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center px-6">
        {/* Mode Label */}
        <ThemedText variant="body" color="tertiary" align="center" className="mb-2">
          {isBreak ? 'Break Time' : 'Focus Time'}
        </ThemedText>

        {/* Task Title */}
        <Text className="text-2xl font-semibold text-white text-center mb-10" numberOfLines={2}>
          {task.title}
        </Text>

        {/* Timer Circle */}
        <View className="mb-10">
          <View
            className="w-64 h-64 rounded-full border-4 justify-center items-center"
            style={getTimerCircleStyle(isBreak)}
          >
            <Text testID="timer-display" className="text-6xl font-bold text-white">
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View className="flex-row gap-4 mb-8">
          {!isRunning ? (
            <TouchableOpacity
              className="px-8 py-4 rounded-button"
              style={getButtonBgStyle('primary', isBreak)}
              onPress={onStart}
              testID="start-button"
            >
              <Text className="text-white text-lg font-semibold">Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="px-8 py-4 rounded-button"
              style={getButtonBgStyle('pause')}
              onPress={onPause}
              testID="pause-button"
            >
              <Text className="text-white text-lg font-semibold">Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="px-8 py-4 rounded-button border-2"
            style={getButtonBgStyle('transparent')}
            onPress={onReset}
            testID="reset-button"
          >
            <Text className="text-neutral-400 text-lg font-semibold">Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View className="flex-row gap-6 mb-6">
          <Text className="text-neutral-400 text-sm">Sessions: {sessionCount}</Text>
          <Text className="text-neutral-400 text-sm">Total: {sessionCount * 25} minutes</Text>
        </View>

        {/* Motivation Message */}
        <View className="mt-6">
          <Text className="text-lg text-white text-center">{motivationMessage}</Text>
        </View>
      </View>
    </ThemedContainer>
  );
};

export default HyperfocusView;
