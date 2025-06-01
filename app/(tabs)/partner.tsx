// ABOUTME: Partner tab entry point - redirects to partnership management
// Serves as the main entry for partnership features

import { Redirect } from 'expo-router';

export default function PartnerScreen() {
  // Redirect to the partnership screen in the profile section
  return <Redirect href="/profile/partnership" />;
}
