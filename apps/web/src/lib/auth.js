export const auth = {
  getAccessToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  getRefreshToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  setTokens({ accessToken, refreshToken }) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },
  clear() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};
