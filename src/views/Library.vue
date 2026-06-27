<template>
  <div>
    <h1 class="title-1">音乐库</h1>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;">
      <button class="ghost-btn" @click="tab='songs'" :class="{ active: tab==='songs' }">全部歌曲</button>
      <button class="ghost-btn" @click="tab='playlists'" :class="{ active: tab==='playlists' }">歌单</button>
      <button class="ghost-btn" @click="tab='favorites'" :class="{ active: tab==='favorites' }">收藏</button>
      <button class="ghost-btn" @click="tab='history'" :class="{ active: tab==='history' }">历史</button>
      <div style="flex:1"></div>
      <button v-if="user.loggedIn" class="primary-btn" @click="showCreate = true">+ 新建歌单</button>
    </div>

    <!-- 全部歌曲 - 专辑平铺展示 -->
    <div v-if="tab==='songs'">
      <div v-if="!allAlbums.length" class="card text-secondary" style="padding:40px;text-align:center;">暂无专辑</div>
      <div class="album-grid" v-else>
        <div v-for="album in allAlbums" :key="album.id" class="album-card" @click="viewAlbum(album)">
          <img class="album-cover" :src="album.coverUrl" @error="($event.target.style.opacity=0.2)" loading="lazy" />
          <div class="album-title">{{ album.name }}</div>
          <div class="album-desc">{{ album.singer || '未知歌手' }} · {{ album.song_count }} 首</div>
        </div>
      </div>
    </div>

    <div v-if="tab==='playlists'">
      <div v-if="!user.loggedIn" class="card">
        <p>请先登录以查看歌单：</p>
        <button class="primary-btn" @click="goLogin">登录 / 注册</button>
      </div>
      <div v-else>
        <div v-if="!playlists.length" class="card text-secondary">暂无歌单，点右上角「+ 新建歌单」创建。</div>
        <div class="album-grid">
          <div v-for="pl in playlists" :key="pl.id" class="album-card" @click="$router.push('/playlist/' + pl.id)">
            <img class="album-cover" :src="pl.cover || firstCover(pl)" @error="($event.target.style.opacity=0.2)" loading="lazy" />
            <div class="album-title">{{ pl.name }}</div>
            <div class="album-desc">{{ pl.songCount }} 首 · {{ pl.is_system ? '系统歌单' : '私人歌单' }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tab==='favorites'">
      <SongList :songs="favorites" @play="onPlay" @fav="onFav" />
    </div>

    <div v-if="tab==='history'">
      <SongList :songs="history" @play="onPlay" @fav="onFav" />
    </div>

    <!-- 新建歌单弹窗 -->
    <div v-if="showCreate" class="mobile-only-dialog" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9999;display:flex;align-items:center;justify-content:center;" @click.self="showCreate=false">
      <div class="card" style="min-width:320px;">
        <h3 style="margin-top:0;">新建歌单</h3>
        <div class="field">
          <label>名称</label>
          <input v-model="newName" placeholder="我的歌单" />
        </div>
        <div class="field">
          <label>简介（可选）</label>
          <input v-model="newDesc" placeholder="歌单简介" />
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button class="ghost-btn" @click="showCreate=false">取消</button>
          <button class="primary-btn" @click="onCreate">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SongList from '../components/SongList.vue';
import { listPlaylists, createPlaylist, listFavorites, listHistory, listSongs, listAlbums } from '../api/endpoints';
import { usePlayerStore } from '../stores/player';
import { useUserStore } from '../stores/user';

const router = useRouter();
const p = usePlayerStore();
const user = useUserStore();
const tab = ref('songs');
const playlists = ref([]);
const favorites = ref([]);
const history = ref([]);
const allSongs = ref([]);
const allAlbums = ref([]);
const showCreate = ref(false);
const newName = ref('');
const newDesc = ref('');

// 加载专辑列表
async function loadAlbums() {
  try {
    allAlbums.value = (await listAlbums()) || [];
  } catch (e) {
    console.error('加载专辑失败:', e);
    allAlbums.value = [];
  }
}

// 查看专辑详情
function viewAlbum(album) {
  router.push(`/album/${album.id}`);
}

// 播放专辑
function playAlbum(album) {
  const songs = allSongs.value.filter(s => s.album_id === album.id);
  if (songs.length > 0) {
    p.play(songs[0], songs);
  } else {
    alert('该专辑暂无歌曲');
  }
}

async function reload() {
  try { allSongs.value = (await listSongs({ limit: 1000 })) || []; } catch {}
  try { await loadAlbums(); } catch {}
  if (user.loggedIn) {
    try { playlists.value = (await listPlaylists()) || []; } catch {}
    try { favorites.value = (await listFavorites()) || []; } catch {}
    try { history.value = (await listHistory()) || []; } catch {}
  }
}
onMounted(reload);

async function onCreate() {
  if (!user.loggedIn) {
    alert('请先登录');
    return;
  }
  try {
    await createPlaylist({ name: newName.value, description: newDesc.value });
    newName.value = ''; newDesc.value = ''; showCreate.value = false;
    reload();
  } catch (e) { alert(e.message); }
}

function firstCover(pl) {
  return (pl.songs && pl.songs[0] && pl.songs[0].cover_url) || '';
}
function onPlay(song, list) { p.play(song, list || allSongs.value); }
function onFav(song) {
  if (song && song.id) p.toggleFavorite(song.id);
}
function goLogin() { window.location.hash = '#/login'; }
</script>

<style scoped>
.ghost-btn.active { background: var(--am-primary); color: #fff; }
</style>
