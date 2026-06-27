<template>
  <div class="admin-ranking-page">
    <!-- 页面标题 -->
    <header class="ranking-header">
      <h1 class="title-1">排行榜管理</h1>
      <p class="ranking-subtitle text-secondary">查看与编辑歌曲排行</p>
    </header>

    <!-- 顶部 Tab 切换 -->
    <div class="ranking-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="ghost-btn tab-btn"
        :class="{ active: activeTab === t.key }"
        role="tab"
        :aria-selected="activeTab === t.key"
        @click="switchTab(t.key)"
      >
        <component :is="t.icon" :size="16" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <!-- 表格容器 -->
    <div class="ranking-table" v-loading="loading">
      <!-- 空数据 -->
      <div v-if="!loading && !songs.length" class="ranking-empty">
        <Trophy :size="44" />
        <p class="empty-text">暂无排行榜数据</p>
      </div>

      <!-- 表格 -->
      <template v-else-if="songs.length">
        <div class="table-head">
          <span class="col-rank">排名</span>
          <span class="col-cover"></span>
          <span class="col-title">标题</span>
          <span class="col-singer">演唱者</span>
          <span class="col-play">播放量</span>
          <span class="col-fav">收藏量</span>
          <span class="col-action">操作</span>
        </div>
        <div
          v-for="song in songs"
          :key="song.id"
          class="table-row"
          :class="{ 'is-top': song.rank <= 3 }"
        >
          <span class="col-rank rank-cell">
            <Trophy
              v-if="song.rank === 1"
              :size="22"
              :fill="MEDAL_GOLD"
              :color="MEDAL_GOLD"
            />
            <Trophy
              v-else-if="song.rank === 2"
              :size="22"
              :fill="MEDAL_SILVER"
              :color="MEDAL_SILVER"
            />
            <Trophy
              v-else-if="song.rank === 3"
              :size="22"
              :fill="MEDAL_BRONZE"
              :color="MEDAL_BRONZE"
            />
            <span v-else class="rank-num">{{ song.rank }}</span>
          </span>
          <div class="col-cover">
            <img
              class="cover-img"
              :src="getCover(song)"
              :alt="song.title"
              loading="lazy"
              @error="onCoverError"
            />
          </div>
          <span class="col-title title-text">{{ song.title }}</span>
          <span class="col-singer meta-text">{{ song.singer || '未知歌手' }}</span>
          <span class="col-play meta-text">{{ fmtCount(song.play_count) }}</span>
          <span class="col-fav meta-text">{{ fmtCount(song.favorite_count) }}</span>
          <span class="col-action">
            <button
              class="edit-btn"
              title="编辑"
              aria-label="编辑"
              @click="onEdit(song)"
            >
              <Pencil :size="16" />
            </button>
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Trophy, Pencil, BarChart3, Star } from 'lucide-vue-next';
import { getRanking } from '../../api/endpoints';

const router = useRouter();

// 金银铜徽章颜色（按需求硬编码，仅此处允许）
const MEDAL_GOLD = '#FFD700';
const MEDAL_SILVER = '#C0C0C0';
const MEDAL_BRONZE = '#CD7F32';

const tabs = [
  { key: 'play', label: '播放量', icon: BarChart3 },
  { key: 'favorite', label: '收藏量', icon: Star },
];

const activeTab = ref('play');
const songs = ref([]);
const loading = ref(false);

// 默认占位封面
const defaultCover =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#e8e8ed"/></svg>'
  );

// 兼容 cover_url / coverUrl / cover 三种字段名
function getCover(song) {
  return song.cover_url || song.coverUrl || song.cover || defaultCover;
}

function onCoverError(e) {
  e.target.src = defaultCover;
}

// 数字格式化：≥1万 显示「x.x万」
function fmtCount(n) {
  const num = Number(n) || 0;
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return String(num);
}

async function loadRanking() {
  loading.value = true;
  try {
    const r = await getRanking({ by: activeTab.value, limit: 100 });
    // 兼容后端直接返回数组或 { list: [] } 两种结构
    songs.value = Array.isArray(r) ? r : (r && r.list) || [];
  } catch (e) {
    songs.value = [];
  } finally {
    loading.value = false;
  }
}

function switchTab(key) {
  if (activeTab.value === key) return;
  activeTab.value = key;
  loadRanking();
}

function onEdit(song) {
  if (!song || !song.id) return;
  router.push(`/admin/songs?edit=${song.id}`);
}

onMounted(loadRanking);
</script>

<style scoped>
.admin-ranking-page {
  max-width: 1100px;
  margin: 0 auto;
}

/* ============ 页面标题 ============ */
.ranking-header {
  margin-bottom: 18px;
}
.ranking-subtitle {
  margin: -6px 0 0;
  font-size: 14px;
}

/* ============ Tab 切换 ============ */
.ranking-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition),
    box-shadow 0.2s var(--am-transition);
}
.tab-btn.active {
  background: var(--am-primary);
  color: #fff;
  box-shadow: 0 4px 14px rgba(139, 0, 255, 0.3);
}

/* ============ 表格容器 ============ */
.ranking-table {
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  overflow: hidden;
  min-height: 220px;
  position: relative;
}

/* ============ 空数据 ============ */
.ranking-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 20px;
  color: var(--am-text-secondary);
}
.ranking-empty :deep(svg) {
  color: var(--am-text-secondary);
  opacity: 0.45;
}
.empty-text {
  margin: 0;
  font-size: 15px;
}

/* ============ 表格 ============ */
.table-head,
.table-row {
  display: grid;
  grid-template-columns: 64px 56px 1fr 180px 110px 110px 80px;
  gap: 12px;
  align-items: center;
  padding: 12px 18px;
}
.table-head {
  border-bottom: 1px solid var(--am-border);
  color: var(--am-text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.table-row {
  border-bottom: 1px solid var(--am-border);
  transition: background 0.2s var(--am-transition);
}
.table-row:last-child {
  border-bottom: none;
}
.table-row:hover {
  background: var(--am-bg-2);
}
.table-row.is-top {
  background: linear-gradient(
    90deg,
    rgba(139, 0, 255, 0.05),
    transparent 55%
  );
}
.table-row.is-top:hover {
  background: linear-gradient(
    90deg,
    rgba(139, 0, 255, 0.08),
    var(--am-bg-2) 55%
  );
}
.rank-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}
.rank-num {
  font-size: 16px;
  font-weight: 700;
  color: var(--am-text-secondary);
  font-variant-numeric: tabular-nums;
}
.cover-img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  background: var(--am-bg-2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: block;
}
.title-text {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.meta-text {
  color: var(--am-text-secondary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.edit-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--am-text-secondary);
  background: transparent;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition),
    transform 0.15s var(--am-transition);
}
.edit-btn:hover {
  background: var(--am-primary);
  color: #fff;
  transform: scale(1.06);
}
.edit-btn:active {
  transform: scale(0.94);
}

/* ============ 平板：收紧列宽 ============ */
@media (max-width: 1023px) and (min-width: 768px) {
  .table-head,
  .table-row {
    grid-template-columns: 56px 52px 1fr 140px 90px 90px 64px;
    gap: 10px;
    padding: 11px 14px;
  }
}

/* ============ 移动端：紧凑布局 ============ */
@media (max-width: 767px) {
  .admin-ranking-page {
    max-width: none;
  }
  .title-1 {
    font-size: 24px;
    margin: 6px 0 10px;
  }
  .table-head {
    display: none;
  }
  .table-row {
    grid-template-columns: 40px 48px 1fr 40px;
    grid-template-areas:
      'rank cover info action'
      'rank cover info action';
    gap: 10px;
    padding: 12px 14px;
  }
  .table-row .col-rank {
    grid-area: rank;
  }
  .table-row .col-cover {
    grid-area: cover;
  }
  .table-row .col-title {
    grid-area: info;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .table-row .col-singer,
  .table-row .col-play,
  .table-row .col-fav {
    position: static;
    display: revert;
    font-size: 12px;
    color: var(--am-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .table-row .col-action {
    grid-area: action;
    align-self: center;
  }
  .cover-img {
    width: 48px;
    height: 48px;
    border-radius: 10px;
  }
}
</style>
