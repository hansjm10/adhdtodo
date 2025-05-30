// ABOUTME: Tests for task-related constants
// Verifies task categories, time presets, and other constants

import { TASK_CATEGORIES, TIME_PRESETS, TASK_STATUS } from '../TaskConstants';

describe('TaskConstants', () => {
  describe('TASK_CATEGORIES', () => {
    it('should have required predefined categories', () => {
      expect(TASK_CATEGORIES).toBeDefined();
      expect(TASK_CATEGORIES).toHaveProperty('HOME');
      expect(TASK_CATEGORIES).toHaveProperty('WORK');
      expect(TASK_CATEGORIES).toHaveProperty('PERSONAL');
    });

    it('should have proper category objects', () => {
      expect(TASK_CATEGORIES.HOME).toHaveProperty('id', 'home');
      expect(TASK_CATEGORIES.HOME).toHaveProperty('label', 'Home');
      expect(TASK_CATEGORIES.HOME).toHaveProperty('color');
    });
  });

  describe('TIME_PRESETS', () => {
    it('should have quick time presets', () => {
      expect(TIME_PRESETS).toBeDefined();
      expect(TIME_PRESETS).toContainEqual({ minutes: 5, label: '5 min' });
      expect(TIME_PRESETS).toContainEqual({ minutes: 15, label: '15 min' });
      expect(TIME_PRESETS).toContainEqual({ minutes: 30, label: '30 min' });
      expect(TIME_PRESETS).toContainEqual({ minutes: 60, label: '1 hour' });
    });
  });

  describe('TASK_STATUS', () => {
    it('should have required status types', () => {
      expect(TASK_STATUS).toBeDefined();
      expect(TASK_STATUS).toHaveProperty('PENDING', 'pending');
      expect(TASK_STATUS).toHaveProperty('IN_PROGRESS', 'in_progress');
      expect(TASK_STATUS).toHaveProperty('COMPLETED', 'completed');
    });
  });
});
