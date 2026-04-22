// Use environment variable in Docker, fallback to /api/v1 (nginx proxies in Docker)
// For local dev without docker: use http://localhost:8000/api/v1
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const AUTH_LOGIN_FLASH_KEY = 'dac.auth.login_flash';

export const COLORS = {
  primary: '#99D1C5',   // brand green
  secondary: '#928FC5', // brand purple
  success: '#99D1C5',   // brand green
  danger: '#E76351',    // brand red
  warning: '#F59E0B',   // amber
  chart: ['#99D1C5', '#928FC5', '#528BE0', '#E76351', '#F59E0B', '#EC4899', '#6366F1'],
  severity: {
    informational: '#528BE0', // brand blue
    low: '#99D1C5',           // brand green
    medium: '#F59E0B',        // amber
    high: '#E76351',          // brand red
    critical: '#B91C1C',      // dark red
  }
};
