<template>
  <div class="discover-page" ref="discoverRef">
    <!-- 移动端下拉刷新指示器（仅 ≤767px 显示） -->
    <div
      class="ptr-indicator"
      :class="{ 'ptr-anim': pullState === 'refreshing' || pullState === 'idle' }"
      :style="{ height: pullDistance + 'px' }"
      aria-hidden="true"
    >
      <Loader2
        class="ptr-icon"
        :class="{ spinning: pullState === 'refreshing' }"
        :size="22"
      />
      <span class="ptr-text">{{ ptrText }}</span>
    </div>

    <!-- PC 端首屏：左侧大横幅 + 右侧两列小卡片 -->
    <section class="hero-section desktop-hero">
      <div class="hero-main">
        <div class="banner-slider" v-if="banners && banners.length">
          <div class="banner-slides">
            <div v-for="(b, i) in banners" :key="b.id" class="banner-slide" :class="{ active: i === bannerIdx }">
              <img :src="b.imageUrl" :alt="b.title" @click="onBannerClick(b)" loading="lazy" />
              <div class="banner-caption">
                <h3 class="banner-title">{{ b.title }}</h3>
                <p v-if="b.subtitle" class="banner-subtitle">{{ b.subtitle }}</p>
              </div>
            </div>
          </div>
          <div class="banner-dots">
            <span v-for="(b, i) in banners" :key="b.id" class="banner-dot" :class="{ active: i === bannerIdx }" @click.stop="bannerIdx=i"></span>
          </div>
        </div>
      </div>

      <div class="hero-side">
        <div class="side-card featured-card" @click="playFirstDaily">
          <img class="side-img" :src="dailyCover" alt="每日推荐" loading="lazy" />
          <div class="side-overlay">
            <span class="side-tag">每日推荐</span>
            <h3 class="side-title">今日歌单</h3>
            <p class="side-desc">{{ daily.length }} 首精选</p>
          </div>
        </div>
        <div class="side-card new-card" @click="playFirstNew">
          <img class="side-img" :src="newCover" alt="精选新歌" loading="lazy" />
          <div class="side-overlay">
            <span class="side-tag">新歌速递</span>
            <h3 class="side-title">精选新歌</h3>
            <p class="side-desc">{{ newSongs.length }} 首更新</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 移动端横幅（单列全宽） -->
    <section class="mobile-hero mobile-only">
      <div class="banner-slider" v-if="banners && banners.length">
        <div class="banner-slides">
          <div v-for="(b, i) in banners" :key="b.id" class="banner-slide" :class="{ active: i === bannerIdx }">
            <img :src="b.imageUrl" :alt="b.title" @click="onBannerClick(b)" loading="lazy" />
            <div class="banner-caption">
              <h3 class="banner-title">{{ b.title }}</h3>
            </div>
          </div>
        </div>
        <div class="banner-dots">
          <span v-for="(b, i) in banners" :key="b.id" class="banner-dot" :class="{ active: i === bannerIdx }" @click.stop="bannerIdx=i"></span>
        </div>
      </div>
    </section>

    <!-- 每日推荐 -->
    <section class="section-block">
      <div class="section-header">
        <h2 class="title-2">每日推荐</h2>
        <button class="section-more" @click="playFirstDaily">全部播放</button>
      </div>
      <SongList :songs="daily" @play="onPlay" @fav="onFav" />
    </section>

    <!-- 精选歌单 -->
    <section class="section-block">
      <div class="section-header">
        <h2 class="title-2">精选歌单</h2>
        <button class="section-more" @click="viewAllPlaylists">查看全部</button>
      </div>
      <div v-if="playlistsLoading" class="playlist-grid">
        <div v-for="i in 6" :key="'pl-sk-' + i" class="playlist-card">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="image" style="width: 100%; aspect-ratio: 1 / 1; border-radius: 12px;" />
              <el-skeleton-item variant="text" style="margin-top: 10px; width: 80%;" />
              <el-skeleton-item variant="text" style="margin-top: 6px; width: 40%;" />
            </template>
          </el-skeleton>
        </div>
      </div>
      <div v-else class="playlist-grid">
        <div
          v-for="pl in playlists"
          :key="pl.id"
          class="playlist-card"
          @click="openPlaylist(pl.id)"
        >
          <div class="pl-cover-wrap">
            <img
              v-if="plCover(pl)"
              class="pl-cover"
              :src="plCover(pl)"
              :alt="pl.name"
              loading="lazy"
              @error="handlePlaylistCoverError"
            />
            <div v-else class="pl-cover-placeholder">
              <Disc3 :size="40" />
            </div>
          </div>
          <div class="pl-name">{{ pl.name }}</div>
          <div class="pl-count">{{ plCount(pl) }} 首</div>
        </div>
      </div>
    </section>

    <!-- 新歌 -->
    <section class="section-block">
      <div class="section-header">
        <h2 class="title-2">精选新歌</h2>
        <button class="section-more" @click="playFirstNew">全部播放</button>
      </div>
      <SongList :songs="newSongs" @play="onPlay" @fav="onFav" />
    </section>

    <!-- 歌手专辑 -->
    <section class="section-block">
      <h2 class="title-2">歌手专辑</h2>
      <div class="album-grid">
        <div v-for="(group, key) in artistGroups" :key="key" class="album-card" @click="filterByArtist(key)">
          <div class="album-cover-wrap">
            <img class="album-cover" :src="group[0] && group[0].coverUrl" @error="handleCoverError" loading="lazy" />
          </div>
          <div class="album-title">{{ key }}</div>
          <div class="album-desc">{{ group.length }} 首</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Disc3, Loader2 } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import SongList from '../components/SongList.vue';
import { listBanners, getDaily, listSongs, listSystemPlaylists } from '../api/endpoints';
import { usePlayerStore } from '../stores/player';

const banners = ref([]);
const daily = ref([]);
const newSongs = ref([]);
const playlists = ref([]);
const playlistsLoading = ref(false);
const bannerIdx = ref(0);
let bannerTimer = null;
const p = usePlayerStore();

/* ============ 移动端下拉刷新 ============ */
const discoverRef = ref(null);
const pullState = ref('idle'); // 'idle' | 'pulling' | 'ready' | 'refreshing'
const pullDistance = ref(0);
let pullStartY = 0;
let pullActive = false;
const PTR_THRESHOLD = 60;
const PTR_MAX = 80;

const ptrText = computed(() => {
  switch (pullState.value) {
    case 'refreshing': return '刷新中...';
    case 'ready': return '释放刷新';
    case 'pulling': return '下拉刷新';
    default: return '';
  }
});

function getScrollTop() {
  const main = document.querySelector('.app-main');
  if (main) return main.scrollTop || 0;
  return window.scrollY || 0;
}

function onTouchStart(e) {
  if (pullState.value === 'refreshing') return;
  if (getScrollTop() > 0) { pullActive = false; return; }
  if (!e.touches || e.touches.length !== 1) return;
  pullStartY = e.touches[0].clientY;
  pullActive = true;
  pullState.value = 'pulling';
}

function onTouchMove(e) {
  if (!pullActive || pullState.value === 'refreshing') return;
  const deltaY = e.touches[0].clientY - pullStartY;
  if (deltaY <= 0) {
    pullDistance.value = 0;
    pullState.value = 'idle';
    pullActive = false;
    return;
  }
  // 阻尼
  const dist = Math.min(deltaY * 0.5, PTR_MAX);
  pullDistance.value = dist;
  pullState.value = dist >= PTR_THRESHOLD ? 'ready' : 'pulling';
  if (getScrollTop() === 0) e.preventDefault();
}

function onTouchEnd() {
  if (!pullActive) return;
  pullActive = false;
  if (pullState.value === 'ready') {
    pullState.value = 'refreshing';
    pullDistance.value = PTR_THRESHOLD;
    refreshAll().finally(() => {
      pullState.value = 'idle';
      pullDistance.value = 0;
    });
  } else {
    pullState.value = 'idle';
    pullDistance.value = 0;
  }
}

async function refreshAll() {
  try {
    const [b, d, n, pl] = await Promise.all([
      listBanners().catch(() => []),
      getDaily().catch(() => []),
      listSongs({ limit: 30 }).then(r => (r && r.list) || []).catch(() => []),
      listSystemPlaylists().catch(() => []),
    ]);
    banners.value = b || [];
    daily.value = d || [];
    newSongs.value = n || [];
    playlists.value = (pl || []).slice(0, 6);
    ElMessage.success('已刷新');
  } catch (e) {
    ElMessage.error('刷新失败');
  }
}

const defaultCover = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e8e8ed"/></svg>`
);

const dailyCover = computed(() => {
  const s = daily.value.find(s => s.coverUrl || s.cover);
  return (s && (s.coverUrl || s.cover)) || defaultCover;
});
const newCover = computed(() => {
  const s = newSongs.value.find(s => s.coverUrl || s.cover);
  return (s && (s.coverUrl || s.cover)) || defaultCover;
});

async function loadPlaylists() {
  playlistsLoading.value = true;
  try {
    const r = await listSystemPlaylists();
    playlists.value = (r || []).slice(0, 6);
  } catch {
    playlists.value = [];
  } finally {
    playlistsLoading.value = false;
  }
}

onMounted(async () => {
  try { banners.value = (await listBanners()) || []; } catch {}
  try { daily.value = (await getDaily()) || []; } catch {}
  try { const r = await listSongs({ limit: 30 }); newSongs.value = (r && r.list) || []; } catch {}
  loadPlaylists();
  bannerTimer = setInterval(() => {
    if (!banners.value.length) return;
    bannerIdx.value = (bannerIdx.value + 1) % banners.value.length;
  }, 5000);
  // 移动端下拉刷新：touchmove 需非 passive 才能 preventDefault
  if (discoverRef.value) {
    discoverRef.value.addEventListener('touchstart', onTouchStart, { passive: true });
    discoverRef.value.addEventListener('touchmove', onTouchMove, { passive: false });
    discoverRef.value.addEventListener('touchend', onTouchEnd, { passive: true });
    discoverRef.value.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }
});
onBeforeUnmount(() => {
  if (bannerTimer) clearInterval(bannerTimer);
  if (discoverRef.value) {
    discoverRef.value.removeEventListener('touchstart', onTouchStart);
    discoverRef.value.removeEventListener('touchmove', onTouchMove);
    discoverRef.value.removeEventListener('touchend', onTouchEnd);
    discoverRef.value.removeEventListener('touchcancel', onTouchEnd);
  }
});

const artistGroups = computed(() => {
  const g = {};
  [...daily.value, ...newSongs.value].forEach(s => {
    const key = s.singer || '未知歌手';
    (g[key] = g[key] || []).push(s);
  });
  return g;
});

function filterByArtist(artist) {
  location.hash = '#/search?k=' + encodeURIComponent(artist);
}

function onPlay(song, list) {
  p.play(song, list || newSongs.value.concat(daily.value));
}

function onFav(song) {
  if (song && song.id) p.toggleFavorite(song.id);
}

function onBannerClick(b) {
  if (!b) return;
  // 兼容 snake_case / camelCase 两种字段命名
  const songId = b.song_id != null ? b.song_id : b.songId;
  const adUrl = b.ad_url || b.adUrl;
  const link = b.link;
  if (songId) {
    // 最高优先级：跳转播放该歌曲
    p.play({ id: songId }, [{ id: songId }]);
  } else if (adUrl) {
    // 次优先级：新窗口打开外链
    window.open(adUrl, '_blank');
  } else if (link) {
    // 最低优先级：跳转歌单（保持现有逻辑）
    location.hash = '#/playlist/' + link;
  } else {
    ElMessage.info('该横幅未配置跳转');
  }
}

function playFirstDaily() {
  if (daily.value.length) onPlay(daily.value[0], daily.value);
}
function playFirstNew() {
  if (newSongs.value.length) onPlay(newSongs.value[0], newSongs.value);
}

function handleCoverError(e) {
  e.target.src = defaultCover;
}

/* ============ 精选歌单 ============ */
function plCover(pl) {
  return pl.cover_url || pl.coverUrl || '';
}
function plCount(pl) {
  if (pl.song_count != null) return pl.song_count;
  if (pl.songCount != null) return pl.songCount;
  return 0;
}
function openPlaylist(id) {
  if (id == null) return;
  location.hash = '#/playlist/' + id;
}
function viewAllPlaylists() {
  location.hash = '#/library?tab=playlists';
}
function handlePlaylistCoverError(e) {
  // 占位由 v-if 控制，加载失败时隐藏图片回落到 Disc3 占位
  e.target.style.display = 'none';
}
</script>

<style scoped>
.discover-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* PC 首屏：左大右小两列 */
.desktop-hero {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
  align-items: stretch;
}
.hero-main, .hero-side {
  min-width: 0;
  min-height: 0;
}
.hero-side {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 20px;
  height: 100%;
}

/* 横幅：单一图片自适应 - contain 保证完整显示 */
.banner-slider {
  position: relative;
  border-radius: var(--am-radius-lg);
  overflow: hidden;
  box-shadow: var(--am-shadow);
  background: var(--am-bg-2);
  width: 100%;
  aspect-ratio: 16 / 9;
}
.banner-slides {
  position: relative;
  width: 100%;
  height: 100%;
}
.banner-slide {
  display: none;
  position: absolute;
  inset: 0;
  cursor: pointer;
}
.banner-slide.active {
  display: block;
  animation: fade 0.6s var(--am-transition);
}
.banner-slide img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  min-height: unset;
  max-height: unset;
}
@keyframes fade { from { opacity: 0.4; } to { opacity: 1; } }

.banner-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 36px 28px 44px;
  background: linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%);
  color: #fff;
}
.banner-title {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.3px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.banner-subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  opacity: 0.9;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
}

.banner-dots {
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 6px;
  z-index: 5;
}
.banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.25s var(--am-transition);
}
.banner-dot.active {
  background: #fff;
  width: 22px;
  border-radius: 6px;
}

/* 侧边卡片 - 高度与 banner 一致 */
.side-card {
  position: relative;
  border-radius: var(--am-radius);
  overflow: hidden;
  box-shadow: var(--am-shadow);
  cursor: pointer;
  background: var(--am-bg-2);
  min-height: 0;
  height: 100%;
  transition: transform 0.25s var(--am-transition);
}
.side-card:hover { transform: translateY(-3px); }
.side-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.side-overlay {
  position: absolute;
  inset: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: rgba(139, 0, 255, 0.75);
  color: #fff;
}
.side-tag {
  align-self: flex-start;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--am-primary);
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
.side-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 1px 6px rgba(0,0,0,0.6);
}
.side-desc {
  margin: 4px 0 0;
  font-size: 13px;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
  opacity: 0.85;
}

/* 分区块 */
.section-block { margin-bottom: 28px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-header .title-2 { margin: 0; }
.section-more {
  font-size: 13px;
  font-weight: 600;
  color: var(--am-primary);
  padding: 6px 12px;
  border-radius: 10px;
  background: transparent;
  transition: background 0.2s var(--am-transition);
}
.section-more:hover { background: rgba(139, 0, 255, 0.08); }

/* 专辑网格 */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 18px;
}
.album-card {
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  padding: 12px;
  cursor: pointer;
  transition: transform 0.25s var(--am-transition);
}
.album-card:hover { transform: translateY(-4px); }
.album-cover-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--am-bg-2);
  box-shadow: var(--am-shadow);
}
.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.album-title {
  font-weight: 600;
  margin-top: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.album-desc {
  font-size: 13px;
  color: var(--am-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 4px;
}

/* 响应式：平板 */
@media (max-width: 1024px) {
  .desktop-hero {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .hero-side {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }
  .side-card {
    aspect-ratio: 16 / 9;
    height: auto;
  }
}

/* 响应式：手机 - 隐藏 PC 首屏，仅显示移动端横幅 */
@media (max-width: 767px) {
  .desktop-hero { display: none; }
  .discover-page {
    padding: 0 4px;
  }
  .mobile-hero {
    margin-bottom: 20px;
  }
  .mobile-hero .banner-slider {
    aspect-ratio: unset;
    border-radius: var(--am-radius);
  }
  .mobile-hero .banner-slides {
    position: relative;
    width: 100%;
    height: auto;
  }
  .mobile-hero .banner-slide {
    position: absolute;
    inset: 0;
    width: 100%;
  }
  .mobile-hero .banner-slide.active {
    position: relative;
    display: block;
  }
  .mobile-hero .banner-slide img {
    width: 100%;
    height: auto;
    display: block;
    object-fit: unset;
  }
  .mobile-hero .banner-caption {
    padding: 20px 16px 36px;
  }
  .mobile-hero .banner-title {
    font-size: 18px;
  }
  .section-block { margin-bottom: 22px; }
  .album-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .album-card { padding: 10px; }
}

/* ============ 精选歌单网格 ============ */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
.playlist-card {
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  padding: 12px;
  cursor: pointer;
  transition: transform 0.25s var(--am-transition);
  min-width: 0;
}
.playlist-card:hover { transform: translateY(-4px); }
.playlist-card:active { transform: scale(0.98); }
.pl-cover-wrap {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--am-bg-2);
  box-shadow: var(--am-shadow);
  position: relative;
}
.pl-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pl-cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--am-text-secondary);
  background: linear-gradient(135deg, var(--am-bg-2), var(--am-bg));
}
.pl-name {
  font-weight: 600;
  margin-top: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pl-count {
  font-size: 13px;
  color: var(--am-text-secondary);
  margin-top: 4px;
}

/* ============ 移动端下拉刷新指示器（桌面端 display:none） ============ */
.ptr-indicator {
  display: none;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--am-text-secondary);
  font-size: 13px;
  font-weight: 500;
  width: 100%;
}
.ptr-indicator.ptr-anim {
  transition: height 0.22s var(--am-transition);
}
.ptr-icon {
  flex-shrink: 0;
  color: var(--am-primary);
}
.ptr-icon.spinning {
  animation: ptr-spin 0.8s linear infinite;
}
.ptr-text {
  white-space: nowrap;
}
@keyframes ptr-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 平板：精选歌单 2 列 */
@media (max-width: 1024px) {
  .playlist-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 手机：精选歌单横向滚动(约 1.5 列) + 下拉刷新指示器显示 */
@media (max-width: 767px) {
  .playlist-grid {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 12px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 4px;
    scrollbar-width: none;
  }
  .playlist-grid::-webkit-scrollbar { display: none; }
  .playlist-card {
    flex: 0 0 62%;
    max-width: 62%;
    scroll-snap-align: start;
  }
  .pl-cover-placeholder { padding: 24px; }
  .ptr-indicator { display: flex; }
  .section-more { min-height: 44px; }
}
</style>
