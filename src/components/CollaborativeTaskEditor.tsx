// ABOUTME: Collaborative task editor with real-time sync and cursor tracking
// Shows live collaborators and handles conflict resolution during editing

import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCollaborativeEditing } from '../contexts/CollaborativeEditingContext';
import type { Task } from '../types/task.types';
import { TaskStatus, TaskPriority } from '../types/task.types';
import { colors, typography, spacing } from '../styles';

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
    <View style={styles.collaboratorContainer}>
      <View style={styles.collaboratorList}>
        {collaborators.slice(0, 3).map((collaborator) => (
          <View
            key={collaborator.userId}
            style={[styles.collaboratorAvatar, { backgroundColor: collaborator.color }]}
          >
            <Text style={styles.collaboratorInitial}>
              {collaborator.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        ))}
        {collaborators.length > 3 && (
          <View style={styles.collaboratorOverflow}>
            <Text style={styles.collaboratorOverflowText}>+{collaborators.length - 3}</Text>
          </View>
        )}
      </View>
      <Text style={styles.collaboratorStatus}>
        {collaborators.length === 1
          ? `${collaborators[0].userName} is editing`
          : `${collaborators.length} people editing`}
      </Text>
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
    <View style={styles.cursorsContainer}>
      {fieldCollaborators.map((collaborator) => {
        // Calculate cursor position (simplified)
        const position = Math.min(collaborator.position, text.length);

        return (
          <View
            key={collaborator.userId}
            style={[
              styles.cursor,
              {
                backgroundColor: collaborator.color,
                // In a real implementation, this would be positioned based on text measurement
                left: Math.min(position * 8, 200), // Rough character width estimation
              },
            ]}
          >
            <Text style={styles.cursorLabel}>{collaborator.userName}</Text>
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
          .catch(() => {});
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises, no-void
    void updateCursor(field, position);
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
        return colors.semantic.success;
      case TaskStatus.IN_PROGRESS:
        return colors.semantic.warning;
      default:
        return colors.text.secondary;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return colors.semantic.error;
      case TaskPriority.MEDIUM:
        return colors.semantic.warning;
      default:
        return colors.semantic.success;
    }
  };

  return (
    <View style={styles.container}>
      {/* Collaboration Header */}
      <View style={styles.header}>
        <CollaboratorIndicator collaborators={collaborators} />

        <View style={styles.headerActions}>
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                handleStartEditing().catch(() => {});
              }}
              disabled={isReadOnly}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                handleStopEditing().catch(() => {});
              }}
            >
              <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}

          {isEditing && (
            <TouchableOpacity
              style={[styles.lockButton, locked && styles.lockButtonActive]}
              onPress={() => {
                setShowLockControls(!showLockControls);
              }}
            >
              <Ionicons
                name={locked ? 'lock-closed' : 'lock-open'}
                size={16}
                color={locked ? colors.text.inverse : colors.text.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lock Controls */}
      {showLockControls && (
        <View style={styles.lockControls}>
          <Text style={styles.lockText}>
            {locked ? `Locked by ${lockOwner}` : 'Unlock to prevent conflicts'}
          </Text>
          <TouchableOpacity
            style={styles.lockToggleButton}
            onPress={() => {
              handleToggleLock().catch(() => {});
            }}
          >
            <Text style={styles.lockToggleText}>{locked ? 'Unlock' : 'Lock for editing'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task Title */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Title</Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={titleInputRef}
            style={[
              styles.titleInput,
              !isEditing && styles.readOnlyInput,
              locked && !isEditing && styles.lockedInput,
            ]}
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
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Description</Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={descriptionInputRef}
            style={[
              styles.descriptionInput,
              !isEditing && styles.readOnlyInput,
              locked && !isEditing && styles.lockedInput,
            ]}
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
      <View style={styles.metadataContainer}>
        <View style={styles.metadataField}>
          <Text style={styles.fieldLabel}>Status</Text>
          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: getStatusColor(localTask.status) }]}
            onPress={() => {
              if (isEditing && (!locked || lockOwner === 'current')) {
                const newStatus = (() => {
                  if (localTask.status === TaskStatus.PENDING) return TaskStatus.IN_PROGRESS;
                  if (localTask.status === TaskStatus.IN_PROGRESS) return TaskStatus.COMPLETED;
                  return TaskStatus.PENDING;
                })();
                handleFieldChange('status', newStatus).catch(() => {});
              }
            }}
            disabled={!isEditing || (locked && lockOwner !== 'current')}
          >
            <Text style={styles.statusButtonText}>{localTask.status}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metadataField}>
          <Text style={styles.fieldLabel}>Priority</Text>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              { backgroundColor: getPriorityColor(localTask.priority) },
            ]}
            onPress={() => {
              if (isEditing && (!locked || lockOwner === 'current')) {
                const newPriority = (() => {
                  if (localTask.priority === TaskPriority.LOW) return TaskPriority.MEDIUM;
                  if (localTask.priority === TaskPriority.MEDIUM) return TaskPriority.HIGH;
                  return TaskPriority.LOW;
                })();
                handleFieldChange('priority', newPriority).catch(() => {});
              }
            }}
            disabled={!isEditing || (locked && lockOwner !== 'current')}
          >
            <Text style={styles.priorityText}>{localTask.priority}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View
          style={[
            styles.connectionIndicator,
            {
              backgroundColor: state.isConnected ? colors.semantic.success : colors.semantic.error,
            },
          ]}
        />
        <Text style={styles.statusText}>
          {state.isConnected ? 'Connected' : 'Offline'}
          {state.lastSyncTime && ` • Last sync: ${state.lastSyncTime.toLocaleTimeString()}`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.states.hover,
    borderRadius: 8,
    gap: spacing.xs,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.semantic.success,
    borderRadius: 8,
    gap: spacing.xs,
  },
  doneButtonText: {
    color: colors.text.inverse,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  lockButton: {
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.states.hover,
  },
  lockButtonActive: {
    backgroundColor: colors.semantic.warning,
  },
  collaboratorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collaboratorList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collaboratorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  collaboratorInitial: {
    color: colors.text.inverse,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: 'bold',
  },
  collaboratorOverflow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  collaboratorOverflowText: {
    color: colors.text.inverse,
    fontSize: typography.caption.fontSize,
    fontWeight: 'bold',
  },
  collaboratorStatus: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
  },
  lockControls: {
    backgroundColor: colors.states.hover,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  lockText: {
    fontSize: typography.bodySmall.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  lockToggleButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  lockToggleText: {
    color: colors.text.inverse,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    position: 'relative',
  },
  titleInput: {
    fontSize: typography.h3.fontSize,
    fontWeight: 'bold',
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.states.hover,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionInput: {
    fontSize: typography.bodyMedium.fontSize,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.states.hover,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: colors.background,
    borderColor: 'transparent',
  },
  lockedInput: {
    backgroundColor: colors.states.hover,
    opacity: 0.6,
  },
  cursorsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: 20,
    top: spacing.sm,
  },
  cursorLabel: {
    position: 'absolute',
    top: -20,
    left: -10,
    fontSize: typography.caption.fontSize,
    color: colors.text.inverse,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metadataContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metadataField: {
    flex: 1,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  statusButtonText: {
    color: colors.surface,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  priorityText: {
    color: colors.surface,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.caption.fontSize,
    color: colors.text.secondary,
  },
});

export default CollaborativeTaskEditor;
