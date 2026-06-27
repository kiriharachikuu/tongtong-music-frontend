<template>
  <div class="app-player-bar" v-if="p.current">
    <!-- 移动端顶部进度条 -->
    <div class="mobile-progress-bar mobile-only" ref="mobileProgressRef" @pointerdown="onMobileProgressDown">
      <div class="mobile-progress-fill" :style="{ width: progressPct + '%' }"></div>
    </div>
    <div class="player-track" @click="$emit('toggle-lyric')" style="cursor:pointer;">
      <img class="player-cover" :src="p.current.coverUrl || p.current.cover || defaultCoverSvg" />
      <div class="player-meta">
        <span class="title">{{ p.current.title }}</span>
        <span class="singer">{{ p.current.singer || '未知歌手' }}</span>
      </div>
      <!-- 播放列表展开按钮（原 player-queue 区域，交换至此） -->
      <button class="playlist-toggle desktop-only" @click.stop="showPlaylist = !showPlaylist" :class="{ active: showPlaylist }"
              :title="'播放列表 (' + p.playlist.length + ' 首)'" :aria-label="'播放列表'">
        <ListMusic :size="16" />
      </button>
    </div>

    <div class="player-controls desktop-only">
      <div class="player-buttons">
        <button class="btn-icon btn-loop" @click="p.toggleLoop()" :title="'循环模式：' + loopLabel" aria-label="循环模式">
          <component :is="loopIconComp" :size="15" />
        </button>
        <button class="btn-icon" @click="p.prev()" aria-label="上一曲" title="上一曲 / ←">
          <SkipBack :size="18" />
        </button>
        <button class="btn-icon btn-play" @click="p.togglePlay()" :aria-label="p.playing ? '暂停' : '播放'">
          <Pause v-if="p.playing" :size="20" fill="currentColor" />
          <Play v-else :size="20" fill="currentColor" style="margin-left:1px" />
        </button>
        <button class="btn-icon" @click="p.next()" aria-label="下一曲" title="下一曲 / →">
          <SkipForward :size="18" />
        </button>
        <button class="btn-icon" @click="p.toggleFavorite(p.current.id)" :title="isFav ? '取消收藏' : '收藏 / S'" :aria-label="isFav ? '取消收藏' : '收藏'">
          <Heart :size="16" :fill="isFav ? 'currentColor' : 'none'" />
        </button>
      </div>
      <div class="progress-wrap">
        <span class="progress-time">{{ fmt(p.currentTime) }}</span>
        <div class="progress-bar" ref="progressBarRef" @pointerdown="onProgressDown">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
            <div class="progress-thumb" :style="{ left: progressPct + '%' }"></div>
          </div>
        </div>
        <span class="progress-time">{{ fmt(p.duration) }}</span>
      </div>
    </div>

    <!-- 移动端：只显示播放按钮 -->
    <button class="btn-icon btn-play mobile-only" @click="p.togglePlay()" :aria-label="p.playing ? '暂停' : '播放'">
      <Pause v-if="p.playing" :size="20" fill="currentColor" />
      <Play v-else :size="20" fill="currentColor" style="margin-left:1px" />
    </button>

    <div class="player-queue desktop-only">
      <button class="btn-icon" @click="toggleMute" :aria-label="p.volume === 0 ? '取消静音' : '静音'">
        <VolumeX v-if="p.volume === 0" :size="16" />
        <Volume1 v-else-if="p.volume < 0.5" :size="16" />
        <Volume2 v-else :size="16" />
      </button>
      <input type="range" class="volume-slider" min="0" max="100" :value="Math.round(p.volume * 100)"
             @input="p.setVolume(Number($event.target.value)/100)" />
      <!-- 展开歌词按钮（原 player-track 区域，交换至此） -->
      <button class="btn-icon btn-expand" @click="$emit('toggle-lyric')" aria-label="展开歌词" title="展开歌词 / L">
        <ChevronUp :size="16" />
      </button>
    </div>

    <!-- 播放列表面板 -->
    <Transition name="playlist-panel">
      <div v-if="showPlaylist" class="playlist-panel">
        <div class="playlist-panel-header">
          <span class="playlist-panel-title">播放列表</span>
          <button class="btn-icon" @click="showPlaylist = false" aria-label="关闭">
            <X :size="16" />
          </button>
        </div>
        <div class="playlist-items">
          <div v-if="!p.playlist.length" class="playlist-empty">播放列表为空</div>
          <div
            v-for="(song, idx) in p.playlist"
            :key="song.id"
            class="playlist-item"
            :class="{ playing: song.id === (p.current && p.current.id) }"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover.prevent="onDragOver(idx)"
            @drop.prevent="onDrop(idx)"
            @dragend="onDragEnd"
            @click="playFromPlaylist(idx)"
          >
            <GripVertical :size="14" class="drag-handle" />
            <span class="playlist-item-num">{{ String(idx + 1).padStart(2, '0') }}</span>
            <div class="playlist-item-info">
              <span class="playlist-item-title">{{ song.title }}</span>
              <span class="playlist-item-artist">{{ song.singer || '未知歌手' }}</span>
            </div>
            <span class="playlist-item-dur">{{ fmt(song.duration) }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </div>
  <div v-else style="grid-area:player;padding:18px 20px;color:var(--am-text-secondary);text-align:center;">
    还没有歌曲 · 去「发现」挑一首吧
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  SkipBack, Play, Pause, SkipForward,
  Heart, ChevronUp, X, GripVertical,
  ListMusic, Repeat1, Repeat, Shuffle,
  VolumeX, Volume1, Volume2
} from 'lucide-vue-next';
import { usePlayerStore } from '../stores/player';

const p = usePlayerStore();
defineEmits(['toggle-lyric']);

const progressBarRef = ref(null);
const mobileProgressRef = ref(null);

const defaultCoverSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#eee"/></svg>`
);

const progressPct = computed(() => {
  if (!p.duration) return 0;
  return Math.min(100, Math.round((p.currentTime / p.duration) * 100));
});

const isFav = computed(() => p.current && p.isFavorite(p.current.id));

const loopLabel = computed(() => {
  return { sequential: '顺序', repeatOne: '单曲', list: '列表', shuffle: '随机' }[p.loopMode] || '顺序';
});

const loopIconComp = computed(() => {
  return { sequential: ListMusic, repeatOne: Repeat1, list: Repeat, shuffle: Shuffle }[p.loopMode] || ListMusic;
});

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function toggleMute() {
  if (p.volume > 0) { p._prevVolume = p.volume; p.setVolume(0); }
  else { p.setVolume(p._prevVolume || 0.8); }
}

/* 进度条拖拽 */
function onProgressDown(e) {
  doSeek(e);
  const bar = progressBarRef.value;
  if (!bar) return;
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

function onMobileProgressDown(e) {
  doMobileSeek(e);
  const bar = mobileProgressRef.value;
  if (!bar) return;
  const onMove = (ev) => doMobileSeek(ev);
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
function doMobileSeek(e) {
  const bar = mobileProgressRef.value;
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const sec = ratio * (p.duration || 0);
  p.seek(sec);
}

// 全局事件响应
const ttHandlers = {
  'tt-toggle-play': () => p.togglePlay(),
  'tt-next': () => p.next(),
  'tt-prev': () => p.prev(),
  'tt-volume': (e) => {
    const v = Math.max(0, Math.min(1, p.volume + (e.detail || 0)));
    p.setVolume(v);
  },
  'tt-fav': () => { if (p.current) p.toggleFavorite(p.current.id); },
};

/* 播放列表面板 + 拖拽排序 */
const showPlaylist = ref(false);
const dragFromIdx = ref(-1);
const dragOverIdx = ref(-1);

function onDragStart(idx) {
  dragFromIdx.value = idx;
}
function onDragOver(idx) {
  dragOverIdx.value = idx;
}
function onDrop(toIdx) {
  const from = dragFromIdx.value;
  if (from < 0 || from === toIdx) return;
  p.reorderPlaylist(from, toIdx);
  dragFromIdx.value = -1;
  dragOverIdx.value = -1;
}
function onDragEnd() {
  dragFromIdx.value = -1;
  dragOverIdx.value = -1;
}
function playFromPlaylist(idx) {
  if (p.playlist[idx]) {
    p.play(p.playlist[idx], p.playlist);
  }
}

onMounted(() => {
  for (const [k, fn] of Object.entries(ttHandlers)) window.addEventListener(k, fn);
});
onUnmounted(() => {
  for (const [k, fn] of Object.entries(ttHandlers)) window.removeEventListener(k, fn);
});
</script>

<style scoped>
/* 播放列表展开按钮 */
.playlist-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  background: var(--am-bg-2);
  border: 1px solid var(--am-border);
  color: var(--am-text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.playlist-toggle:hover {
  background: var(--am-primary);
  color: #fff;
  border-color: var(--am-primary);
}
.playlist-toggle.active {
  background: var(--am-primary);
  color: #fff;
  border-color: var(--am-primary);
}
.playlist-toggle .tag {
  font-variant-numeric: tabular-nums;
}

/* 播放列表面板 */
.playlist-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 20px;
  width: 380px;
  max-height: 440px;
  display: flex;
  flex-direction: column;
  background: var(--am-card);
  border: 1px solid var(--am-border);
  border-radius: 16px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.18);
  z-index: 300;
  overflow: hidden;
}
.playlist-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--am-border);
}
.playlist-panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--am-text);
}
.playlist-items {
  overflow-y: auto;
  padding: 4px 0;
}
.playlist-items::-webkit-scrollbar { width: 4px; }
.playlist-items::-webkit-scrollbar-thumb { background: var(--am-border); border-radius: 2px; }

.playlist-empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--am-text-secondary);
  font-size: 14px;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s ease;
  user-select: none;
}
.playlist-item:hover { background: var(--am-bg-2); }
.playlist-item.playing .playlist-item-title { color: var(--am-primary); font-weight: 700; }
.drag-handle {
  color: var(--am-text-secondary);
  opacity: 0.4;
  flex-shrink: 0;
  cursor: grab;
}
.playlist-item:hover .drag-handle { opacity: 0.8; }
.playlist-item-num {
  font-size: 12px;
  color: var(--am-text-secondary);
  width: 24px;
  text-align: right;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.playlist-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.playlist-item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--am-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.playlist-item-artist {
  font-size: 12px;
  color: var(--am-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.playlist-item-dur {
  font-size: 12px;
  color: var(--am-text-secondary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

/* 面板过渡动画 */
.playlist-panel-enter-active,
.playlist-panel-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.playlist-panel-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.playlist-panel-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
