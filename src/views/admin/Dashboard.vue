<template>
  <div class="dashboard" v-loading="loading">
    <h2 class="dash-title">数据总览</h2>

    <!-- 顶部 4 张统计卡片 -->
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon--primary"><Disc3 :size="24" /></div>
        <div class="stat-body">
          <div class="stat-value">{{ fmtCount(stats.songCount) }}</div>
          <div class="stat-label">歌曲总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--primary"><Users :size="24" /></div>
        <div class="stat-body">
          <div class="stat-value">{{ fmtCount(stats.userCount) }}</div>
          <div class="stat-label">用户数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--primary"><Play :size="24" /></div>
        <div class="stat-body">
          <div class="stat-value">{{ fmtCount(stats.playCount) }}</div>
          <div class="stat-label">总播放次数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon--primary"><Tag :size="24" /></div>
        <div class="stat-body">
          <div class="stat-value">{{ versionName || '—' }}</div>
          <div class="stat-label">当前版本</div>
        </div>
      </div>
    </div>

    <!-- 排行榜 + 快捷操作(桌面 3 列:Top5 | Top5 | 快捷操作) -->
    <div class="dash-grid-3">
      <!-- 播放 Top5 -->
      <section class="card rank-card">
        <header class="rank-head">
          <h3 class="rank-title">播放 Top5</h3>
          <Play :size="16" class="rank-head-icon" />
        </header>
        <ul class="rank-list">
          <li v-for="(song, i) in playTop" :key="'p' + (song.id != null ? song.id : i)" class="rank-item">
            <span class="rank-no">
              <span v-if="i < 3" class="rank-medal" :class="'medal-' + (i + 1)"></span>
              <span v-else class="rank-num">{{ i + 1 }}</span>
            </span>
            <img class="rank-cover" :src="getCover(song)" :alt="song.title" loading="lazy" @error="onCoverError" />
            <div class="rank-meta">
              <div class="rank-song-title">{{ song.title || '未知歌曲' }}</div>
              <div class="rank-song-singer">{{ song.singer || '未知歌手' }}</div>
            </div>
            <span class="rank-count">{{ fmtCount(song.play_count) }}</span>
          </li>
          <li v-if="!playTop.length" class="rank-empty">暂无数据</li>
        </ul>
      </section>

      <!-- 收藏 Top5 -->
      <section class="card rank-card">
        <header class="rank-head">
          <h3 class="rank-title">收藏 Top5</h3>
          <Heart :size="16" class="rank-head-icon" />
        </header>
        <ul class="rank-list">
          <li v-for="(song, i) in favTop" :key="'f' + (song.id != null ? song.id : i)" class="rank-item">
            <span class="rank-no">
              <span v-if="i < 3" class="rank-medal" :class="'medal-' + (i + 1)"></span>
              <span v-else class="rank-num">{{ i + 1 }}</span>
            </span>
            <img class="rank-cover" :src="getCover(song)" :alt="song.title" loading="lazy" @error="onCoverError" />
            <div class="rank-meta">
              <div class="rank-song-title">{{ song.title || '未知歌曲' }}</div>
              <div class="rank-song-singer">{{ song.singer || '未知歌手' }}</div>
            </div>
            <span class="rank-count">{{ fmtCount(song.favorite_count) }}</span>
          </li>
          <li v-if="!favTop.length" class="rank-empty">暂无数据</li>
        </ul>
      </section>

      <!-- 快捷操作 -->
      <section class="card quick-card">
        <header class="rank-head">
          <h3 class="rank-title">快捷操作</h3>
          <Zap :size="16" class="rank-head-icon" />
        </header>
        <div class="quick-grid">
          <button class="quick-btn" type="button" @click="go('/admin/songs?action=upload')">
            <span class="quick-icon"><Upload :size="20" /></span>
            <span class="quick-text">上传歌曲</span>
          </button>
          <button class="quick-btn" type="button" @click="go('/admin/banners?action=new')">
            <span class="quick-icon"><ImageIcon :size="20" /></span>
            <span class="quick-text">添加横幅</span>
          </button>
          <button class="quick-btn" type="button" @click="go('/admin/versions?action=new')">
            <span class="quick-icon"><Rocket :size="20" /></span>
            <span class="quick-text">发布版本</span>
          </button>
          <button class="quick-btn" type="button" @click="go('/admin/logs')">
            <span class="quick-icon"><FileText :size="20" /></span>
            <span class="quick-text">查看日志</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Disc3, Users, Play, Tag, Heart, Zap, Upload, Image as ImageIcon, Rocket, FileText,
} from 'lucide-vue-next';
import { adminStats, getLatestVersion, getRanking } from '../../api/endpoints';

const router = useRouter();

const loading = ref(false);
const stats = ref({});
const versionName = ref('');
const playTop = ref([]);
const favTop = ref([]);

// 数字格式化:超 1 万显示 x.x万
function fmtCount(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return n == null ? '0' : String(n);
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return String(num);
}

// 兼容 cover_url / coverUrl / cover 三种字段名
function getCover(song) {
  return song.cover_url || song.coverUrl || song.cover || '';
}

function onCoverError(e) {
  e.target.style.visibility = 'hidden';
}

function go(path) {
  router.push(path);
}

onMounted(async () => {
  loading.value = true;
  try {
    const [statsRes, verRes, playRes, favRes] = await Promise.all([
      adminStats().catch(() => ({})),
      getLatestVersion().catch(() => null),
      getRanking({ by: 'play', limit: 5 }).catch(() => null),
      getRanking({ by: 'favorite', limit: 5 }).catch(() => null),
    ]);
    stats.value = statsRes || {};
    // 兼容两种返回结构:已解包的版本对象 或 { data: {...} }
    const ver = (verRes && verRes.data) || verRes || {};
    versionName.value = ver.version_name || '';
    playTop.value = (playRes && playRes.list) || (Array.isArray(playRes) ? playRes : []) || [];
    favTop.value = (favRes && favRes.list) || (Array.isArray(favRes) ? favRes : []) || [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 18px; }
.dash-title { margin: 0; font-size: 22px; font-weight: 700; color: var(--am-text); }

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.stat-card {
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.stat-icon--primary {
  background: linear-gradient(135deg, var(--am-primary), var(--am-primary-hover));
  box-shadow: 0 6px 16px rgba(139, 0, 255, 0.3);
}
.stat-body { min-width: 0; }
.stat-value {
  font-size: 26px; font-weight: 700;
  line-height: 1.1;
  color: var(--am-text);
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}
.stat-label {
  font-size: 13px;
  color: var(--am-text-secondary);
  margin-top: 4px;
}

.dash-grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.rank-card, .quick-card { padding: 16px 18px; }
.rank-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.rank-title { margin: 0; font-size: 16px; font-weight: 600; color: var(--am-text); }
.rank-head-icon { color: var(--am-text-secondary); flex-shrink: 0; }

.rank-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.rank-item {
  display: grid;
  grid-template-columns: 28px 32px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 8px 6px;
  border-radius: 10px;
  transition: background 0.2s var(--am-transition);
}
.rank-item:hover { background: var(--am-bg-2); }
.rank-no {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
}
.rank-num {
  font-size: 14px; font-weight: 600;
  color: var(--am-text-secondary);
  font-variant-numeric: tabular-nums;
}
.rank-medal {
  width: 12px; height: 12px; border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 2px var(--am-card);
}
.medal-1 { background: #FFD700; }
.medal-2 { background: #C0C0C0; }
.medal-3 { background: #CD7F32; }
.rank-cover {
  width: 32px; height: 32px; border-radius: 8px; object-fit: cover;
  background: var(--am-bg-2);
}
.rank-meta { min-width: 0; }
.rank-song-title {
  font-size: 14px; font-weight: 500; color: var(--am-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.rank-song-singer {
  font-size: 12px; color: var(--am-text-secondary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-top: 2px;
}
.rank-count {
  font-size: 13px; font-weight: 600;
  color: var(--am-text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.rank-empty {
  padding: 24px 0; text-align: center;
  color: var(--am-text-secondary); font-size: 13px;
}

.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.quick-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px;
  padding: 16px 10px;
  border-radius: 14px;
  background: var(--am-bg-2);
  color: var(--am-text);
  border: 1px solid var(--am-border);
  cursor: pointer;
  min-height: 76px;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition),
    border-color 0.2s var(--am-transition), transform 0.15s var(--am-transition),
    box-shadow 0.2s var(--am-transition);
}
.quick-btn:hover {
  background: var(--am-primary);
  color: #fff;
  border-color: var(--am-primary);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 0, 255, 0.28);
}
.quick-btn:active { transform: scale(0.97); }
.quick-icon { display: inline-flex; }
.quick-text { font-size: 13px; font-weight: 500; }

@media (max-width: 1100px) {
  .dash-grid-3 { grid-template-columns: 1fr 1fr; }
  .quick-card { grid-column: 1 / -1; }
  .quick-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 767px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .dash-grid-3 { grid-template-columns: 1fr; }
  .quick-card { grid-column: auto; }
  .quick-grid { grid-template-columns: 1fr 1fr; }
}
</style>
