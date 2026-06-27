<template>
  <div>
    <h1 class="title-1">我的</h1>
    <div v-if="user.loggedIn">
      <!-- 顶部用户卡片 -->
      <div class="profile-header">
        <button class="logout-corner" type="button" @click="onLogout" aria-label="退出登录">
          <LogOut :size="18" />
        </button>
        <div class="avatar">
          <img v-if="user.user && user.user.avatar" :src="user.user.avatar" alt="头像" />
          <User v-else :size="36" />
        </div>
        <div class="profile-info">
          <div class="nickname-row">
            <h2 class="nickname">{{ displayName }}</h2>
            <button class="icon-edit" type="button" @click="onEditNickname" aria-label="修改昵称">
              <Pencil :size="16" />
            </button>
          </div>
          <p class="uid">ID: {{ user.user && user.user.id }}</p>
        </div>
      </div>

      <!-- 最近播放 -->
      <h2 class="title-2" style="margin-top:22px;">
        最近播放
        <span class="title-count">{{ history.length }}</span>
      </h2>
      <SongList
        :songs="history"
        :swipe-to-delete="true"
        @play="onPlay"
        @fav="onFav"
        @delete="onDeleteHistory"
      />

      <!-- 入口卡片网格 -->
      <div class="entry-grid">
        <button class="entry-card" type="button" @click="go('/library?tab=favorites')">
          <span class="entry-icon"><Heart :size="24" /></span>
          <span class="entry-title">我的收藏</span>
        </button>
        <button class="entry-card" type="button" @click="go('/library?tab=playlists')">
          <span class="entry-icon"><ListMusic :size="24" /></span>
          <span class="entry-title">我的歌单</span>
        </button>
        <button class="entry-card" type="button" @click="go('/download')">
          <span class="entry-icon"><Download :size="24" /></span>
          <span class="entry-title">下载管理</span>
        </button>
        <button class="entry-card" type="button" @click="themePickerVisible = true">
          <span class="entry-icon"><Palette :size="24" /></span>
          <span class="entry-title">主题切换</span>
        </button>
        <button class="entry-card" type="button" @click="onEntryLogout">
          <span class="entry-icon"><LogOut :size="24" /></span>
          <span class="entry-title">退出登录</span>
        </button>
        <button v-if="user.isAdmin" class="entry-card" type="button" @click="go('/admin')">
          <span class="entry-icon"><Settings :size="24" /></span>
          <span class="entry-title">管理后台</span>
        </button>
      </div>
    </div>
    <div v-else class="card">
      <p>请先登录以使用完整功能：</p>
      <button class="primary-btn" @click="goLogin">登录 / 注册</button>
    </div>

    <!-- 主题切换弹窗 -->
    <ThemePicker v-model="themePickerVisible" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import SongList from '../components/SongList.vue';
import ThemePicker from '../components/ThemePicker.vue';
import { listHistory, deleteHistory } from '../api/endpoints';
import { useUserStore } from '../stores/user';
import { usePlayerStore } from '../stores/player';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User, Pencil, LogOut, Heart, ListMusic, Download, Palette, Settings } from 'lucide-vue-next';

const user = useUserStore();
const p = usePlayerStore();
const history = ref([]);
const themePickerVisible = ref(false);

const displayName = computed(
  () => (user.user && (user.user.nickname || user.user.username)) || '未命名'
);

async function reload() {
  try { history.value = (await listHistory()) || []; } catch {}
}
onMounted(reload);

function onPlay(s, list) { p.play(s, list || history.value); }
function onFav(song) {
  if (song && song.id) p.toggleFavorite(song.id);
}
function goLogin() { window.location.hash = '#/login'; }
function go(path) { window.location.hash = '#' + path; }

// 顶部右上角退出：保留原有跳转 /discover 行为
function onLogout() { user.logout(); window.location.hash = '#/discover'; }
// 入口卡片退出：按需求跳转 /login
function onEntryLogout() { user.logout(); window.location.hash = '#/login'; }

// 修改昵称
async function onEditNickname() {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的昵称', '修改昵称', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: (user.user && user.user.nickname) || '',
      inputPlaceholder: '请输入昵称',
      inputValidator: (v) => (v && v.trim() ? true : '昵称不能为空')
    });
    const newName = value.trim();
    if (!newName) return;
    await user.updateNickname(newName);
    ElMessage.success('昵称已更新');
  } catch (e) {
    if (e === 'cancel' || e === 'close') return; // 用户取消
    ElMessage.error('昵称更新失败：' + (e && e.message ? e.message : '未知错误'));
  }
}

// 删除单条播放历史
async function onDeleteHistory(song) {
  try {
    await deleteHistory(song.id);
    history.value = history.value.filter(s => s.id !== song.id);
    ElMessage.success('已删除');
  } catch (e) {
    ElMessage.error('删除失败：' + (e && e.message ? e.message : '未知错误'));
  }
}
</script>

<style scoped>
/* 顶部用户卡片：在全局 .profile-header 基础上叠加定位上下文 */
.profile-header {
  position: relative;
  padding-right: 64px; /* 给右上角退出按钮留出空间 */
}
.logout-corner {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: var(--am-bg-2);
  color: var(--am-text-secondary);
  cursor: pointer;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition);
}
.logout-corner:hover {
  background: var(--am-border);
  color: var(--am-text);
}

/* 头像：80×80 圆形，覆盖全局 72×72；无头像显示 User 图标 */
.profile-header .avatar {
  width: 80px;
  height: 80px;
  min-width: 80px;
  overflow: hidden;
  color: var(--am-text-secondary);
}
.profile-header .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.profile-info {
  min-width: 0;
  flex: 1;
}
.nickname-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.nickname {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--am-text);
  word-break: break-word;
}
.icon-edit {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--am-text-secondary);
  cursor: pointer;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition);
}
.icon-edit:hover {
  background: var(--am-bg-2);
  color: var(--am-primary);
}
.uid {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--am-text-secondary);
}

/* 标题旁总数 */
.title-count {
  display: inline-block;
  margin-left: 8px;
  padding: 0 8px;
  min-width: 22px;
  height: 20px;
  line-height: 20px;
  border-radius: 999px;
  background: var(--am-bg-2);
  color: var(--am-text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}

/* 入口卡片网格（2 列） */
.entry-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.entry-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 96px;
  padding: 18px 12px;
  border-radius: 16px;
  border: 1px solid var(--am-border);
  background: var(--am-card);
  color: var(--am-text);
  cursor: pointer;
  font: inherit;
  transition: background 0.2s var(--am-transition), border-color 0.2s var(--am-transition), transform 0.15s var(--am-transition);
}
.entry-card:hover {
  background: var(--am-bg-2);
  border-color: var(--am-primary);
}
.entry-card:active {
  transform: scale(0.98);
}
.entry-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--am-bg-2);
  color: var(--am-primary);
}
.entry-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--am-text);
}

@media (max-width: 767px) {
  .entry-grid {
    gap: 10px;
  }
  .entry-card {
    min-height: 88px;
    padding: 14px 10px;
  }
  /* 触控目标 ≥ 44×44px：.logout-corner / .icon-edit / .entry-icon 均为 44×44，.entry-card 整卡可点 */
}
</style>
