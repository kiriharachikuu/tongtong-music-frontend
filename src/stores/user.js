import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('tt_user') || 'null'),
    token: localStorage.getItem('tt_token') || ''
  }),
  getters: {
    loggedIn: (s) => !!s.token,
    isAdmin: (s) => !!(s.user && s.user.is_admin)
  },
  actions: {
    setAuth(user, token) {
      this.user = user;
      this.token = token;
      if (user) localStorage.setItem('tt_user', JSON.stringify(user)); else localStorage.removeItem('tt_user');
      if (token) localStorage.setItem('tt_token', token); else localStorage.removeItem('tt_token');
    },
    // 修改昵称：动态 import 避免循环依赖
    // 注意：client.js 响应拦截器已对 {code,data} 结构解包（return res.data.data），
    // 因此此处 res 即业务 data 本体，直接读取 res.nickname
    async updateNickname(nickname) {
      const { updateMe } = await import('../api/endpoints');
      const res = await updateMe({ nickname });
      if (res) {
        this.user = { ...this.user, nickname: res.nickname };
        localStorage.setItem('tt_user', JSON.stringify(this.user));
      }
      return res;
    },
    logout() { this.setAuth(null, ''); }
  }
});
