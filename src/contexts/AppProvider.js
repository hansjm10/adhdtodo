// ABOUTME: AppProvider combines all app contexts into single provider
// Simplifies app setup by nesting all providers in correct order

import React from 'react';
import { UserProvider } from './UserContext';
import { TaskProvider } from './TaskContext';
import { NotificationProvider } from './NotificationContext';

export const AppProvider = ({ children }) => {
  return (
    <UserProvider>
      <TaskProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </TaskProvider>
    </UserProvider>
  );
};
