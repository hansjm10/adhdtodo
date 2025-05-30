// ABOUTME: Tests for Task model creation and validation
// Verifies task structure, default values, and validation logic

import { createTask, validateTask, generateTaskId } from '../TaskModel';
import { TASK_STATUS, TASK_CATEGORIES } from '../../constants/TaskConstants';

describe('TaskModel', () => {
  describe('generateTaskId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateTaskId();
      const id2 = generateTaskId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should generate string IDs', () => {
      const id = generateTaskId();
      expect(typeof id).toBe('string');
    });
  });

  describe('createTask', () => {
    it('should create a task with required fields', () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
      };

      const task = createTask(taskData);

      expect(task).toHaveProperty('id');
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.status).toBe(TASK_STATUS.PENDING);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });

    it('should set default values for optional fields', () => {
      const task = createTask({ title: 'Minimal Task' });

      expect(task.description).toBe('');
      expect(task.category).toBeNull();
      expect(task.timeEstimate).toBeNull();
      expect(task.priority).toBe('medium');
      expect(task.completed).toBe(false);
      expect(task.completedAt).toBeNull();
      expect(task.xpEarned).toBe(0);
    });

    it('should accept category from predefined categories', () => {
      const task = createTask({
        title: 'Home Task',
        category: TASK_CATEGORIES.HOME.id,
      });

      expect(task.category).toBe('home');
    });

    it('should accept time estimate in minutes', () => {
      const task = createTask({
        title: 'Timed Task',
        timeEstimate: 30,
      });

      expect(task.timeEstimate).toBe(30);
    });
  });

  describe('validateTask', () => {
    it('should validate a valid task', () => {
      const task = createTask({ title: 'Valid Task' });
      const result = validateTask(task);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing title', () => {
      const task = { description: 'No title' };
      const result = validateTask(task);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should fail validation for empty title', () => {
      const task = createTask({ title: '' });
      const result = validateTask(task);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('should fail validation for invalid status', () => {
      const task = createTask({ title: 'Test' });
      task.status = 'invalid-status';
      const result = validateTask(task);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid task status');
    });
  });
});
