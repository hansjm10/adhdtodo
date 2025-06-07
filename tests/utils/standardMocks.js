// ABOUTME: Standardized mock factories for consistent test mocking
// Provides reusable mock implementations for common services and dependencies

/**
 * Creates a standard Supabase channel mock with all required methods
 */
export const createSupabaseChannelMock = () => ({
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn().mockReturnThis(),
  send: jest.fn().mockResolvedValue({ error: null }),
});

/**
 * Creates a standard Supabase query builder mock with chainable methods
 */
export const createSupabaseQueryBuilderMock = (data = null, error = null) => {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  };

  // Make it thenable for async operations
  builder.then = (resolve) => resolve({ data: Array.isArray(data) ? data : [data], error });

  return builder;
};

/**
 * Creates a standard Supabase auth mock
 */
export const createSupabaseAuthMock = (user = null) => ({
  getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
  getSession: jest
    .fn()
    .mockResolvedValue({ data: { session: user ? { user } : null }, error: null }),
  signIn: jest.fn().mockResolvedValue({ data: { user }, error: null }),
  signUp: jest.fn().mockResolvedValue({ data: { user }, error: null }),
  signOut: jest.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  })),
});

/**
 * Creates a standard Supabase mock with all common methods
 */
export const createSupabaseMock = (options = {}) => ({
  auth: createSupabaseAuthMock(options.user),
  from: jest.fn(() => createSupabaseQueryBuilderMock(options.data, options.error)),
  channel: jest.fn(() => createSupabaseChannelMock()),
  rpc: jest.fn().mockResolvedValue({ data: options.rpcData || null, error: null }),
});

/**
 * Creates a standard AsyncStorage mock
 */
export const createAsyncStorageMock = (initialData = {}) => {
  const storage = { ...initialData };

  return {
    getItem: jest.fn((key) => Promise.resolve(storage[key] || null)),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Object.keys(storage))),
    multiGet: jest.fn((keys) => Promise.resolve(keys.map((key) => [key, storage[key] || null]))),
    multiSet: jest.fn((pairs) => {
      pairs.forEach(([key, value]) => {
        storage[key] = value;
      });
      return Promise.resolve();
    }),
  };
};

/**
 * Creates a standard SecureStore mock
 */
export const createSecureStoreMock = (initialData = {}) => {
  const storage = { ...initialData };

  return {
    getItemAsync: jest.fn((key) => Promise.resolve(storage[key] || null)),
    setItemAsync: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete storage[key];
      return Promise.resolve();
    }),
  };
};

/**
 * Creates a standard notification service mock
 */
export const createNotificationServiceMock = () => ({
  getNotificationsForUser: jest.fn().mockResolvedValue([]),
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-123' }),
  markAsRead: jest.fn().mockResolvedValue(true),
  deleteNotification: jest.fn().mockResolvedValue(true),
  clearAllNotifications: jest.fn().mockResolvedValue(true),
  notifyTaskAssigned: jest.fn().mockResolvedValue({ id: 'notif-123' }),
  notifyTaskCompleted: jest.fn().mockResolvedValue({ id: 'notif-124' }),
  notifyTaskReminder: jest.fn().mockResolvedValue({ id: 'notif-125' }),
  subscribeToNotifications: jest.fn().mockReturnValue(jest.fn()),
});

/**
 * Creates a standard user storage service mock
 */
export const createUserStorageServiceMock = (currentUser = null) => ({
  getCurrentUser: jest.fn().mockResolvedValue(currentUser),
  getUserById: jest.fn().mockResolvedValue(currentUser),
  getUserToken: jest.fn().mockResolvedValue('mock-token'),
  saveUser: jest.fn().mockResolvedValue(true),
  updateUser: jest.fn().mockResolvedValue(true),
  clearCurrentUser: jest.fn().mockResolvedValue(true),
  setCurrentUser: jest.fn().mockResolvedValue(true),
  logout: jest.fn().mockResolvedValue(true),
  subscribeToUserUpdates: jest.fn().mockReturnValue(jest.fn()),
});

/**
 * Creates a standard task storage service mock
 */
export const createTaskStorageServiceMock = (tasks = []) => ({
  getAllTasks: jest.fn().mockResolvedValue(tasks),
  getTaskById: jest.fn().mockResolvedValue(tasks[0] || null),
  saveTask: jest.fn().mockResolvedValue(true),
  updateTask: jest.fn().mockResolvedValue(true),
  deleteTask: jest.fn().mockResolvedValue(true),
  getTasksForUser: jest.fn().mockResolvedValue(tasks),
  subscribeToTaskUpdates: jest.fn().mockReturnValue(jest.fn()),
});

/**
 * Creates a standard partnership service mock
 */
export const createPartnershipServiceMock = (partnerships = []) => ({
  getAllPartnerships: jest.fn().mockResolvedValue(partnerships),
  getPartnershipByUsers: jest.fn().mockResolvedValue(partnerships[0] || null),
  getPartnershipByInviteCode: jest.fn().mockResolvedValue(partnerships[0] || null),
  getActivePartnership: jest.fn().mockResolvedValue(partnerships[0] || null),
  createPartnershipInvite: jest
    .fn()
    .mockResolvedValue({ id: 'partnership-123', inviteCode: 'ABC123' }),
  acceptPartnershipInvite: jest
    .fn()
    .mockResolvedValue({ success: true, partnership: partnerships[0] }),
  savePartnership: jest.fn().mockResolvedValue(true),
  updatePartnership: jest.fn().mockResolvedValue(true),
  incrementPartnershipStat: jest.fn().mockResolvedValue(true),
  clearAllPartnerships: jest.fn().mockResolvedValue(true),
  subscribeToPartnershipUpdates: jest.fn().mockReturnValue(jest.fn()),
});

/**
 * Mock console methods for consistent test output
 */
export const setupConsoleMocks = () => {
  const originalConsole = { ...global.console };

  beforeEach(() => {
    global.console.info = jest.fn();
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  return {
    expectNoConsoleErrors: () => expect(global.console.error).not.toHaveBeenCalled(),
    expectNoConsoleWarnings: () => expect(global.console.warn).not.toHaveBeenCalled(),
    expectConsoleError: (message) =>
      expect(global.console.error).toHaveBeenCalledWith(
        expect.stringContaining(message),
        expect.anything(),
      ),
  };
};

/**
 * Standard test data factories
 */
export const testDataFactories = {
  user: (overrides = {}) => ({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'adhd_user',
    partnerId: null,
    ...overrides,
  }),

  task: (overrides = {}) => ({
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    userId: 'user-123',
    completed: false,
    priority: 'medium',
    category: 'work',
    estimatedDuration: 30,
    actualDuration: null,
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  notification: (overrides = {}) => ({
    id: 'notif-123',
    userId: 'user-123',
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: 'You have been assigned a new task',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }),

  partnership: (overrides = {}) => ({
    id: 'partnership-123',
    adhdUserId: 'user-123',
    partnerId: 'partner-456',
    status: 'active',
    inviteCode: 'ABC123',
    inviteSentBy: 'user-123',
    settings: {
      allowTaskAssignment: true,
      shareProgress: true,
      allowEncouragement: true,
      allowCheckIns: true,
      quietHoursStart: null,
      quietHoursEnd: null,
    },
    stats: {
      tasksAssigned: 0,
      tasksCompleted: 0,
      encouragementsSent: 0,
      checkInsCompleted: 0,
      partnershipDuration: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
    terminatedAt: null,
    ...overrides,
  }),
};
