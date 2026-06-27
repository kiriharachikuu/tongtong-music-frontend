<template>
  <div class="app-layout" :class="{ 'mobile': isMobile }">
    <!-- 桌面 / 平板侧边栏 -->
    <aside class="app-sidebar desktop-only">
      <h2 class="sidebar-brand">瞳瞳音乐</h2>
      <nav class="sidebar-nav">
        <router-link to="/discover" class="nav-item" :class="{ active: route.path === '/discover' }">
          <Compass :size="20" /><span>发现</span>
        </router-link>
        <router-link to="/ranking" class="nav-item" :class="{ active: route.path === '/ranking' }">
          <Trophy :size="20" /><span>排行榜</span>
        </router-link>
        <router-link to="/library" class="nav-item" :class="{ active: route.path === '/library' }">
          <Disc3 :size="20" /><span>音乐库</span>
        </router-link>
        <router-link to="/search" class="nav-item" :class="{ active: route.path === '/search' }">
          <Search :size="20" /><span>搜索</span>
        </router-link>
        <router-link to="/profile" class="nav-item" :class="{ active: route.path === '/profile' }">
          <User :size="20" /><span>我的</span>
        </router-link>
        <router-link v-if="user.isAdmin" to="/admin/dashboard" class="nav-item">
          <Settings :size="20" /><span>管理后台</span>
        </router-link>
      </nav>
      <!-- 侧边栏底部：关于项目 -->
      <div class="sidebar-footer">
        <router-link to="/about" class="nav-item" :class="{ active: route.path === '/about' }">
          <Info :size="20" /><span>关于项目</span>
        </router-link>
      </div>
    </aside>

    <!-- 顶栏 -->
    <header class="app-topbar">
      <div class="topbar-search">
        <Search :size="18" class="search-icon" />
        <input
          class="search-input"
          ref="searchInputRef"
          v-model="searchKw"
          placeholder="搜索歌曲、歌手、专辑"
          @keyup.enter="onSearch"
        />
      </div>
      <div class="topbar-actions">
        <button class="topbar-btn theme-toggle"
                :class="{ 'is-dark': theme === 'dark' }"
                @click="toggleTheme"
                :title="themeLabel"
                :aria-label="themeLabel">
          <component :is="themeIcon" :size="20" />
        </button>
        <router-link v-if="!user.loggedIn" to="/login" class="topbar-btn topbar-auth">登录</router-link>
        <button v-else class="topbar-btn topbar-auth" @click="onLogout">
          <User :size="18" />
          <span class="auth-name">{{ user.user?.username }}</span>
        </button>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="app-main">
      <div class="route-transition-wrap">
        <router-view v-slot="{ Component, route: r }">
          <transition name="route-fade" mode="default">
            <component :is="Component" :key="r.path" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- 底部播放器栏 -->
    <PlayerBar @toggle-lyric="drawerOpen = !drawerOpen" />

    <!-- 移动端底部导航 -->
    <nav class="bottom-nav mobile-only">
      <router-link to="/discover" class="bn-item" :class="{ active: route.path === '/discover' }">
        <Compass :size="22" /><span>发现</span>
      </router-link>
      <router-link to="/ranking" class="bn-item" :class="{ active: route.path === '/ranking' }">
        <Trophy :size="22" /><span>排行榜</span>
      </router-link>
      <router-link to="/library" class="bn-item" :class="{ active: route.path === '/library' }">
        <Disc3 :size="22" /><span>音乐库</span>
      </router-link>
      <router-link to="/profile" class="bn-item" :class="{ active: route.path === '/profile' }">
        <User :size="22" /><span>我的</span>
      </router-link>
    </nav>

    <!-- 抽屉式歌词 -->
    <LyricDrawer :open="drawerOpen" @update:open="drawerOpen = $event" />

    <!-- 悬浮歌词窗（PC） -->
    <LyricWindow v-if="lyricWindowOpen" @close="lyricWindowOpen = false" />

    <!-- App 更新提示弹窗 -->
    <UpdateDialog
      v-model="updateVisible"
      :version="latestVersion"
      @confirm="onUpdateConfirm"
      @ignore="onUpdateIgnore"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { Compass, Disc3, Search, User, Settings, Sun, Moon, Info, Trophy } from 'lucide-vue-next';
import PlayerBar from './components/PlayerBar.vue';
import LyricDrawer from './components/LyricDrawer.vue';
import LyricWindow from './components/LyricWindow.vue';
import { useUserStore } from './stores/user';
import UpdateDialog from './components/UpdateDialog.vue';
import { getLatestVersion } from './api/endpoints';

const route = useRoute();
const user = useUserStore();
const drawerOpen = ref(false);
const lyricWindowOpen = ref(false);
const theme = ref(localStorage.getItem('tt_theme') || 'light');
const searchKw = ref('');
const searchInputRef = ref(null);

// ===== App 更新提示 =====
const updateVisible = ref(false);
const latestVersion = ref(null);

const themeLabel = computed(() => theme.value === 'dark' ? '黑夜模式' : '白天模式');
const themeIcon = computed(() => theme.value === 'dark' ? Moon : Sun);

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tt_theme', theme.value);
  applyTheme();
}

function applyTheme() {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.value);
}

// 响应式断点
const isMobile = ref(false);
function syncMobile() { isMobile.value = window.innerWidth <= 767; }

// 设备性能检测：低端设备降级动画时长与位移，保障 30FPS+
// 同时监听 prefers-reduced-motion，无障碍优先
const prefersReducedMotion = ref(false);
function detectCapability() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion.value = mq.matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  // 低端判定：CPU 核心 ≤2 或内存 ≤2GB；或屏幕较小且无硬件加速
  const isLowEnd = !mq.matches && (cores <= 2 || memory <= 2);
  document.documentElement.classList.toggle('low-end', isLowEnd);
}
function onMotionChange(e) { prefersReducedMotion.value = e.matches; }

// 键盘快捷键（仅 PC）
function onKey(e) {
  if (isMobile.value) return;
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.code === 'Space') { e.preventDefault(); window.dispatchEvent(new CustomEvent('tt-toggle-play')); }
  else if (e.code === 'ArrowRight') window.dispatchEvent(new CustomEvent('tt-next'));
  else if (e.code === 'ArrowLeft') window.dispatchEvent(new CustomEvent('tt-prev'));
  else if (e.code === 'ArrowUp') { e.preventDefault(); window.dispatchEvent(new CustomEvent('tt-volume', { detail: +0.05 })); }
  else if (e.code === 'ArrowDown') { e.preventDefault(); window.dispatchEvent(new CustomEvent('tt-volume', { detail: -0.05 })); }
  else if (e.key === 'l' || e.key === 'L') drawerOpen.value = !drawerOpen.value;
  else if (e.key === 's' || e.key === 'S') window.dispatchEvent(new CustomEvent('tt-fav'));
  else if (e.key === 'w' || e.key === 'W') lyricWindowOpen.value = !lyricWindowOpen.value;
  else if (e.key === '/') {
    e.preventDefault();
    if (searchInputRef.value) searchInputRef.value.focus();
  }
}

/* global __APP_VERSION__ */
// ===== App 版本更新检测 =====
// 将本地版本号（如 "1.0.0"）按 . 分割转换为可比较的数字：major*10000 + minor*100 + patch
function localVersionCode(v) {
  const parts = String(v || '').split('.').map(p => parseInt(p, 10) || 0);
  const [major = 0, minor = 0, patch = 0] = parts;
  return major * 10000 + minor * 100 + patch;
}

// 检查服务端是否有更新版本；失败时静默处理（仅 console.warn），不影响 App 启动
async function checkUpdate() {
  // 本次启动已点过「本次忽略」则不再提示
  if (sessionStorage.getItem('tt_update_ignored') === '1') return;
  try {
    const { data } = await getLatestVersion();
    const remote = data?.version_code;
    if (remote == null) return;
    const localVer = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
    const local = localVersionCode(localVer);
    if (Number(remote) > local) {
      latestVersion.value = data;
      updateVisible.value = true;
    }
  } catch (err) {
    console.warn('[UpdateCheck] 获取最新版本失败:', err);
  }
}

// 「立即更新」：弹窗内已打开下载链接，这里仅确保关闭弹窗
function onUpdateConfirm() {
  updateVisible.value = false;
}

// 「本次忽略」：关闭弹窗并写入 sessionStorage，本次启动不再提示
function onUpdateIgnore() {
  sessionStorage.setItem('tt_update_ignored', '1');
  updateVisible.value = false;
}

onMounted(() => {
  applyTheme();
  syncMobile();
  detectCapability();
  window.addEventListener('resize', syncMobile);
  window.addEventListener('keydown', onKey);
  // 监听系统级减弱动画偏好变化
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.addEventListener) mq.addEventListener('change', onMotionChange);
  else if (mq.addListener) mq.addListener(onMotionChange);
  // 检查 App 版本更新（失败静默处理，不影响启动）
  checkUpdate();
});
onUnmounted(() => {
  window.removeEventListener('resize', syncMobile);
  window.removeEventListener('keydown', onKey);
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.removeEventListener) mq.removeEventListener('change', onMotionChange);
  else if (mq.removeListener) mq.removeListener(onMotionChange);
});

function onSearch() { if (searchKw.value) location.hash = '#/search?k=' + encodeURIComponent(searchKw.value); }
function onLogout() { user.logout(); location.hash = '#/discover'; }
</script>

<style scoped>
@media (min-width: 768px) { .mobile-only { display: none !important; } }
@media (max-width: 767px) { .desktop-only { display: none !important; } }
</style>
