import { defineStore } from 'pinia';

export const useDownloadStore = defineStore('download', {
  state: () => ({
    // 本次会话下载历史（仅内存，不持久化；PWA 沙箱无法枚举设备文件）
    history: []
  }),
  actions: {
    record(song) {
      if (!song) return;
      // 去重：同歌曲只保留最新一条
      this.history = this.history.filter((s) => s.id !== song.id);
      this.history.unshift({
        id: song.id,
        title: song.title,
        singer: song.singer,
        coverUrl: song.coverUrl || '',
        downloadedAt: new Date().toISOString()
      });
      // 最多保留 100 条
      if (this.history.length > 100) this.history = this.history.slice(0, 100);
    },
    clear() {
      this.history = [];
    }
  }
});
