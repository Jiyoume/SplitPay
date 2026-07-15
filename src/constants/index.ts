export { Colors } from './colors';

export const APP_NAME = 'MyShare';
export const CURRENCY_SYMBOL = '$';
export const DEFAULT_SPLIT_METHOD = 'equal';
export const GOOGLE_WEB_CLIENT_ID = '947092823614-xxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com'; // Replace with your real Web Client ID from Google Cloud Console

export const SPLIT_METHODS = {
  EQUAL: 'equal',
  EXACT: 'exact',
  PERCENTAGE: 'percentage',
} as const;

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Food & Drinks', icon: 'restaurant' },
  { id: 'transport', label: 'Transport', icon: 'car' },
  { id: 'shopping', label: 'Shopping', icon: 'cart' },
  { id: 'entertainment', label: 'Entertainment', icon: 'film' },
  { id: 'utilities', label: 'Utilities', icon: 'flash' },
  { id: 'rent', label: 'Rent', icon: 'home' },
  { id: 'groceries', label: 'Groceries', icon: 'basket' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
] as const;
