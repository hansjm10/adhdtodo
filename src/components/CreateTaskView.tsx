// ABOUTME: Pure presentation component for task creation form
// Displays form inputs without business logic or data dependencies

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { TASK_CATEGORIES, TIME_PRESETS } from '../constants/TaskConstants';
import { TaskCategory, TimePreset } from '../types/task.types';

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

interface Styles {
  container: ViewStyle;
  scrollView: ViewStyle;
  formContainer: ViewStyle;
  label: TextStyle;
  input: ViewStyle;
  textArea: ViewStyle;
  categoryContainer: ViewStyle;
  categoryGrid: ViewStyle;
  categoryButton: ViewStyle;
  categoryButtonSelected: ViewStyle;
  categoryIcon: TextStyle;
  categoryLabel: TextStyle;
  categoryLabelSelected: TextStyle;
  timeContainer: ViewStyle;
  timeGrid: ViewStyle;
  timeButton: ViewStyle;
  timeButtonSelected: ViewStyle;
  timeText: TextStyle;
  timeTextSelected: TextStyle;
  customTimeContainer: ViewStyle;
  customTimeInput: ViewStyle;
  customTimeLabel: TextStyle;
  actions: ViewStyle;
  actionButton: ViewStyle;
  cancelButton: ViewStyle;
  saveButton: ViewStyle;
  saveButtonDisabled: ViewStyle;
  actionButtonText: TextStyle;
  saveButtonText: TextStyle;
  saveButtonTextDisabled: TextStyle;
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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Task Title</Text>
          <TextInput
            testID="title-input"
            style={styles.input}
            placeholder="Task title"
            value={title}
            onChangeText={onTitleChange}
            maxLength={100}
            accessible={true}
            accessibilityLabel="Task title input"
            accessibilityHint="Enter the title for your task"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            testID="description-input"
            style={[styles.input, styles.textArea]}
            placeholder="Task description (optional)"
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={3}
            maxLength={500}
            accessible={true}
            accessibilityLabel="Task description input"
            accessibilityHint="Enter an optional description for your task"
          />

          <Text style={styles.label}>Category</Text>
          <View testID="category-selector" style={styles.categoryContainer}>
            <View style={styles.categoryGrid}>
              {Object.values(TASK_CATEGORIES).map((category: TaskCategory) => (
                <TouchableOpacity
                  key={category.id}
                  testID={`category-${category.id}`}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonSelected,
                    { borderColor: category.color },
                  ]}
                  onPress={() => onCategorySelect(category.id)}
                  accessible={true}
                  accessibilityLabel={`${category.label} category`}
                  accessibilityHint={`Select ${category.label} as the task category`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedCategory === category.id }}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelSelected,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>Time Estimate</Text>
          <View testID="time-preset-selector" style={styles.timeContainer}>
            <View style={styles.timeGrid}>
              {TIME_PRESETS.map((preset: TimePreset) => (
                <TouchableOpacity
                  key={preset.value || 'custom'}
                  testID={`time-preset-${preset.value || 'custom'}`}
                  style={[
                    styles.timeButton,
                    selectedTimePreset === preset.value && styles.timeButtonSelected,
                  ]}
                  onPress={() => onTimePresetSelect(preset.value)}
                  accessible={true}
                  accessibilityLabel={`${preset.label} time estimate`}
                  accessibilityHint={`Set time estimate to ${preset.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTimePreset === preset.value }}
                >
                  <Text
                    style={[
                      styles.timeText,
                      selectedTimePreset === preset.value && styles.timeTextSelected,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              testID="cancel-button"
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onCancel}
              accessible={true}
              accessibilityLabel="Cancel"
              accessibilityHint="Cancel creating this task"
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="save-button"
              style={[
                styles.actionButton,
                styles.saveButton,
                isSaveDisabled && styles.saveButtonDisabled,
              ]}
              onPress={onSave}
              disabled={isSaveDisabled}
              accessible={true}
              accessibilityLabel="Save task"
              accessibilityHint={isSaveDisabled ? 'Enter a task title first' : 'Save this task'}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaveDisabled }}
            >
              <Text
                style={[styles.saveButtonText, isSaveDisabled && styles.saveButtonTextDisabled]}
              >
                Save Task
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  categoryButtonSelected: {
    backgroundColor: '#E3F2FD',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
  },
  categoryLabelSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  timeContainer: {
    marginTop: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#4A90E2',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  timeTextSelected: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  customTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  customTimeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  customTimeLabel: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});

export default CreateTaskView;
