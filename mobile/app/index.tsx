import { Redirect } from 'expo-router';

import { useAuth } from '../src/features/auth';

// "/" itself sits outside both the (auth) and (app) groups, so it always
// needs to redirect somewhere. By the time this mounts, RootLayout's
// RootNavigator has already resolved status away from "loading" (it renders
// a loading view instead of the Stack while status is "loading", so this
// screen is never reached mid-initialization) - status is only ever
// 'authenticated' or 'unauthenticated' here.
export default function Index() {
  const { status } = useAuth();
  return <Redirect href={status === 'authenticated' ? '/(app)/home' : '/(auth)/login'} />;
}
