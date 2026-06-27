import { defineStore } from 'pinia';

// 10 套主题预设（与 global.css 中的 data-theme 属性对应）
const THEMES = [
  { id: 'light', name: '浅色', color: '#fbfbfd' },
  { id: 'dark', name: '深色', color: '#000000' },
  { id: 'apple-purple', name: '苹果紫', color: '#8B00FF' },
  { id: 'deep-blue', name: '深海蓝', color: '#0066CC' },
  { id: 'forest-green', name: '森林绿', color: '#2E8B57' },
  { id: 'sunset-orange', name: '夕阳橙', color: '#FF6B35' },
  { id: 'ink-black', name: '墨黑', color: '#1a1a2e' },
  { id: 'sakura-pink', name: '樱花粉', color: '#FFB7C5' },
  { id: 'star-gray', name: '星空灰', color: '#4A5568' },
  { id: 'retro-gold', name: '复古金', color: '#D4AF37' },
];

export const useThemeStore = defineStore('theme', {
  state: () => ({
    current: localStorage.getItem('tt_theme') || 'light',
    themes: THEMES
  }),
  getters: {
    currentTheme: (s) => s.themes.find((t) => t.id === s.current) || s.themes[0]
  },
  actions: {
    apply(themeId) {
      this.current = themeId;
      localStorage.setItem('tt_theme', themeId);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', themeId);
      }
    },
    init() {
      // 应用启动时从 localStorage 恢复
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', this.current);
      }
    }
  }
});
