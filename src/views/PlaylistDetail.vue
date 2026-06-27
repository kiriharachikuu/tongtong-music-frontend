<template>
  <div>
    <div class="profile-header" style="margin-bottom:18px;">
      <img class="avatar" :src="playlist && playlist.coverUrl" @error="($event.target.style.opacity=0.15)" />
      <div>
        <h2 style="margin:0;display:inline-flex;align-items:center;gap:8px;">
          {{ playlist ? playlist.name : '加载中...' }}
          <button v-if="canEdit" type="button" class="rename-btn" @click="onRename" title="重命名" aria-label="重命名歌单">
            <Pencil :size="16" />
          </button>
        </h2>
        <p style="margin:4px 0 0;color:var(--am-text-secondary);">
          {{ playlist && playlist.is_system ? '系统歌单' : '私人歌单' }} · {{ (playlist && playlist.songs && playlist.songs.length) || 0 }} 首
        </p>
      </div>
      <div style="margin-left:auto;display:flex;gap:10px;">
        <button class="primary-btn" @click="playAll"><Play :size="14" fill="currentColor" style="margin-right:4px" /> 播放全部</button>
      </div>
    </div>
    <div class="song-table">
      <div v-if="!playlist || !playlist.songs || !playlist.songs.length" style="padding:40px;color:var(--am-text-secondary);text-align:center;">暂无歌曲</div>
      <div
        v-for="(s, idx) in ((playlist && playlist.songs) || [])"
        :key="s.id"
        class="song-row opt-actions"
        :class="{ 'draggable-row': canEdit, 'dragging': draggingIndex === idx, 'drag-over': dragOverIndex === idx }"
        :draggable="canEdit"
        @dblclick="onPlay(s)"
        @dragstart="onDragStart($event, idx)"
        @dragover="onDragOver($event, idx)"
        @dragleave="onDragLeave(idx)"
        @drop="onDrop($event, idx)"
        @dragend="onDragEnd"
      >
        <span class="num">{{ String(idx + 1).padStart(2, '0') }}</span>
        <div>
          <div class="title">{{ s.title }}</div>
          <div class="meta">{{ s.singer || '' }} {{ s.album ? '· ' + s.album : '' }}</div>
        </div>
        <span class="meta hide-mobile">{{ fmt(s.duration) }}</span>
        <span class="meta hide-mobile">{{ (s.play_count || 0) }} 次</span>
        <span>
          <button class="icon-btn" @click.stop="onPlay(s)" title="播放" aria-label="播放">
            <Play :size="14" fill="currentColor" />
          </button>
          <button class="icon-btn" @click.stop="onFav(s)" :title="isFav(s.id) ? '已收藏' : '收藏'" :aria-label="isFav(s.id) ? '已收藏' : '收藏'">
            <Heart :size="14" :fill="isFav(s.id) ? 'currentColor' : 'none'" />
          </button>
        </span>
        <span class="cell-actions" @dblclick.stop>
          <el-dropdown trigger="click" placement="bottom-end" @command="(cmd) => onAction(cmd, s)">
            <button class="icon-btn" type="button" aria-label="更多操作" title="更多操作">
              <MoreHorizontal :size="16" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="next">下一首播放</el-dropdown-item>
                <el-dropdown-item command="download">下载</el-dropdown-item>
                <el-dropdown-item command="fav">{{ isFav(s.id) ? '取消收藏' : '收藏' }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </span>
      </div>
      <div v-if="reordering" class="reorder-overlay">
        <div class="reorder-spinner"></div>
        <span>排序中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Play, Heart, Pencil, MoreHorizontal } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getPlaylist, renamePlaylist, reorderPlaylistSongs, getDownloadUrl } from '../api/endpoints';
import { usePlayerStore } from '../stores/player';
import { useUserStore } from '../stores/user';
import { useDownloadStore } from '../stores/download';
import { useRoute } from 'vue-router';

const route = useRoute();
const p = usePlayerStore();
const userStore = useUserStore();
const downloadStore = useDownloadStore();
const playlist = ref(null);

// 是否允许编辑(重命名 / 拖拽排序):当前用户为 owner 且非系统歌单
const canEdit = computed(() => {
  return !!playlist.value
    && !playlist.value.is_system
    && !!userStore.user
    && playlist.value.owner_id === userStore.user.id;
});

// 拖拽排序状态
const draggingIndex = ref(null);
const dragOverIndex = ref(null);
const reordering = ref(false);

onMounted(async () => {
  try { playlist.value = await getPlaylist(route.params.id); } catch (e) { alert(e.message); }
});

function playAll() {
  if (playlist.value && playlist.value.songs && playlist.value.songs.length) {
    p.play(playlist.value.songs[0], playlist.value.songs);
  }
}
function onPlay(s) { p.play(s, playlist.value && playlist.value.songs); }
function onFav(song) {
  if (song && song.id) p.toggleFavorite(song.id);
}

// ====== 工具方法(与 SongList 行为保持一致) ======
function fmt(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function isFav(id) { return p.isFavorite(id); }

// ====== 重命名歌单 ======
async function onRename() {
  if (!canEdit.value || !playlist.value) return;
  try {
    const { value } = await ElMessageBox.prompt('请输入新的歌单名称', '重命名歌单', {
      inputValue: playlist.value.name || '',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '歌单名称',
      inputValidator: (v) => (v && v.trim() ? true : '名称不能为空'),
    });
    const newName = value.trim();
    if (newName === (playlist.value.name || '')) return;
    await renamePlaylist(playlist.value.id, newName);
    playlist.value = { ...playlist.value, name: newName };
    ElMessage.success('已重命名');
  } catch (e) {
    // 用户取消 / 关闭弹窗不打错误提示
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error('重命名失败:' + (e && e.message ? e.message : '未知错误'));
  }
}

// ====== 拖拽排序(原生 HTML5 drag,不引入新库) ======
function onDragStart(e, idx) {
  if (!canEdit.value) { e.preventDefault(); return; }
  draggingIndex.value = idx;
  e.dataTransfer.effectAllowed = 'move';
  // Firefox 需要 setData 才能触发拖拽
  try { e.dataTransfer.setData('text/plain', String(idx)); } catch (_) {}
}
function onDragOver(e, idx) {
  if (!canEdit.value || draggingIndex.value === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  dragOverIndex.value = draggingIndex.value === idx ? null : idx;
}
function onDragLeave(idx) {
  if (dragOverIndex.value === idx) dragOverIndex.value = null;
}
function onDragEnd() {
  draggingIndex.value = null;
  dragOverIndex.value = null;
}
async function onDrop(e, idx) {
  if (!canEdit.value) return;
  e.preventDefault();
  const fromIdx = draggingIndex.value;
  const toIdx = idx;
  draggingIndex.value = null;
  dragOverIndex.value = null;
  if (fromIdx === null || fromIdx === toIdx) return;

  const current = (playlist.value.songs || []).slice();
  const snapshot = current.slice(); // 失败回滚快照
  const [moved] = current.splice(fromIdx, 1);
  current.splice(toIdx, 0, moved);
  // 本地先重排,后端失败再回滚
  playlist.value = { ...playlist.value, songs: current };

  reordering.value = true;
  try {
    // 后端 position 从 1 开始
    await reorderPlaylistSongs(playlist.value.id, fromIdx + 1, toIdx + 1);
    ElMessage.success('已调整顺序');
  } catch (err) {
    playlist.value = { ...playlist.value, songs: snapshot };
    ElMessage.error('排序失败:' + (err && err.message ? err.message : '未知错误'));
  } finally {
    reordering.value = false;
  }
}

// ====== 行内更多操作(保留原 SongList 下拉菜单可用项) ======
function onAction(cmd, song) {
  if (cmd === 'next') {
    p.playNext(song);
    ElMessage.success('已加入下一首播放');
  } else if (cmd === 'download') {
    downloadSong(song);
  } else if (cmd === 'fav') {
    p.toggleFavorite(song.id);
  }
}
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
</script>

<style scoped>
/* 重命名按钮 */
.rename-btn {
  width: 30px; height: 30px;
  border-radius: 50%;
  color: var(--am-text-secondary);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition);
}
.rename-btn:hover { background: var(--am-border); color: var(--am-primary); }

/* 拖拽视觉提示 */
.song-row.draggable-row { cursor: grab; }
.song-row.draggable-row.dragging { opacity: 0.4; cursor: grabbing; }
.song-row.drag-over {
  outline: 2px dashed var(--am-primary);
  outline-offset: -2px;
  background: rgba(139, 0, 255, 0.06) !important;
}

/* 行内更多操作单元格 */
.cell-actions { display: inline-flex; align-items: center; justify-content: center; }

/* 排序 loading 遮罩 */
.song-table { position: relative; }
.reorder-overlay {
  position: absolute; inset: 0;
  background: rgba(255, 255, 255, 0.55);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px;
  color: var(--am-text-secondary);
  font-size: 14px;
  z-index: 10;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}
[data-theme='dark'] .reorder-overlay { background: rgba(0, 0, 0, 0.45); }
@media (prefers-color-scheme: dark) {
  .reorder-overlay { background: rgba(0, 0, 0, 0.45); }
}
.reorder-spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--am-border);
  border-top-color: var(--am-primary);
  border-radius: 50%;
  animation: am-spin 0.8s linear infinite;
}
@keyframes am-spin { to { transform: rotate(360deg); } }
</style>
