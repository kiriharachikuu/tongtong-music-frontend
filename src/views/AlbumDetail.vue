<template>
  <div class="album-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="card" style="padding:40px;text-align:center;">
      <span class="text-secondary">加载中...</span>
    </div>

    <!-- 专辑信息 -->
    <div v-else-if="album" class="album-header">
      <div class="album-cover-wrap">
        <img
          class="album-cover"
          :src="album.coverUrl || defaultCover"
          :alt="album.name"
          @error="($event.target.style.opacity=0.3)"
        />
      </div>
      <div class="album-info">
        <h1 class="album-name">{{ album.name }}</h1>
        <p class="album-singer">{{ album.singer || '未知歌手' }}</p>
        <p class="album-count">{{ album.song_count }} 首歌曲</p>
        <div class="album-actions">
          <button class="primary-btn" @click="playAll">
            <Play :size="16" fill="currentColor" />
            播放全部
          </button>
          <button class="ghost-btn" @click="shufflePlay">
            <Shuffle :size="16" />
            随机播放
          </button>
        </div>
      </div>
    </div>

    <!-- 歌曲列表 -->
    <div v-if="songs.length" class="song-section">
      <SongList :songs="songs" @play="onPlay" @fav="onFav" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="card text-secondary" style="padding:40px;text-align:center;">
      该专辑暂无歌曲
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Play, Shuffle } from 'lucide-vue-next';
import SongList from '../components/SongList.vue';
import { getAlbum } from '../api/endpoints';
import { usePlayerStore } from '../stores/player';

const route = useRoute();
const router = useRouter();
const p = usePlayerStore();

const album = ref(null);
const songs = ref([]);
const loading = ref(true);

const defaultCover =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e8e8ed"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="14">暂无封面</text></svg>'
  );

async function loadAlbum() {
  loading.value = true;
  try {
    const id = route.params.id;
    const data = await getAlbum(id);
    if (data) {
      album.value = data.album;
      songs.value = data.songs || [];
    }
  } catch (e) {
    console.error('加载专辑失败:', e);
  } finally {
    loading.value = false;
  }
}

function playAll() {
  if (songs.value.length > 0) {
    p.play(songs.value[0], songs.value);
  }
}

function shufflePlay() {
  if (songs.value.length > 0) {
    const shuffled = [...songs.value].sort(() => Math.random() - 0.5);
    p.play(shuffled[0], shuffled);
  }
}

function onPlay(song, list) {
  p.play(song, list || songs.value);
}

function onFav(song) {
  if (song && song.id) p.toggleFavorite(song.id);
}

onMounted(loadAlbum);
</script>

<style scoped>
.album-detail-page {
  max-width: 900px;
  margin: 0 auto;
}

.album-header {
  display: flex;
  gap: 28px;
  padding: 24px;
  background: var(--am-card);
  border-radius: var(--am-radius-lg);
  box-shadow: var(--am-shadow);
  margin-bottom: 24px;
  align-items: center;
}

.album-cover-wrap {
  width: 200px;
  height: 200px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  background: var(--am-bg-2);
}

.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-info {
  flex: 1;
  min-width: 0;
}

.album-name {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--am-text);
  word-break: break-word;
}

.album-singer {
  font-size: 16px;
  color: var(--am-text-secondary);
  margin: 0 0 4px;
}

.album-count {
  font-size: 14px;
  color: var(--am-text-secondary);
  margin: 0 0 20px;
}

.album-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.album-actions .primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.album-actions .ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}

.song-section {
  margin-top: 16px;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .album-header {
    flex-direction: column;
    text-align: center;
    padding: 20px;
    gap: 16px;
  }

  .album-cover-wrap {
    width: 160px;
    height: 160px;
  }

  .album-name {
    font-size: 22px;
  }

  .album-actions {
    justify-content: center;
  }
}
</style>
