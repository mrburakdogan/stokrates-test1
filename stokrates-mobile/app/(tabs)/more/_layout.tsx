import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="debt-credits" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="todos" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="cost-calculator" />
      <Stack.Screen name="production-cost" />
      <Stack.Screen name="trendyol-analysis" />
      <Stack.Screen name="users" />
      <Stack.Screen name="error-logs" />
    </Stack>
  );
}
