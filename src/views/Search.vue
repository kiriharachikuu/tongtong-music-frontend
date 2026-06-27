<template>
  <div>
    <h1 class="title-1">搜索</h1>
    <div style="display:flex;gap:10px;margin-bottom:18px;">
      <input class="search-input" v-model="kw" placeholder="搜索歌曲、歌手、专辑..." style="flex:1;max-width:none;" />
      <button class="primary-btn" @click="onSearch">搜索</button>
    </div>
    <SongList :songs="results" @play="onPlay" @fav="onFav" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import SongList from '../components/SongList.vue';
import { listSongs } from '../api/endpoints';
import { usePlayerStore } from '../stores/player';

const p = usePlayerStore();
const kw = ref(decodeURIComponent(location.hash.split('k=')[1] || ''));
const results = ref([]);

async function onSearch() {
  try {
    const r = await listSongs({ keyword: kw.value, limit: 100 });
    results.value = (r && r.list) || [];
  } catch (e) { results.value = []; }
}
onMounted(() => { if (kw.value) onSearch(); });
function onPlay(s, list) { p.play(s, list || results.value); }
function onFav(song) {
  if (song && song.id) p.toggleFavorite(song.id);
}
</script>
