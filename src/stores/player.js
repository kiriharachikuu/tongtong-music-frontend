import { defineStore } from 'pinia';
import { addFavorite, removeFavorite } from '../api/endpoints';

// 全局唯一 <audio> 实例
let audio = null;
function ensureAudio() {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = Number(localStorage.getItem('tt_volume')) || 0.8;
  }
  return audio;
}

// ============ LRU 音频缓存（IndexedDB 持久化 + 内存 LRU） ============
const LRU_CACHE_MAX = 500 * 1024 * 1024; // 500MB
const DB_NAME = 'tt-audio-cache';
const STORE_NAME = 'blobs';
let idb = null;

/** 打开 IndexedDB */
function openIDB() {
  if (idb) return Promise.resolve(idb);
  return new Promise((resolve) => {
    if (!('indexedDB' in window)) return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      };
      req.onsuccess = () => { idb = req.result; resolve(idb); };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

/** 从 IndexedDB 读取缓存 */
async function idbGet(url) {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

/** 写入 IndexedDB 缓存 */
async function idbPut(url, blob, size) {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ url, blob, size, ts: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}

/** 清理超出容量的最旧缓存条目 */
async function idbEvict() {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        let total = all.reduce((s, e) => s + (e.size || 0), 0);
        if (total <= LRU_CACHE_MAX) { resolve(); return; }
        // 按 ts 升序淘汰
        all.sort((a, b) => a.ts - b.ts);
        for (const entry of all) {
          if (total <= LRU_CACHE_MAX) break;
          store.delete(entry.url);
          total -= (entry.size || 0);
        }
        tx.oncomplete = () => resolve();
      };
      req.onerror = () => resolve();
    } catch { resolve(); }
  });
}

/** 获取缓存：优先内存，其次 IndexedDB */
const memCache = new Map();
async function cacheGet(url) {
  // 内存命中
  const mem = memCache.get(url);
  if (mem) { mem.ts = Date.now(); return mem.blob; }
  // IndexedDB 命中
  const entry = await idbGet(url);
  if (entry && entry.blob) {
    memCache.set(url, { blob: entry.blob, size: entry.size, ts: Date.now() });
    return entry.blob;
  }
  return null;
}

/** 写入缓存：内存 + IndexedDB 双写 */
async function cachePut(url, blob) {
  const size = blob.size || 0;
  memCache.set(url, { blob, size, ts: Date.now() });
  // 内存 LRU 淘汰
  let total = size;
  for (const v of memCache.values()) total += v.size;
  while (total > LRU_CACHE_MAX && memCache.size > 1) {
    let oldest = { ts: Infinity, url: '' };
    for (const [k, v] of memCache) if (v.ts < oldest.ts) oldest = { url: k, ts: v.ts };
    const removed = memCache.get(oldest.url);
    if (removed) total -= removed.size;
    memCache.delete(oldest.url);
  }
  // 异步写入 IndexedDB（不阻塞播放）
  idbPut(url, blob, size).then(idbEvict).catch(() => {});
}

/** 将 URL 转为可播放的 blob URL（命中缓存时） */
function blobUrl(blob) {
  try { return URL.createObjectURL(blob); } catch { return null; }
}

/** 预加载下一曲音频到缓存 */
async function preloadNext(url) {
  if (!url) return;
  // 已缓存则跳过
  if (memCache.has(url)) return;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return;
    const blob = await resp.blob();
    await cachePut(url, blob);
  } catch { /* 预加载失败静默忽略 */ }
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    current: null,
    playlist: [],
    index: 0,
    playing: false,
    loading: false,
    error: '',
    loopMode: 'sequential',
    currentTime: 0,
    duration: 0,
    volume: Number(localStorage.getItem('tt_volume')) || 0.8,
    favorites: JSON.parse(localStorage.getItem('tt_favs') || '[]'),  // 使用数组代替 Set，确保响应式
    _currentBlobUrl: null,
    _audioBound: false,
  }),
  actions: {
    _bindAudioEvents(el) {
      if (this._audioBound) return;
      this._audioBound = true;
      el.onloadedmetadata = () => {
        this.duration = el.duration || 0;
        this.loading = false;
        this._schedulePreload();
      };
      el.ontimeupdate = () => { this.currentTime = el.currentTime || 0; };
      el.onended = () => {
        if (this.loopMode === 'repeatOne') { el.currentTime = 0; el.play().catch(() => {}); }
        else this.next();
      };
      el.onerror = () => {
        this.loading = false;
        this.playing = false;
        this.error = '音频加载失败，请检查网络或重试';
        console.error('[Player] 音频加载错误');
      };
      el.oncanplay = () => { this.loading = false; this.error = ''; };
      el.onplay = () => { this.playing = true; };
      el.onpause = () => { this.playing = false; };
    },
    async play(songOrId, playlist) {
      const el = ensureAudio();
      if (!el) return;
      this._bindAudioEvents(el);
      const song = typeof songOrId === 'object' ? songOrId : { id: songOrId };
      if (playlist && playlist.length) {
        this.playlist = playlist;
        const idx = playlist.findIndex(s => s.id === song.id);
        this.index = idx >= 0 ? idx : 0;
      }
      const url = song.audioUrl || `/api/songs/${song.id}/stream`;
      this.current = { ...song, audioUrl: url };
      this.error = '';
      this.loading = true;

      el.pause();
      if (this._currentBlobUrl) { URL.revokeObjectURL(this._currentBlobUrl); this._currentBlobUrl = null; }

      try {
        let srcUrl = url;
        const blob = await cacheGet(url);
        if (blob && this.current && this.current.audioUrl === url) {
          const burl = blobUrl(blob);
          if (burl) { this._currentBlobUrl = burl; srcUrl = burl; }
        }
        el.src = srcUrl;
        el.load();
        const playPromise = el.play();
        if (playPromise && playPromise.catch) {
          playPromise.catch((err) => {
            console.warn('[Player] 播放被阻止:', err?.message || err);
            this.playing = false;
            this.loading = false;
          });
        }
        if (!blob) {
          fetch(url).then((r) => r.ok ? r.blob() : null).then((b) => {
            if (b && this.current && this.current.audioUrl === url) cachePut(url, b);
          }).catch(() => {});
        }
      } catch (e) {
        this.loading = false;
        this.error = '播放失败: ' + (e?.message || e);
        console.error('[Player] play error:', e);
      }

      if ('mediaSession' in navigator) {
        try {
          const coverArt = song.coverUrl || song.cover;
          navigator.mediaSession.metadata = new window.MediaMetadata({
            title: song.title || '未知歌曲',
            artist: song.singer || '',
            album: song.album || '',
            artwork: coverArt ? [{ src: coverArt, sizes: '512x512', type: 'image/png' }] : []
          });
          navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
          navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
          navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
          navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) this.seek(details.seekTime);
          });
          navigator.mediaSession.setActionHandler('seekforward', (details) => {
            const offset = details.seekOffset || 10;
            this.seek(Math.min((el.currentTime || 0) + offset, el.duration || 0));
          });
          navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            const offset = details.seekOffset || 10;
            this.seek(Math.max((el.currentTime || 0) - offset, 0));
          });
          navigator.mediaSession.setActionHandler('stop', () => { el.pause(); this.playing = false; });
        } catch (e) {}
      }
    },
    /** 预加载下一曲：当前曲剩余 30s 时触发 */
    _schedulePreload() {
      if (this._preloadTimer) clearTimeout(this._preloadTimer);
      const check = () => {
        const el = ensureAudio();
        if (!el || !this.playlist.length) return;
        const remaining = (el.duration || 0) - (el.currentTime || 0);
        if (remaining > 0 && remaining <= 30) {
          let nextIdx;
          if (this.loopMode === 'shuffle') {
            nextIdx = Math.floor(Math.random() * this.playlist.length);
          } else if (this.loopMode === 'sequential' && this.index + 1 >= this.playlist.length) {
            return;
          } else {
            nextIdx = (this.index + 1) % this.playlist.length;
          }
          const nextSong = this.playlist[nextIdx];
          if (nextSong) {
            const nextUrl = nextSong.audioUrl || `/api/songs/${nextSong.id}/stream`;
            preloadNext(nextUrl);
          }
        } else {
          this._preloadTimer = setTimeout(check, 5000);
        }
      };
      this._preloadTimer = setTimeout(check, 5000);
    },
    pause() { const el = ensureAudio(); if (el) el.pause(); this.playing = false; },
    togglePlay() {
      const el = ensureAudio(); if (!el || !this.current) return;
      if (el.paused) { el.play().catch(() => {}); this.playing = true; }
      else { el.pause(); this.playing = false; }
    },
    seek(sec) {
      const el = ensureAudio(); if (!el) return;
      if (this._seekTimer) clearTimeout(this._seekTimer);
      this._seekTimer = setTimeout(() => {
        if (!isNaN(sec) && isFinite(sec)) el.currentTime = Math.max(0, Math.min(sec, el.duration || sec));
      }, 80);
      this.currentTime = sec;
    },
    setVolume(v) {
      this.volume = v; localStorage.setItem('tt_volume', String(v));
      const el = ensureAudio(); if (el) el.volume = v;
    },
    next() {
      if (!this.playlist || !this.playlist.length) return;
      let idx = this.index;
      if (this.loopMode === 'shuffle') {
        idx = Math.floor(Math.random() * this.playlist.length);
      } else if (this.loopMode === 'list' || this.loopMode === 'repeatOne') {
        // 列表循环/单曲循环（手动切歌）：到末尾回到第一首
        idx = (idx + 1) % this.playlist.length;
      } else {
        // sequential：顺序前进，到末尾停止
        if (idx + 1 >= this.playlist.length) {
          const el = ensureAudio();
          if (el) { el.pause(); el.currentTime = 0; }
          this.playing = false;
          this.currentTime = 0;
          return;
        }
        idx = idx + 1;
      }
      this.index = idx;
      this.play(this.playlist[idx], this.playlist);
    },
    prev() {
      if (!this.playlist || !this.playlist.length) return;
      let idx = this.index;
      if (this.loopMode === 'shuffle') {
        idx = Math.floor(Math.random() * this.playlist.length);
      } else if (this.loopMode === 'list' || this.loopMode === 'repeatOne') {
        // 列表循环/单曲循环（手动切歌）：到第一首回到末尾
        idx = (idx - 1 + this.playlist.length) % this.playlist.length;
      } else {
        // sequential：到第一首时不回退
        if (idx - 1 < 0) return;
        idx = idx - 1;
      }
      this.index = idx;
      this.play(this.playlist[idx], this.playlist);
    },
    toggleLoop() {
      const modes = ['sequential', 'repeatOne', 'list', 'shuffle'];
      this.loopMode = modes[(modes.indexOf(this.loopMode) + 1) % modes.length];
    },
    /** 收藏切换：乐观更新本地 + 同步服务端 */
    async toggleFavorite(songId) {
      const wasFav = this.favorites.includes(songId);
      // 乐观更新：必须替换整个数组触发响应式
      if (wasFav) {
        this.favorites = this.favorites.filter(id => id !== songId);
      } else {
        this.favorites = [...this.favorites, songId];
      }
      localStorage.setItem('tt_favs', JSON.stringify(this.favorites));
      // 同步服务端
      try {
        if (wasFav) await removeFavorite(songId);
        else await addFavorite(songId);
      } catch (e) {
        // 失败回滚
        if (wasFav) {
          this.favorites = [...this.favorites, songId];
        } else {
          this.favorites = this.favorites.filter(id => id !== songId);
        }
        localStorage.setItem('tt_favs', JSON.stringify(this.favorites));
        console.warn('收藏同步失败，已回滚:', e);
      }
    },
    isFavorite(songId) { return this.favorites.includes(songId); },
    /** 下一首播放：把歌曲插入当前播放索引 + 1 位置（state 字段为 playlist/index，据此适配） */
    playNext(song) {
      if (!song) return;
      // 去重（如果已存在则先移除）
      const existingIdx = this.playlist.findIndex((s) => s.id === song.id);
      if (existingIdx >= 0) this.playlist.splice(existingIdx, 1);
      // 插入到当前位置 + 1
      const insertIdx = Math.min(this.index + 1, this.playlist.length);
      this.playlist.splice(insertIdx, 0, song);
    },
    /** 拖拽排序播放列表 */
    reorderPlaylist(from, to) {
      if (from < 0 || to < 0 || from >= this.playlist.length || to >= this.playlist.length) return;
      const list = [...this.playlist];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      // 更新当前播放索引
      const currentId = this.current && this.current.id;
      this.playlist = list;
      if (currentId) {
        this.index = list.findIndex(s => s.id === currentId);
      }
    }
  }
});
