import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000
});

let accessToken = localStorage.getItem('tt_token') || '';

export function setToken(token) {
  accessToken = token || '';
  if (accessToken) localStorage.setItem('tt_token', accessToken);
  else localStorage.removeItem('tt_token');
}

api.interceptors.request.use((cfg) => {
  if (accessToken) cfg.headers['Authorization'] = `Bearer ${accessToken}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => {
    // 非 JSON 响应（如 text/plain 的 LRC 歌词、二进制音频流）直接返回 body
    if (typeof res.data !== 'object' || res.data === null) return res.data;
    // 标准响应 { code, message, data }：若存在则返回 data 本体，使用方无需再拆
    if ('code' in res.data && 'data' in res.data) return res.data.data;
    return res.data;
  },
  (err) => {
    const msg = (err.response && err.response.data && err.response.data.message) || err.message;
    if (err.response && err.response.status === 401) {
      if (location.hash.includes('/admin') || location.pathname.includes('/admin')) {
        location.hash = '/login';
      }
    }
    return Promise.reject(new Error(msg));
  }
);

export default api;
