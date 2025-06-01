// ABOUTME: AppProvider combines all app contexts into single provider
// Simplifies app setup by nesting all providers in correct order

import React, { ReactNode } from 'react';
import { UserProvider } from './UserContext';
import { TaskProvider } from './TaskContext';
import { NotificationProvider } from './NotificationContext';

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <UserProvider>
      <TaskProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </TaskProvider>
    </UserProvider>
  );
};
