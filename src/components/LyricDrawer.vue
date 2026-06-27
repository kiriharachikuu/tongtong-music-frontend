<template>
  <div class="lyric-drawer"
       v-if="open"
       ref="drawerRef"
       :class="{ dragging: isDragging, closing: isClosing }"
       :style="drawerStyle">

    <!-- 主题自适应磨砂背景 -->
    <div class="ld-backdrop"></div>

    <!-- 拖拽手柄 -->
    <div class="ld-handle"
         @pointerdown="onHandlePointerDown"
         :style="{ touchAction: 'none' }">
      <div class="ld-pill"></div>
    </div>

    <!-- 顶部栏：关闭 + 歌曲信息 + 收藏 -->
    <header class="ld-topbar" @pointerdown="onHandlePointerDown">
      <button class="ld-topbar-btn" @click.stop="close" aria-label="关闭">
        <ChevronDown :size="24" />
      </button>
      <div class="ld-topbar-meta">
        <div class="ld-topbar-label">正在播放</div>
        <div class="ld-topbar-title">{{ songTitle }}</div>
      </div>
      <button class="ld-topbar-btn ld-fav-btn"
              :class="{ 'is-fav': isFav }"
              @click.stop="toggleFav"
              :aria-label="isFav ? '取消收藏' : '收藏'">
        <Heart :size="20" :fill="isFav ? 'currentColor' : 'none'" />
      </button>
    </header>

    <!-- 主体：左封面信息 + 右歌词 -->
    <main class="ld-main">
      <!-- 左侧：封面 + 标题/艺术家 + 进度条 -->
      <section class="ld-left">
        <div class="ld-cover-wrap">
          <img class="ld-cover-img"
               :src="coverUrl || defaultCover"
               @error="handleCoverError" />
        </div>
        <h1 class="ld-song-title">{{ songTitle }}</h1>
        <p class="ld-song-artist">
          {{ songArtist }}
          <template v-if="p.current && p.current.album"> · {{ p.current.album }}</template>
        </p>

        <!-- 进度条 -->
        <div class="ld-progress">
          <div class="ld-progress-bar" ref="progressBarRef" @pointerdown="onProgressDown">
            <div class="ld-progress-track">
              <div class="ld-progress-fill" :style="{ width: progressPct + '%' }"></div>
              <div class="ld-progress-thumb" :style="{ left: progressPct + '%' }"></div>
            </div>
          </div>
          <div class="ld-progress-time">
            <span>{{ fmt(p.currentTime) }}</span>
            <span>-{{ fmt(Math.max(0, (p.duration || 0) - (p.currentTime || 0))) }}</span>
          </div>
        </div>
      </section>

      <!-- 右侧：歌词区 -->
      <section class="ld-right">
        <SimpleLyricPlayer
          :lyrics="lyricLines"
          :current-time="p.currentTime"
          :playing="p.playing"
          :loading="lyricLoading"
          :has-song="!!p.current"
          @seek="onLyricSeek" />
      </section>
    </main>

    <!-- 底部控制栏 -->
    <footer class="ld-footer">
      <button class="ld-ctrl" @click="p.prev()" title="上一曲" aria-label="上一曲">
        <SkipBack :size="22" />
      </button>
      <button class="ld-ctrl ld-ctrl-play" @click="p.togglePlay()" :title="p.playing ? '暂停' : '播放'" :aria-label="p.playing ? '暂停' : '播放'">
        <Pause v-if="p.playing" :size="28" fill="currentColor" />
        <Play v-else :size="28" fill="currentColor" style="margin-left:2px" />
      </button>
      <button class="ld-ctrl" @click="p.next()" title="下一曲" aria-label="下一曲">
        <SkipForward :size="22" />
      </button>
      <button class="ld-ctrl ld-ctrl-loop" @click="p.toggleLoop()" :title="'循环：' + loopLabel" aria-label="循环模式">
        <component :is="loopIconComp" :size="18" />
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  ChevronDown, Heart, SkipBack, Play, Pause,
  SkipForward, ListMusic, Repeat1, Repeat, Shuffle
} from 'lucide-vue-next';
import SimpleLyricPlayer from './SimpleLyricPlayer.vue';
import { usePlayerStore } from '../stores/player';
import { getSongLyric } from '../api/endpoints';
import { parseLyric } from '../utils/lyricParser';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open']);

const p = usePlayerStore();
const drawerRef = ref(null);
const progressBarRef = ref(null);
const lyricLines = ref([]);
const lyricLoading = ref(false);
const isDragging = ref(false);
const dragOffsetY = ref(0);
const isClosing = ref(false);

// 计算属性 - 歌曲信息
const songTitle = computed(() => p.current ? p.current.title : '未在播放');
const songArtist = computed(() => p.current ? (p.current.singer || '未知歌手') : '暂无播放内容');
const defaultCover = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#222"/></svg>`
);
const coverUrl = computed(() => (p.current && (p.current.coverUrl || p.current.cover)) || '');
const progressPct = computed(() => {
  if (!p.duration) return 0;
  return Math.min(100, Math.round((p.currentTime / p.duration) * 100));
});
const isFav = computed(() => {
  if (!p.current) return false;
  return p.isFavorite(p.current.id);
});
const loopLabel = computed(() => ({ sequential: '顺序', repeatOne: '单曲', list: '列表', shuffle: '随机' }[p.loopMode] || '顺序'));
const loopIconComp = computed(() => ({ sequential: ListMusic, repeatOne: Repeat1, list: Repeat, shuffle: Shuffle }[p.loopMode] || ListMusic));

const drawerStyle = computed(() => {
  if (isDragging.value && dragOffsetY.value > 0) {
    return { transform: `translateY(${dragOffsetY.value}px)` };
  }
  return {};
});

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function close() {
  if (isClosing.value) return;
  isClosing.value = true;
  setTimeout(() => {
    emit('update:open', false);
    isClosing.value = false;
  }, 400);
}

function toggleFav() {
  if (p.current && p.current.id) {
    console.log('[LyricDrawer] 切换收藏:', p.current.id, p.current.title);
    p.toggleFavorite(p.current.id);
  }
}

function handleCoverError(e) {
  e.target.style.opacity = 0.2;
  e.target.src = defaultCover;
}

/* ---- 拖拽手势 ---- */
let dragStartY = 0;
let dragStartTime = 0;

function onHandlePointerDown(e) {
  if (e.button !== 0) return;
  dragStartY = e.clientY;
  dragStartTime = Date.now();
  dragOffsetY.value = 0;
  isDragging.value = true;
  try { e.target.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}

function onPointerMove(e) {
  if (!isDragging.value) return;
  const dy = e.clientY - dragStartY;
  dragOffsetY.value = Math.max(0, dy);
}

function onPointerUp(e) {
  if (!isDragging.value) return;
  const dy = e.clientY - dragStartY;
  const dt = Date.now() - dragStartTime;
  const velocity = dt > 0 ? dy / dt : 0;
  const threshold = window.innerHeight * 0.25;

  isDragging.value = false;
  dragOffsetY.value = 0;

  if (dy > threshold || velocity > 0.5) {
    close();
  }
}

/* ---- 进度条拖拽 ---- */
function onProgressDown(e) {
  const bar = progressBarRef.value;
  if (!bar) return;
  doSeek(e);
  const onMove = (ev) => doSeek(ev);
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function doSeek(e) {
  const bar = progressBarRef.value;
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const sec = ratio * (p.duration || 0);
  p.seek(sec);
}

/* ---- 歌词加载 ---- */
async function loadLyric(id) {
  if (!id) {
    lyricLines.value = [];
    lyricLoading.value = false;
    return;
  }
  lyricLoading.value = true;
  console.log('[LyricDrawer] 加载歌词，歌曲ID:', id);

  try {
    // 1. 从 API 获取歌词文本
    let text = '';
    try {
      text = await getSongLyric(id);
      console.log('[LyricDrawer] API 返回:', typeof text, ', 前100字:', String(text || '').substring(0, 100));
    } catch (e) {
      console.log('[LyricDrawer] API 失败（可能是无歌词）:', e?.message || e);
    }

    // 2. 确保拿到的是字符串
    const raw = typeof text === 'string' ? text : (text && text.lrc) || '';
    if (!raw.trim()) {
      console.log('[LyricDrawer] 歌词为空，显示无歌词');
      lyricLines.value = [];
      return;
    }

    // 3. 解析歌词
    const parsed = parseLyric(raw);
    console.log('[LyricDrawer] 解析结果:', parsed.length, '行');
    if (parsed.length > 0) {
      console.log('[LyricDrawer] 第一行示例:', parsed[0]);
    }
    lyricLines.value = parsed;

  } catch (e) {
    console.warn('[LyricDrawer] 歌词加载/解析失败:', e);
    lyricLines.value = [];
  } finally {
    lyricLoading.value = false;
  }
}

function onLyricSeek(sec) {
  p.seek(sec);
}

// 监听歌曲切换
watch(() => p.current && p.current.id, (newId, oldId) => {
  if (newId && props.open && newId !== oldId) {
    loadLyric(newId);
  }
});

// 抽屉打开时加载歌词
watch(() => props.open, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden';
    nextTick(() => {
      if (p.current && p.current.id) {
        loadLyric(p.current.id);
      }
    });
  } else {
    document.body.style.overflow = '';
  }
});

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
});

onUnmounted(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  document.body.style.overflow = '';
});
</script>

<style scoped>
.lyric-drawer {
  position: fixed;
  inset: 0;
  z-index: 200;
  color: var(--am-text);
  display: grid;
  grid-template-rows: 12px auto 1fr auto;
  overflow: hidden;
  transform: translateY(0);
  animation: drawerSlideUp 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}
@keyframes drawerSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
@keyframes drawerSlideDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
.lyric-drawer.dragging {
  transition: none;
}
.lyric-drawer.closing {
  animation: drawerSlideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* 背景 - 主题自适应磨砂玻璃 */
.ld-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--am-bg);
  backdrop-filter: blur(40px) saturate(1.8);
  -webkit-backdrop-filter: blur(40px) saturate(1.8);
}

/* 拖拽手柄 */
.ld-handle {
  position: relative;
  z-index: 15;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
  padding-top: 8px;
  cursor: grab;
  user-select: none;
}
.ld-handle:active { cursor: grabbing; }
.ld-pill {
  width: 36px;
  height: 5px;
  border-radius: 3px;
  background: var(--am-text-secondary);
  opacity: 0.4;
}

/* 顶部栏 */
.ld-topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 20px 12px;
}
.ld-topbar-btn {
  width: 40px; height: 40px;
  border-radius: 50%;
  background: var(--am-bg-2);
  color: var(--am-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, transform 0.15s ease, color 0.2s ease;
  border: none;
  cursor: pointer;
}
.ld-topbar-btn:hover { background: var(--am-border); transform: scale(1.05); }
.ld-fav-btn.is-fav { color: var(--am-primary); }
.ld-fav-btn.is-fav:hover { color: var(--am-primary-hover); }

.ld-topbar-meta {
  flex: 1;
  text-align: center;
  min-width: 0;
}
.ld-topbar-label {
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--am-text-secondary);
  margin-bottom: 2px;
}
.ld-topbar-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--am-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 主体 */
.ld-main {
  position: relative;
  z-index: 5;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 48px;
  padding: 8px 48px 20px;
  min-height: 0;
  align-items: start;
  overflow: hidden;
  height: 100%;
}

/* 左侧 */
.ld-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0 4px;
  height: 100%;
  overflow: auto;
}

.ld-cover-wrap {
  width: 100%;
  max-width: 340px;
  aspect-ratio: 1/1;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--am-border);
}
.ld-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ld-song-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--am-text);
  margin: 14px 0 2px;
  letter-spacing: 0.3px;
  text-align: center;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ld-song-artist {
  font-size: 14px;
  color: var(--am-text-secondary);
  margin: 0 0 10px;
  text-align: center;
}

/* 进度条 */
.ld-progress {
  width: 100%;
  max-width: 340px;
}
.ld-progress-bar {
  position: relative;
  height: 22px;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.ld-progress-track {
  width: 100%;
  height: 4px;
  background: var(--am-border);
  border-radius: 4px;
  position: relative;
}
.ld-progress-fill {
  position: absolute;
  left: 0; top: 0;
  height: 100%;
  background: var(--am-primary);
  border-radius: 4px;
  transition: width 0.15s linear;
}
.ld-progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--am-primary);
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 6px rgba(139,0,255,0.3);
  opacity: 0;
  transition: opacity 0.15s ease;
}
.ld-progress-bar:hover .ld-progress-thumb { opacity: 1; }
.ld-progress-time {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--am-text-secondary);
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

/* 右侧歌词 */
.ld-right {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 底部控制栏 */
.ld-footer {
  position: relative;
  z-index: 10;
  padding: 12px 40px 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
.ld-ctrl {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--am-bg-2);
  color: var(--am-text);
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, color 0.2s ease;
}
.ld-ctrl:hover { background: var(--am-border); transform: scale(1.05); }
.ld-ctrl-play {
  width: 68px; height: 68px;
  background: var(--am-primary);
  color: #fff;
  box-shadow: 0 4px 20px rgba(139,0,255,0.35);
}
.ld-ctrl-play:hover { background: var(--am-primary-hover); transform: scale(1.06); }
.ld-ctrl-loop { width: 44px; height: 44px; }

/* 响应式：平板 */
@media (max-width: 1024px) {
  .ld-main {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 8px 24px 16px;
  }
  .ld-cover-wrap { max-width: 260px; }
  .ld-right { min-height: 40vh; height: 60vh; }
}

/* 响应式：手机 */
@media (max-width: 767px) {
  .ld-topbar { padding: 6px 14px 8px; gap: 10px; }
  .ld-topbar-title { font-size: 13px; }
  .ld-main {
    padding: 4px 16px 8px;
    gap: 8px;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
  }
  .ld-left {
    gap: 4px;
    padding: 0;
    overflow: visible;
    flex-shrink: 0;
  }
  .ld-cover-wrap { max-width: 130px; border-radius: 10px; }
  .ld-song-title { font-size: 17px; margin: 4px 0 0; }
  .ld-song-artist { font-size: 12px; margin: 0; }
  .ld-progress { max-width: 260px; margin-top: 2px; }
  .ld-progress-bar { height: 18px; }
  .ld-progress-track { height: 3px; }
  .ld-progress-time { font-size: 10px; margin-top: 2px; }
  .ld-right { min-height: 120px; height: auto; flex: 1; }
  .ld-footer { padding: 6px 16px 20px; gap: 14px; }
  .ld-ctrl { width: 46px; height: 46px; }
  .ld-ctrl-play { width: 60px; height: 60px; }
  .ld-ctrl-loop { width: 40px; height: 40px; }
}
</style>
