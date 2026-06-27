import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/discover' },
  { path: '/player', redirect: '/discover' },
  { path: '/discover', name: 'discover', component: () => import('../views/Discover.vue'), meta: { title: '发现' } },
  { path: '/library', name: 'library', component: () => import('../views/Library.vue'), meta: { title: '音乐库' } },
  { path: '/album/:id', name: 'album', component: () => import('../views/AlbumDetail.vue'), meta: { title: '专辑' } },
  { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue'), meta: { title: '我的' } },
  { path: '/search', name: 'search', component: () => import('../views/Search.vue'), meta: { title: '搜索' } },
  { path: '/playlist/:id', name: 'playlist', component: () => import('../views/PlaylistDetail.vue'), meta: { title: '歌单' } },
  { path: '/ranking', name: 'ranking', component: () => import('../views/RankingView.vue'), meta: { title: '排行榜' } },
  { path: '/download', name: 'download', component: () => import('../views/DownloadManager.vue'), meta: { title: '下载管理' } },
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { title: '登录' } },
  { path: '/about', name: 'about', component: () => import('../views/About.vue'), meta: { title: '关于项目' } },
  {
    path: '/admin', redirect: '/admin/dashboard',
    component: () => import('../views/admin/AdminLayout.vue'),
    children: [
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'songs', component: () => import('../views/admin/Songs.vue') },
      { path: 'albums', component: () => import('../views/admin/Albums.vue') },
      { path: 'banners', component: () => import('../views/admin/Banners.vue') },
      { path: 'playlists', component: () => import('../views/admin/Playlists.vue') },
      { path: 'users', component: () => import('../views/admin/Users.vue') },
      { path: 'logs', component: () => import('../views/admin/Logs.vue') },
      { path: 'storage', component: () => import('../views/admin/Storage.vue') },
      { path: 'migrate', component: () => import('../views/admin/Migrate.vue') },
      { path: 'versions', component: () => import('../views/admin/Versions.vue') },
      { path: 'ranking', component: () => import('../views/admin/Ranking.vue') }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});

export default router;
