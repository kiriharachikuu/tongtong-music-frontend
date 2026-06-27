<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h2 style="margin:0;">歌单管理</h2>
      <button class="primary-btn" @click="showEditor(null)">+ 新建歌单</button>
    </div>

    <el-table :data="playlists" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="description" label="简介" />
      <el-table-column label="创建者" width="140">
        <template #default="scope">
          <span v-if="scope.row.owner_name">{{ scope.row.owner_name }}</span>
          <span v-else style="color:var(--am-text-secondary);">-</span>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.is_system" size="small" style="background:#8B00FF;color:#fff;border:none;">系统</el-tag>
          <el-tag v-else type="info" size="small">用户</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="song_count" label="歌曲数" width="90" />
      <el-table-column label="操作" width="240">
        <template #default="scope">
          <button class="ghost-btn" style="margin-right:6px;" @click="showEditor(scope.row)">编辑</button>
          <button class="ghost-btn" style="margin-right:6px;" @click="showAddSongs(scope.row)">加歌</button>
          <button class="ghost-btn" style="color:#FA2D48;" @click="remove(scope.row)" :disabled="scope.row.is_system">删除</button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑弹窗 -->
    <div v-if="editing" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="editing=null">
      <div class="card" style="min-width:420px;">
        <h3 style="margin-top:0;">{{ editing.id ? '编辑歌单' : '新建歌单' }}</h3>
        <div class="field"><label>名称</label><input v-model="editing.name" /></div>
        <div class="field"><label>简介</label><input v-model="editing.description" /></div>
        <div class="field" style="flex-direction:row;align-items:center;gap:10px;">
          <label style="margin:0;">系统歌单</label>
          <el-switch v-model="editing.is_system" :active-value="1" :inactive-value="0" />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="ghost-btn" @click="editing=null">取消</button>
          <button class="primary-btn" @click="save">保存</button>
        </div>
      </div>
    </div>

    <!-- 添加歌曲弹窗 -->
    <div v-if="addingTo" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="addingTo=null">
      <div class="card" style="min-width:520px;max-height:80vh;display:flex;flex-direction:column;">
        <h3 style="margin-top:0;">添加歌曲到 - {{ addingTo.name }}</h3>
        <input v-model="songKw" class="search-input" placeholder="搜索歌曲标题/歌手" style="margin-bottom:10px;" @keyup.enter="searchSongs" />
        <div style="overflow-y:auto;flex:1;">
          <div v-for="s in songResults" :key="s.id" style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--am-border);">
            <div>
              <div style="font-size:14px;">{{ s.title }}</div>
              <div style="font-size:12px;color:var(--am-text-secondary);">{{ s.singer }}</div>
            </div>
            <button class="ghost-btn" @click="addSong(s.id)">添加</button>
          </div>
          <div v-if="!songResults.length" style="text-align:center;padding:20px;color:var(--am-text-secondary);">搜索歌曲后添加</div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button class="ghost-btn" @click="addingTo=null">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  adminPlaylists, adminPlaylistsAddSongs,
  adminCreatePlaylist, adminUpdatePlaylist, adminDeletePlaylist, adminListSongs
} from '../../api/endpoints';

const playlists = ref([]);
const editing = ref(null);
const addingTo = ref(null);
const songKw = ref('');
const songResults = ref([]);

async function reload() {
  const r = await adminPlaylists();
  playlists.value = (r && r.list) || (Array.isArray(r) ? r : []);
}
onMounted(reload);

function showEditor(p) {
  editing.value = p ? { ...p, is_system: p.is_system || 0 } : { id: null, name: '', description: '', is_system: 0 };
}

async function save() {
  try {
    if (editing.value.id) {
      await adminUpdatePlaylist(editing.value.id, { name: editing.value.name, description: editing.value.description, is_system: editing.value.is_system });
    } else {
      await adminCreatePlaylist({ name: editing.value.name, description: editing.value.description, is_system: editing.value.is_system });
    }
    ElMessage.success('保存成功');
    editing.value = null;
    reload();
  } catch (e) { ElMessage.error(e.message); }
}

async function remove(p) {
  if (p.is_system) { ElMessage.warning('系统歌单不可删除'); return; }
  if (!confirm(`确认删除歌单《${p.name}》?`)) return;
  await adminDeletePlaylist(p.id);
  ElMessage.success('已删除');
  reload();
}

function showAddSongs(p) {
  addingTo.value = p;
  songKw.value = '';
  songResults.value = [];
}

async function searchSongs() {
  const r = await adminListSongs({ keyword: songKw.value, limit: 50 });
  songResults.value = (r && r.list) || [];
}

async function addSong(songId) {
  try {
    await adminPlaylistsAddSongs(addingTo.value.id, [songId]);
    ElMessage.success('已添加');
  } catch (e) { ElMessage.error(e.message); }
}
</script>
