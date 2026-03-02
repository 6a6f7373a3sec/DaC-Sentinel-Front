// Use environment variable in Docker, fallback to localhost for local dev
// In Docker: VITE_API_URL should be /api (nginx proxies /api/ to backend)
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const COLORS = {
  primary: '#2563eb', // blue-600
  secondary: '#475569', // slate-600
  success: '#16a34a', // green-600
  danger: '#dc2626', // red-600
  warning: '#ca8a04', // yellow-600
  chart: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'],
  severity:{
    informational: '#3b82f6', // blue-500
    low: '#22c55e', // green-500
    medium: '#f59e0b', // yellow-500
    high: '#ef4444', // red-500
    critical: '#b91c1c', // red-700
  }
};