<template>
  <div class="song-table">
    <!-- 多选模式顶部工具栏 -->
    <div v-if="multiSelect" class="multi-toolbar">
      <span class="multi-count">已选 {{ selectedCount }} 首</span>
      <div class="multi-buttons">
        <button type="button" class="multi-btn" :disabled="!selectedCount" @click="onBatchAddToPlaylist">
          <ListPlus :size="16" /><span>加入歌单</span>
        </button>
        <button type="button" class="multi-btn" :disabled="!selectedCount" @click="onBatchDownload">
          <Download :size="16" /><span>下载</span>
        </button>
        <button type="button" class="multi-btn" :disabled="!selectedCount" @click="onBatchPlayNext">
          <Play :size="16" /><span>下一首播放</span>
        </button>
        <button type="button" class="multi-btn cancel" @click="onExitMultiSelect">
          <X :size="16" /><span>取消</span>
        </button>
      </div>
    </div>

    <div v-if="!songs.length" style="padding:40px;color:var(--am-text-secondary);text-align:center;">暂无歌曲</div>
    <div v-for="(s, idx) in songs" :key="s.id" class="song-row-swipe" :class="{ open: swipedId === s.id }">
      <div class="song-row"
           :class="{ 'opt-check': multiSelect, 'opt-actions': showActions, 'swiping': swipingId === s.id }"
           @dblclick="$emit('play', s, songs)"
           @touchstart="onTouchStart($event, s)"
           @touchmove="onTouchMove($event, s)"
           @touchend="onTouchEnd($event, s)">
        <button v-if="multiSelect" type="button" class="cell-check" :class="{ checked: isSelected(s.id) }" @click.stop="toggleSelect(s)" @dblclick.stop :aria-label="isSelected(s.id) ? '取消选择' : '选择'">
          <CheckSquare v-if="isSelected(s.id)" :size="18" />
          <Square v-else :size="18" />
        </button>
        <span class="num">{{ String(idx+1).padStart(2,'0') }}</span>
        <div>
          <div class="title">{{ s.title }}</div>
          <div class="meta">{{ s.singer || '' }} {{ s.album ? '· ' + s.album : '' }}</div>
        </div>
        <span class="meta hide-mobile">{{ fmt(s.duration) }}</span>
        <span class="meta hide-mobile">{{ (s.play_count || 0) }} 次</span>
        <span>
          <button class="icon-btn" @click.stop="$emit('play', s, songs)" title="播放" aria-label="播放">
            <Play :size="14" fill="currentColor" />
          </button>
          <button class="icon-btn" @click.stop="$emit('fav', s)" :title="isFav(s.id) ? '已收藏' : '收藏'" :aria-label="isFav(s.id) ? '已收藏' : '收藏'">
            <Heart :size="14" :fill="isFav(s.id) ? 'currentColor' : 'none'" />
          </button>
        </span>
        <span v-if="showActions" class="cell-actions" @dblclick.stop>
          <el-dropdown trigger="click" placement="bottom-end" @command="(cmd) => onAction(cmd, s)">
            <button class="icon-btn" type="button" aria-label="更多操作" title="更多操作">
              <MoreHorizontal :size="16" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="playlist">加入歌单</el-dropdown-item>
                <el-dropdown-item command="next">下一首播放</el-dropdown-item>
                <el-dropdown-item command="download">下载</el-dropdown-item>
                <el-dropdown-item command="fav">{{ isFav(s.id) ? '取消收藏' : '收藏' }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </span>
      </div>
      <button v-if="swipeToDelete" type="button" class="swipe-delete-btn" @click.stop="onDelete(s)" aria-label="删除">
        <Trash2 :size="18" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Play, Heart, Square, CheckSquare, MoreHorizontal, Trash2, ListPlus, Download, X } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { usePlayerStore } from '../stores/player';
import { useDownloadStore } from '../stores/download';
import { getDownloadUrl } from '../api/endpoints';

const emit = defineEmits(['play', 'fav', 'add-to-playlist', 'batch-add-to-playlist', 'delete', 'exit-multi-select']);
const p = usePlayerStore();
const downloadStore = useDownloadStore();
const props = defineProps({
  songs: { type: Array, default: () => [] },
  multiSelect: { type: Boolean, default: false },
  showActions: { type: Boolean, default: true },
  swipeToDelete: { type: Boolean, default: false }
});

// ====== 原有工具方法 ======
function fmt(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function isFav(id) { return p.isFavorite(id); }

// ====== 多选 ======
const selectedIds = ref([]);
const selectedCount = computed(() => selectedIds.value.length);
const selectedSongs = computed(() => props.songs.filter(s => selectedIds.value.includes(s.id)));
function isSelected(id) { return selectedIds.value.includes(id); }
function toggleSelect(song) {
  const i = selectedIds.value.indexOf(song.id);
  if (i >= 0) selectedIds.value.splice(i, 1);
  else selectedIds.value.push(song.id);
}
function onBatchAddToPlaylist() {
  if (!selectedIds.value.length) return;
  emit('batch-add-to-playlist', [...selectedIds.value]);
}
function onBatchDownload() {
  const list = selectedSongs.value;
  if (!list.length) return;
  list.forEach(downloadSong);
  ElMessage.success(`已开始下载 ${list.length} 首歌曲`);
}
function onBatchPlayNext() {
  const list = selectedSongs.value;
  if (!list.length) return;
  list.forEach(s => p.playNext(s));
  ElMessage.success(`已加入 ${list.length} 首到下一首播放`);
}
function onExitMultiSelect() {
  selectedIds.value = [];
  emit('exit-multi-select');
}

// ====== 行操作菜单 ======
function onAction(cmd, song) {
  if (cmd === 'playlist') {
    emit('add-to-playlist', song);
  } else if (cmd === 'next') {
    p.playNext(song);
    ElMessage.success('已加入下一首播放');
  } else if (cmd === 'download') {
    downloadSong(song);
  } else if (cmd === 'fav') {
    p.toggleFavorite(song.id);
  }
}

// ====== 下载(隐藏 <a> 触发 + 记录) ======
function downloadSong(song) {
  const singer = song.singer || '未知歌手';
  const title = song.title || '未知歌曲';
  const fileName = `${singer}-${title}.mp3`;
  try {
    const a = document.createElement('a');
    a.href = getDownloadUrl(song.id);
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    downloadStore.record(song);
    ElMessage.success(`已开始下载:${fileName}`);
  } catch (e) {
    ElMessage.error('下载失败:' + (e && e.message ? e.message : '未知错误'));
  }
}

// ====== 左滑删除 ======
const swipedId = ref(null);
const swipingId = ref(null);
const touchStartX = ref(0);
const touchStartY = ref(0);
const touchLastX = ref(0);
let touchStartOpen = false;

function onTouchStart(e, song) {
  if (!props.swipeToDelete) return;
  // 触摸其他行时收起已展开的行
  if (swipedId.value !== null && swipedId.value !== song.id) swipedId.value = null;
  const t = e.touches[0];
  touchStartX.value = t.clientX;
  touchStartY.value = t.clientY;
  touchLastX.value = t.clientX;
  touchStartOpen = swipedId.value === song.id;
  swipingId.value = song.id;
}
function onTouchMove(e, song) {
  if (!props.swipeToDelete) return;
  if (swipingId.value !== song.id) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStartX.value;
  const dy = t.clientY - touchStartY.value;
  if (Math.abs(dx) <= Math.abs(dy)) return; // 纵向滚动交给浏览器
  e.preventDefault();
  touchLastX.value = t.clientX;
  const base = touchStartOpen ? -80 : 0;
  let offset = base + dx;
  if (offset > 0) offset = 0;
  if (offset < -80) offset = -80;
  e.currentTarget.style.transform = `translateX(${offset}px)`;
}
function onTouchEnd(e, song) {
  if (!props.swipeToDelete) return;
  if (swipingId.value !== song.id) return;
  const el = e.currentTarget;
  el.style.transform = '';
  const dx = touchLastX.value - touchStartX.value;
  swipingId.value = null;
  if (touchStartOpen) {
    // 已展开：向右滑 > 20px 收起，否则保持展开
    swipedId.value = dx > 20 ? null : song.id;
  } else {
    // 已收起：向左滑超过 60px 展开
    swipedId.value = dx < -60 ? song.id : null;
  }
}
function onDelete(song) {
  swipedId.value = null;
  emit('delete', song);
}

// 点击其他区域收起左滑按钮
function onDocClick() {
  if (swipedId.value !== null) swipedId.value = null;
}
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>

<style scoped>
/* ===== 多选模式顶部工具栏 ===== */
.multi-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: var(--am-bg-2);
  border-bottom: 1px solid var(--am-border);
  flex-wrap: wrap;
}
.multi-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--am-text);
  white-space: nowrap;
}
.multi-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.multi-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--am-border);
  border-radius: 999px;
  background: var(--am-card);
  color: var(--am-text);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition), border-color 0.2s var(--am-transition);
}
.multi-btn:hover:not(:disabled) {
  background: var(--am-bg-2);
  color: var(--am-primary);
  border-color: var(--am-primary);
}
.multi-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.multi-btn.cancel {
  color: var(--am-text-secondary);
}

/* ===== 行包裹(左滑删除容器) ===== */
.song-row-swipe {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--am-border);
}
.song-row-swipe .song-row {
  position: relative;
  z-index: 2;
  background: var(--am-card);
  border-bottom: none;
  transition: transform 0.25s var(--am-transition), background 0.2s var(--am-transition);
}
/* 保持原有 hover 高亮(覆盖上面的不透明背景) */
.song-row-swipe .song-row:hover {
  background: var(--am-bg-2);
}
.song-row-swipe .song-row.swiping {
  transition: background 0.2s var(--am-transition);
}
.song-row-swipe.open .song-row {
  transform: translateX(-80px);
}

/* ===== 左滑删除按钮 ===== */
.swipe-delete-btn {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 80px;
  min-width: 44px;
  min-height: 44px;
  z-index: 1;
  background: #ff3b30;
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* ===== 多选 checkbox 单元格 ===== */
.cell-check {
  width: 44px;
  height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--am-text-secondary);
}
.cell-check.checked {
  color: var(--am-primary);
}
.cell-check:hover {
  color: var(--am-primary);
}

/* ===== 操作菜单单元格 ===== */
.cell-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* ===== grid 列扩展(多选 / 操作菜单) ===== */
.song-row.opt-check {
  grid-template-columns: 44px 48px 1fr 160px 120px 100px;
}
.song-row.opt-actions {
  grid-template-columns: 48px 1fr 160px 120px 100px 80px;
}
.song-row.opt-check.opt-actions {
  grid-template-columns: 44px 48px 1fr 160px 120px 100px 80px;
}
@media (max-width: 767px) {
  .song-row.opt-check {
    grid-template-columns: 44px 48px 1fr 80px;
  }
  .song-row.opt-actions {
    grid-template-columns: 48px 1fr 80px 44px;
  }
  .song-row.opt-check.opt-actions {
    grid-template-columns: 44px 48px 1fr 80px 44px;
  }
  /* 移动端触控目标 ≥ 44×44px */
  .cell-check,
  .swipe-delete-btn,
  .cell-actions .icon-btn {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
