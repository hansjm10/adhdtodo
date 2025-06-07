// ABOUTME: Mac-inspired collaborative task editor using NativeWind
// Clean real-time editing with cursor tracking and conflict resolution

import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText, ThemedIcon } from './themed';
import { useCollaborativeEditing } from '../contexts/CollaborativeEditingContext';
import type { Task } from '../types/task.types';
import { TaskStatus, TaskPriority } from '../types/task.types';

interface CollaborativeTaskEditorProps {
  task: Task;
  onTaskUpdate: (updatedTask: Task) => void;
  isReadOnly?: boolean;
}

interface CollaboratorIndicatorProps {
  collaborators: Array<{
    userId: string;
    userName: string;
    color: string;
    field: string;
    lastSeen: Date;
  }>;
}

const CollaboratorIndicator: React.FC<CollaboratorIndicatorProps> = ({ collaborators }) => {
  if (collaborators.length === 0) return null;

  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center">
        {collaborators.slice(0, 3).map((collaborator) => (
          <View
            key={collaborator.userId}
            className="w-8 h-8 rounded-full justify-center items-center -ml-2 border-2 border-white"
            style={{ backgroundColor: collaborator.color }}
          >
            <ThemedText variant="caption" color="white" weight="bold">
              {collaborator.userName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
        ))}
        {collaborators.length > 3 && (
          <View className="w-8 h-8 rounded-full bg-neutral-500 justify-center items-center -ml-2 border-2 border-white">
            <ThemedText variant="caption" color="white" weight="bold">
              +{collaborators.length - 3}
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText variant="caption" color="secondary">
        {collaborators.length === 1
          ? `${collaborators[0].userName} is editing`
          : `${collaborators.length} people editing`}
      </ThemedText>
    </View>
  );
};

interface FieldCursorProps {
  collaborators: Array<{
    userId: string;
    userName: string;
    color: string;
    position: number;
    field: string;
  }>;
  fieldName: string;
  text: string;
}

const FieldCursor: React.FC<FieldCursorProps> = ({ collaborators, fieldName, text }) => {
  const fieldCollaborators = collaborators.filter((c) => c.field === fieldName);

  if (fieldCollaborators.length === 0) return null;

  return (
    <View className="absolute inset-0 pointer-events-none">
      {fieldCollaborators.map((collaborator) => {
        // Calculate cursor position (simplified)
        const position = Math.min(collaborator.position, text.length);

        return (
          <View
            key={collaborator.userId}
            className="absolute w-0.5 h-5 top-2"
            style={{
              backgroundColor: collaborator.color,
              left: Math.min(position * 8, 200), // Rough character width estimation
            }}
          >
            <View className="absolute -top-5 -left-2.5 bg-black/80 px-1 py-0.5 rounded">
              <ThemedText variant="caption" color="white" className="text-xs">
                {collaborator.userName}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export const CollaborativeTaskEditor: React.FC<CollaborativeTaskEditorProps> = ({
  task,
  onTaskUpdate,
  isReadOnly = false,
}) => {
  const {
    startEditing,
    stopEditing,
    applyOperation,
    updateCursor,
    toggleTaskLock,
    createTextOperation,
    createFieldOperation,
    getCurrentCollaborators,
    isTaskLocked,
    getLockOwner,
    state,
  } = useCollaborativeEditing();

  const [localTask, setLocalTask] = useState<Task>(task);
  const [isEditing, setIsEditing] = useState(false);
  const [showLockControls, setShowLockControls] = useState(false);

  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collaborators = getCurrentCollaborators();
  const locked = isTaskLocked();
  const lockOwner = getLockOwner();

  useEffect(() => {
    return () => {
      if (isEditing) {
        stopEditing(task.id).catch(() => {});
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  const handleStartEditing = async () => {
    if (isReadOnly) return;

    setIsEditing(true);
    await startEditing(task.id);
  };

  const handleStopEditing = async () => {
    setIsEditing(false);
    await stopEditing(task.id);
  };

  const handleTextChange = (field: string, newText: string, oldText: string) => {
    if (
      isReadOnly ||
      (locked && lockOwner !== state.currentSession?.editors.get('current')?.userId)
    ) {
      return;
    }

    // Update local state immediately for responsiveness
    setLocalTask((prev) => ({ ...prev, [field]: newText }));

    // Debounce operations to avoid too many database calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      // Create and apply text operation
      const operation = createTextOperation(field, 'replace', newText, 0, oldText.length);

      if (operation) {
        applyOperation(operation)
          .then((success) => {
            if (success) {
              onTaskUpdate({ ...localTask, [field]: newText });
            }
          })
          .catch((error) => {
            if (global.__DEV__) {
              console.error('Failed to apply text operation:', error);
            }
          });
      }
    }, 500);
  };

  const handleFieldChange = async (field: string, value: unknown) => {
    if (
      isReadOnly ||
      (locked && lockOwner !== state.currentSession?.editors.get('current')?.userId)
    ) {
      return;
    }

    setLocalTask((prev) => ({ ...prev, [field]: value }));

    const operation = createFieldOperation(field, value);
    if (operation) {
      const success = await applyOperation(operation);
      if (success) {
        onTaskUpdate({ ...localTask, [field]: value });
      }
    }
  };

  const handleCursorPositionChange = (field: string, position: number): void => {
    // updateCursor is fire-and-forget for cursor position updates
    // No error handling needed for cursor updates as they're non-critical
    updateCursor(field, position).catch((error) => {
      // Cursor updates are best-effort, failures don't impact functionality
      if (global.__DEV__) {
        console.info('Cursor update failed (non-critical):', error);
      }
    });
  };

  const handleToggleLock = async () => {
    const success = await toggleTaskLock(!locked);
    if (success) {
      setShowLockControls(false);
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return '#22c55e'; // success
      case TaskStatus.IN_PROGRESS:
        return '#f59e0b'; // warning
      default:
        return '#6b7280'; // secondary
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return '#ef4444'; // error
      case TaskPriority.MEDIUM:
        return '#f59e0b'; // warning
      default:
        return '#22c55e'; // success
    }
  };

  return (
    <View className="flex-1 p-4">
      {/* Collaboration Header */}
      <View className="flex-row justify-between items-center mb-4 pb-2 border-b border-neutral-200">
        <CollaboratorIndicator collaborators={collaborators} />

        <View className="flex-row items-center gap-2">
          {!isEditing ? (
            <TouchableOpacity
              className="flex-row items-center px-4 py-2 bg-neutral-100 rounded-lg gap-1"
              onPress={() => {
                handleStartEditing().catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to start editing:', error);
                  }
                });
              }}
              disabled={isReadOnly}
            >
              <ThemedIcon name="create-outline" size="sm" color="primary" />
              <ThemedText variant="caption" color="primary" weight="semibold">
                Edit
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-row items-center px-4 py-2 bg-success-500 rounded-lg gap-1"
              onPress={() => {
                handleStopEditing().catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to stop editing:', error);
                  }
                });
              }}
            >
              <ThemedIcon name="checkmark" size="sm" color="white" />
              <ThemedText variant="caption" color="white" weight="semibold">
                Done
              </ThemedText>
            </TouchableOpacity>
          )}

          {isEditing && (
            <TouchableOpacity
              className={`p-2 rounded-md ${locked ? 'bg-warning-500' : 'bg-neutral-100'}`}
              onPress={() => {
                setShowLockControls(!showLockControls);
              }}
            >
              <ThemedIcon
                name={locked ? 'lock-closed' : 'lock-open'}
                size="sm"
                color={locked ? 'white' : 'primary'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lock Controls */}
      {showLockControls && (
        <View className="bg-neutral-100 p-4 rounded-lg mb-4">
          <ThemedText variant="caption" color="secondary" className="mb-2">
            {locked ? `Locked by ${lockOwner}` : 'Unlock to prevent conflicts'}
          </ThemedText>
          <TouchableOpacity
            className="self-start px-4 py-2 bg-primary-500 rounded-md"
            onPress={() => {
              handleToggleLock().catch(() => {});
            }}
          >
            <ThemedText variant="caption" color="white" weight="semibold">
              {locked ? 'Unlock' : 'Lock for editing'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Task Title */}
      <View className="mb-6">
        <ThemedText variant="caption" color="primary" weight="semibold" className="mb-2">
          Title
        </ThemedText>
        <View className="relative">
          <TextInput
            ref={titleInputRef}
            className={`text-xl font-bold px-4 py-2 rounded-lg border text-slate-700 ${isEditing ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-transparent'}${locked && !isEditing ? ' opacity-60' : ''}`}
            value={localTask.title}
            onChangeText={(text) => {
              handleTextChange('title', text, localTask.title);
            }}
            onSelectionChange={(event) => {
              handleCursorPositionChange('title', event.nativeEvent.selection.start);
            }}
            editable={isEditing && (!locked || lockOwner === 'current')}
            multiline={false}
            placeholder="Task title..."
          />
          <FieldCursor collaborators={collaborators} fieldName="title" text={localTask.title} />
        </View>
      </View>

      {/* Task Description */}
      <View className="mb-6">
        <ThemedText variant="caption" color="primary" weight="semibold" className="mb-2">
          Description
        </ThemedText>
        <View className="relative">
          <TextInput
            ref={descriptionInputRef}
            className={`text-base px-4 py-2 rounded-lg border text-slate-700 min-h-[100px] align-top ${isEditing ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-transparent'}${locked && !isEditing ? ' opacity-60' : ''}`}
            value={localTask.description}
            onChangeText={(text) => {
              handleTextChange('description', text, localTask.description);
            }}
            onSelectionChange={(event) => {
              handleCursorPositionChange('description', event.nativeEvent.selection.start);
            }}
            editable={isEditing && (!locked || lockOwner === 'current')}
            multiline
            numberOfLines={4}
            placeholder="Task description..."
          />
          <FieldCursor
            collaborators={collaborators}
            fieldName="description"
            text={localTask.description}
          />
        </View>
      </View>

      {/* Status and Priority */}
      <View className="flex-row gap-4 mb-6">
        <View className="flex-1">
          <ThemedText variant="caption" color="primary" weight="semibold" className="mb-2">
            Status
          </ThemedText>
          <TouchableOpacity
            className="px-4 py-2 rounded-md items-center"
            style={{ backgroundColor: getStatusColor(localTask.status) }}
            onPress={() => {
              if (isEditing && (!locked || lockOwner === 'current')) {
                const statusFlow: Record<TaskStatus, TaskStatus> = {
                  [TaskStatus.PENDING]: TaskStatus.IN_PROGRESS,
                  [TaskStatus.IN_PROGRESS]: TaskStatus.COMPLETED,
                  [TaskStatus.COMPLETED]: TaskStatus.PENDING,
                };
                const newStatus = statusFlow[localTask.status] ?? TaskStatus.PENDING;
                handleFieldChange('status', newStatus).catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to update status:', error);
                  }
                });
              }
            }}
            disabled={!isEditing || (locked && lockOwner !== 'current')}
          >
            <ThemedText variant="body" color="white" weight="semibold" className="capitalize">
              {localTask.status}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <ThemedText variant="caption" color="primary" weight="semibold" className="mb-2">
            Priority
          </ThemedText>
          <TouchableOpacity
            className="px-4 py-2 rounded-md items-center"
            style={{ backgroundColor: getPriorityColor(localTask.priority) }}
            onPress={() => {
              if (isEditing && (!locked || lockOwner === 'current')) {
                const priorityFlow: Record<TaskPriority, TaskPriority> = {
                  [TaskPriority.LOW]: TaskPriority.MEDIUM,
                  [TaskPriority.MEDIUM]: TaskPriority.HIGH,
                  [TaskPriority.HIGH]: TaskPriority.URGENT,
                  [TaskPriority.URGENT]: TaskPriority.LOW,
                };
                const newPriority = priorityFlow[localTask.priority] ?? TaskPriority.LOW;
                handleFieldChange('priority', newPriority).catch((error) => {
                  if (global.__DEV__) {
                    console.error('Failed to update priority:', error);
                  }
                });
              }
            }}
            disabled={!isEditing || (locked && lockOwner !== 'current')}
          >
            <ThemedText variant="body" color="white" weight="semibold" className="capitalize">
              {localTask.priority}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status */}
      <View className="flex-row items-center gap-1 pt-4 border-t border-neutral-200">
        <View
          className={`w-2 h-2 rounded-full ${state.isConnected ? 'bg-success-500' : 'bg-danger-500'}`}
        />
        <ThemedText variant="caption" color="secondary">
          {state.isConnected ? 'Connected' : 'Offline'}
          {state.lastSyncTime && ` • Last sync: ${state.lastSyncTime.toLocaleTimeString()}`}
        </ThemedText>
      </View>
    </View>
  );
};

export default CollaborativeTaskEditor;
