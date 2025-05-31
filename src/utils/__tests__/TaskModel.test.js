// ABOUTME: Tests for Task model creation and validation
// Verifies task structure, default values, and validation logic

import {
  createTask,
  validateTask,
  generateTaskId,
  startTask,
  assignTask,
  addEncouragement,
  markPartnerNotified,
  isOverdue,
  getTimeUntilDue,
} from '../TaskModel';
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

  describe('Accountability Partner Features', () => {
    describe('createTask with accountability fields', () => {
      it('should create task with assignment fields', () => {
        const taskData = {
          title: 'Assigned Task',
          assignedBy: 'user_123',
          assignedTo: 'user_456',
          dueDate: new Date('2024-12-31'),
          preferredStartTime: new Date('2024-12-31T10:00:00'),
        };

        const task = createTask(taskData);

        expect(task.assignedBy).toBe('user_123');
        expect(task.assignedTo).toBe('user_456');
        expect(task.dueDate).toEqual(new Date('2024-12-31'));
        expect(task.preferredStartTime).toEqual(new Date('2024-12-31T10:00:00'));
        expect(task.startedAt).toBeNull();
        expect(task.partnerNotified).toEqual({
          onStart: false,
          onComplete: false,
          onOverdue: false,
        });
        expect(task.encouragementReceived).toEqual([]);
      });
    });

    describe('startTask', () => {
      it('should update task status to in progress and set startedAt', () => {
        const task = createTask({ title: 'Test Task' });
        const startedTask = startTask(task);

        expect(startedTask.status).toBe(TASK_STATUS.IN_PROGRESS);
        expect(startedTask.startedAt).toBeInstanceOf(Date);
        expect(startedTask.updatedAt).toBeInstanceOf(Date);
      });
    });

    describe('assignTask', () => {
      it('should assign task to users with due date', () => {
        const task = createTask({ title: 'Test Task' });
        const dueDate = new Date('2024-12-31');
        const preferredStartTime = new Date('2024-12-31T10:00:00');

        const assignedTask = assignTask(
          task,
          'partner_123',
          'user_456',
          dueDate,
          preferredStartTime,
        );

        expect(assignedTask.assignedBy).toBe('partner_123');
        expect(assignedTask.assignedTo).toBe('user_456');
        expect(assignedTask.dueDate).toEqual(dueDate);
        expect(assignedTask.preferredStartTime).toEqual(preferredStartTime);
      });

      it('should assign task without dates', () => {
        const task = createTask({ title: 'Test Task' });
        const assignedTask = assignTask(task, 'partner_123', 'user_456');

        expect(assignedTask.assignedBy).toBe('partner_123');
        expect(assignedTask.assignedTo).toBe('user_456');
        expect(assignedTask.dueDate).toBeNull();
        expect(assignedTask.preferredStartTime).toBeNull();
      });
    });

    describe('addEncouragement', () => {
      it('should add encouragement to task', () => {
        const task = createTask({ title: 'Test Task' });
        const encouragement = {
          message: "You're doing great!",
          fromUserId: 'partner_123',
        };

        const encouragedTask = addEncouragement(task, encouragement);

        expect(encouragedTask.encouragementReceived).toHaveLength(1);
        expect(encouragedTask.encouragementReceived[0]).toMatchObject({
          message: "You're doing great!",
          fromUserId: 'partner_123',
          timestamp: expect.any(Date),
        });
      });

      it('should append to existing encouragements', () => {
        const task = createTask({ title: 'Test Task' });
        let encouragedTask = addEncouragement(task, {
          message: 'First message',
          fromUserId: 'partner_123',
        });
        encouragedTask = addEncouragement(encouragedTask, {
          message: 'Second message',
          fromUserId: 'partner_123',
        });

        expect(encouragedTask.encouragementReceived).toHaveLength(2);
        expect(encouragedTask.encouragementReceived[1].message).toBe('Second message');
      });
    });

    describe('markPartnerNotified', () => {
      it('should mark partner as notified for task start', () => {
        const task = createTask({ title: 'Test Task' });
        const notifiedTask = markPartnerNotified(task, 'onStart');

        expect(notifiedTask.partnerNotified.onStart).toBe(true);
        expect(notifiedTask.partnerNotified.onComplete).toBe(false);
        expect(notifiedTask.partnerNotified.onOverdue).toBe(false);
      });

      it('should mark partner as notified for task completion', () => {
        const task = createTask({ title: 'Test Task' });
        const notifiedTask = markPartnerNotified(task, 'onComplete');

        expect(notifiedTask.partnerNotified.onComplete).toBe(true);
      });
    });

    describe('isOverdue', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should return true for overdue task', () => {
        const task = createTask({
          title: 'Test Task',
          dueDate: new Date('2024-01-10'),
        });

        expect(isOverdue(task)).toBe(true);
      });

      it('should return false for future task', () => {
        const task = createTask({
          title: 'Test Task',
          dueDate: new Date('2024-01-20'),
        });

        expect(isOverdue(task)).toBe(false);
      });

      it('should return false for completed task', () => {
        const task = createTask({
          title: 'Test Task',
          dueDate: new Date('2024-01-10'),
        });
        task.completed = true;

        expect(isOverdue(task)).toBe(false);
      });

      it('should return false for task without due date', () => {
        const task = createTask({ title: 'Test Task' });

        expect(isOverdue(task)).toBe(false);
      });
    });

    describe('getTimeUntilDue', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-15T12:00:00'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should return time until due date', () => {
        const task = createTask({
          title: 'Test Task',
          dueDate: new Date('2024-01-16T12:00:00'),
        });

        const timeUntilDue = getTimeUntilDue(task);
        expect(timeUntilDue).toBe(24 * 60 * 60 * 1000); // 24 hours in milliseconds
      });

      it('should return negative time for overdue task', () => {
        const task = createTask({
          title: 'Test Task',
          dueDate: new Date('2024-01-14T12:00:00'),
        });

        const timeUntilDue = getTimeUntilDue(task);
        expect(timeUntilDue).toBe(-24 * 60 * 60 * 1000); // -24 hours
      });

      it('should return null for completed task', () => {
        const task = createTask({
          title: 'Test Task',
          dueDate: new Date('2024-01-16T12:00:00'),
        });
        task.completed = true;

        expect(getTimeUntilDue(task)).toBeNull();
      });

      it('should return null for task without due date', () => {
        const task = createTask({ title: 'Test Task' });

        expect(getTimeUntilDue(task)).toBeNull();
      });
    });
  });
});
