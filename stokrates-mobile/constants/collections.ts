// Collection keys — must match web app's db.ts exactly
export const COLLECTIONS = [
  'products',
  'customers',
  'sales',
  'expenses',
  'users',
  'todos',
  'debt_credits',
  'msg_templates',
  'messages_log',
  'system_logs',
  'trendyol_analyses',
  'platforms',
  'assets',
  'asset_transactions',
] as const;

export type CollectionKey = (typeof COLLECTIONS)[number];

// Settings keys — stored in app_settings table
export const SETTING_KEYS = [
  'trendyol_config',
  'shipping_settings',
  'announcement_settings',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
