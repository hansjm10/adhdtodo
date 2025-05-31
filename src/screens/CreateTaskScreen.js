// ABOUTME: Screen for creating new tasks with ADHD-friendly UI
// Provides form inputs for task details with visual feedback and category/time selection

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TASK_CATEGORIES, TIME_PRESETS } from '../constants/TaskConstants';
import { createTask } from '../utils/TaskModel';
import TaskStorageService from '../services/TaskStorageService';

const CreateTaskScreen = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTimePreset, setSelectedTimePreset] = useState(null);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      category: selectedCategory,
      timeEstimate: selectedTimePreset,
    };

    const newTask = createTask(taskData);
    const success = await TaskStorageService.saveTask(newTask);

    if (success) {
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

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
            style={styles.input}
            placeholder="Task title"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            accessible={true}
            accessibilityLabel="Task title input"
            accessibilityHint="Enter the title for your task"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Task description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={500}
            accessible={true}
            accessibilityLabel="Task description input"
            accessibilityHint="Enter an optional description for your task"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer} testID="category-selector">
            {Object.values(TASK_CATEGORIES).map((category) => (
              <TouchableOpacity
                key={category.id}
                testID={`category-${category.id}`}
                style={[
                  styles.categoryButton,
                  { backgroundColor: category.color },
                  selectedCategory === category.id && styles.selectedCategory,
                ]}
                onPress={() => setSelectedCategory(category.id)}
                accessible={true}
                accessibilityLabel={`${category.label} category`}
                accessibilityHint={`Double tap to categorize task as ${category.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCategory === category.id }}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryText}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Time Estimate</Text>
          <View style={styles.timeContainer} testID="time-preset-selector">
            {TIME_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.minutes}
                testID={`time-preset-${preset.minutes}`}
                style={[
                  styles.timeButton,
                  selectedTimePreset === preset.minutes && styles.selectedTime,
                ]}
                onPress={() => setSelectedTimePreset(preset.minutes)}
                accessible={true}
                accessibilityLabel={`${preset.label} time estimate`}
                accessibilityHint={`Double tap to set time estimate to ${preset.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTimePreset === preset.minutes }}
              >
                <Text style={styles.timeText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaveDisabled && styles.disabledButton]}
          onPress={handleSave}
          disabled={isSaveDisabled}
          testID="save-button"
          accessible={true}
          accessibilityLabel="Create task button"
          accessibilityHint={
            isSaveDisabled
              ? 'Enter a task title to enable this button'
              : 'Double tap to create the task'
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaveDisabled }}
        >
          <Text style={styles.saveButtonText}>Create Task</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    opacity: 0.6,
  },
  selectedCategory: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#333',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
    marginBottom: 8,
    opacity: 0.6,
  },
  selectedTime: {
    backgroundColor: '#4ECDC4',
    opacity: 1,
  },
  timeText: {
    fontSize: 14,
    color: '#333',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CreateTaskScreen;
