<template>
  <div class="lyric-floating" ref="win"
       :style="{ left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' }">
    <div class="lf-handle" @mousedown="startDrag">
      <span class="lf-title">{{ p.current ? p.current.title : '播放中' }}</span>
      <button class="lf-close" @click.stop="$emit('close')"><X :size="14" /></button>
    </div>
    <div class="lf-body">
      <div class="lf-song-meta" v-if="p.current">
        <span class="lf-singer">{{ p.current.singer || '未知歌手' }}</span>
        <template v-if="p.current.album"> · {{ p.current.album }}</template>
      </div>
      <div class="lf-lyric-area">
        <AmllLyricPlayer
          :lines="lyricLines"
          :cover-url="coverUrl"
          :current-time="p.currentTime"
          :playing="p.playing"
          :loading="lyricLoading"
          :parse-error="lyricError"
          :transparent="true"
          @line-click="(sec) => p.seek(sec)"
          @retry="retryLyric" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { X } from 'lucide-vue-next';
import { usePlayerStore } from '../stores/player';
import { getSongLyric } from '../api/endpoints';
import { parseLyric } from '../utils/lyricParser';
import AmllLyricPlayer from './AmllLyricPlayer.vue';

const p = usePlayerStore();
defineEmits(['close']);

const left = ref(Math.max(16, window.innerWidth - 460));
const top = ref(100);
const width = ref(420);
const height = ref(320);
const lyricLines = ref([]);
const lyricLoading = ref(false);
const lyricError = ref('');
const coverUrl = computed(() => (p.current && (p.current.coverUrl || p.current.cover)) || '');

let dragging = false, offX = 0, offY = 0;
function startDrag(e) {
  dragging = true;
  const rect = win.value.getBoundingClientRect();
  offX = e.clientX - rect.left;
  offY = e.clientY - rect.top;
}
function onMove(e) {
  if (!dragging) return;
  const newLeft = Math.max(16, Math.min(window.innerWidth - 200, e.clientX - offX));
  const newTop = Math.max(16, Math.min(window.innerHeight - 100, e.clientY - offY));
  left.value = newLeft;
  top.value = newTop;
}
function onUp() { dragging = false; }

const win = ref(null);

onMounted(() => {
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  if (p.current && p.current.id) loadLyric(p.current.id);
});
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove);
  window.removeEventListener('mouseup', onUp);
});

watch(() => p.current && p.current.id, (id) => { if (id) loadLyric(id); });

async function loadLyric(id) {
  if (!id) { lyricLines.value = []; return; }
  lyricLoading.value = true;
  lyricError.value = '';
  try {
    const text = await getSongLyric(id);
    const raw = typeof text === 'string' ? text : (text && text.lrc) || '';
    lyricLines.value = await parseLyric(raw) || [];
  } catch (e) {
    console.warn('[LyricWindow] 歌词加载失败:', e);
    lyricLines.value = [];
    lyricError.value = e?.message || '歌词加载失败';
  } finally {
    lyricLoading.value = false;
  }
}

function retryLyric() {
  if (p.current && p.current.id) loadLyric(p.current.id);
}
</script>

<style scoped>
.lyric-floating {
  position: fixed;
  right: 28px; bottom: 120px;
  background: var(--am-card);
  color: var(--am-text);
  border-radius: 18px;
  box-shadow: var(--am-shadow);
  border: 1px solid var(--am-border);
  backdrop-filter: blur(30px) saturate(1.8);
  -webkit-backdrop-filter: blur(30px) saturate(1.8);
  overflow: hidden;
  z-index: 9999;
  resize: both;
  min-width: 320px;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.lf-handle {
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: move;
  user-select: none;
  border-bottom: 1px solid var(--am-border);
  flex-shrink: 0;
  background: var(--am-bg-2);
}
.lf-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--am-text);
  letter-spacing: 0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80%;
}
.lf-close {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--am-border);
  color: var(--am-text-secondary);
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
  border: none;
  cursor: pointer;
}
.lf-close:hover { background: var(--am-primary); color: #fff; }

.lf-body {
  flex: 1;
  min-height: 0;
  padding: 6px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lf-song-meta {
  font-size: 11px;
  color: var(--am-text-secondary);
  padding: 0 4px;
  flex-shrink: 0;
}

.lf-lyric-area {
  flex: 1;
  min-height: 0;
  min-width: 100%;
}

/* 浮动窗歌词字体 */
.lf-lyric-area :deep(.amll-lyric-box) {
  min-height: 0;
}
.lf-lyric-area :deep(.amll-lyric-line) {
  font-size: 14px !important;
  padding: 3px 0 !important;
}
.lf-lyric-area :deep(.amll-lyric-line.active) {
  font-size: 16px !important;
  text-shadow: 0 0 10px rgba(139,0,255,0.4) !important;
}
</style>
