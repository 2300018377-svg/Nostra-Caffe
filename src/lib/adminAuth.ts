export const ADMIN_PASSWORD = 'admin123';
export const ADMIN_SESSION_KEY = 'nostra-caffe-admin-session';

export const isAdminSessionActive = () => {
  return typeof window !== 'undefined' && window.sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
};

export const startAdminSession = () => {
  window.sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
};

export const clearAdminSession = () => {
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
};
