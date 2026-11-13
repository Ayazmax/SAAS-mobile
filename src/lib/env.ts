import Constants from 'expo-constants';

const fromExtra = Constants.expoConfig?.extra?.apiUrl;
const fromPublic = process.env.EXPO_PUBLIC_API_URL;
const webFromExtra = Constants.expoConfig?.extra?.webUrl;
const webFromPublic = process.env.EXPO_PUBLIC_WEB_URL;

export const apiUrl = (
  (typeof fromPublic === 'string' && fromPublic) ||
  (typeof fromExtra === 'string' && fromExtra) ||
  'http://localhost:4000/api/v1'
).replace(/\/$/, '');

export const webUrl = (
  (typeof webFromPublic === 'string' && webFromPublic) ||
  (typeof webFromExtra === 'string' && webFromExtra) ||
  'http://localhost:3000'
).replace(/\/$/, '');
