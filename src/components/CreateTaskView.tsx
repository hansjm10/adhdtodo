// ABOUTME: Pure presentation component for task creation form
// Displays form inputs without business logic or data dependencies

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TASK_CATEGORIES, TIME_PRESETS } from '../constants/TaskConstants';
import type { TaskCategory, TimePreset } from '../types/task.types';

interface CreateTaskViewProps {
  title: string;
  description: string;
  selectedCategory: string | null;
  selectedTimePreset: number | null;
  onTitleChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onTimePresetSelect: (minutes: number | null) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const CreateTaskView: React.FC<CreateTaskViewProps> = ({
  title,
  description,
  selectedCategory,
  selectedTimePreset,
  onTitleChange,
  onDescriptionChange,
  onCategorySelect,
  onTimePresetSelect,
  onSave,
  onCancel,
}) => {
  const isSaveDisabled = !title.trim();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-neutral-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1">
        <View className="p-5">
          <Text className="text-base font-semibold text-neutral-900 mb-2">Task Title</Text>
          <TextInput
            testID="title-input"
            className="bg-white border border-neutral-200 rounded-lg p-3 text-base mb-5"
            placeholder="Task title"
            value={title}
            onChangeText={onTitleChange}
            maxLength={100}
            accessible
            accessibilityLabel="Task title input"
            accessibilityHint="Enter the title for your task"
          />

          <Text className="text-base font-semibold text-neutral-900 mb-2">Description</Text>
          <TextInput
            testID="description-input"
            className="bg-white border border-neutral-200 rounded-lg p-3 text-base mb-5 min-h-[80px] align-top"
            placeholder="Task description (optional)"
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={3}
            maxLength={500}
            accessible
            accessibilityLabel="Task description input"
            accessibilityHint="Enter an optional description for your task"
          />

          <Text className="text-base font-semibold text-neutral-900 mb-2">Category</Text>
          <View testID="category-selector" className="mb-5">
            <View className="flex-row justify-between">
              {Object.values(TASK_CATEGORIES).map((category: TaskCategory) => (
                <TouchableOpacity
                  key={category.id}
                  testID={`category-${category.id}`}
                  className={`flex-1 items-center p-3 mx-1 rounded-xl border-2 ${
                    selectedCategory === category.id
                      ? 'opacity-100 border-neutral-900'
                      : 'opacity-60 border-transparent'
                  }`}
                  style={{ backgroundColor: category.color }}
                  onPress={() => {
                    onCategorySelect(category.id);
                  }}
                  accessible
                  accessibilityLabel={`${category.label} category`}
                  accessibilityHint={`Select ${category.label} as the task category`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === category.id }}
                >
                  <Text className="text-3xl mb-1">{category.icon}</Text>
                  <Text
                    className={`text-xs font-semibold ${
                      selectedCategory === category.id ? 'text-neutral-900' : 'text-white'
                    }`}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text className="text-base font-semibold text-neutral-900 mb-2">Time Estimate</Text>
          <View testID="time-preset-selector" className="mb-5">
            <View className="flex-row flex-wrap">
              {TIME_PRESETS.map((preset: TimePreset) => (
                <TouchableOpacity
                  key={preset.minutes ?? 'custom'}
                  testID={`time-preset-${preset.minutes ?? 'custom'}`}
                  className={`px-5 py-2.5 rounded-full mr-2.5 mb-2.5 ${
                    selectedTimePreset === preset.minutes
                      ? 'bg-primary-500 opacity-100'
                      : 'bg-neutral-200 opacity-60'
                  }`}
                  onPress={() => {
                    onTimePresetSelect(preset.minutes);
                  }}
                  accessible
                  accessibilityLabel={`${preset.label} time estimate`}
                  accessibilityHint={`Set time estimate to ${preset.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTimePreset === preset.minutes }}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selectedTimePreset === preset.minutes ? 'text-white' : 'text-neutral-900'
                    }`}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="flex-row px-5 py-2.5 gap-3">
        <TouchableOpacity
          testID="cancel-button"
          className="flex-1 py-4 rounded-xl items-center bg-neutral-200"
          onPress={onCancel}
          accessible
          accessibilityLabel="Cancel"
          accessibilityHint="Cancel creating this task"
          accessibilityRole="button"
        >
          <Text className="text-base font-semibold text-neutral-900">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="save-button"
          className={`flex-1 py-4 rounded-xl items-center ${
            isSaveDisabled ? 'bg-neutral-200 opacity-50' : 'bg-primary-500'
          }`}
          onPress={onSave}
          disabled={isSaveDisabled}
          accessible
          accessibilityLabel="Save task"
          accessibilityHint={isSaveDisabled ? 'Enter a task title first' : 'Save this task'}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaveDisabled }}
        >
          <Text
            className={`text-base font-semibold ${
              isSaveDisabled ? 'text-neutral-500' : 'text-white'
            }`}
          >
            Save Task
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateTaskView;
