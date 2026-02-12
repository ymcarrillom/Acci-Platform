export const auth = {
  getAccessToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  getRole() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userRole');
  },
  setTokens({ accessToken, refreshToken, role }) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (role) localStorage.setItem('userRole', role);
  },
  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
  },
};
