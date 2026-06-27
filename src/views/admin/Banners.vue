<template>
  <div>
    <h2 style="margin-top:0;">横幅管理</h2>
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <button class="primary-btn" @click="createBanner">+ 新建横幅</button>
    </div>
    <el-table :data="banners" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="link" label="链接歌单 ID" width="160" />
      <el-table-column label="关联歌曲" width="180">
        <template #default="scope">
          <span v-if="scope.row.song_id">{{ songTitle(scope.row.song_id) }}</span>
          <span v-else style="color:var(--am-text-secondary);">-</span>
        </template>
      </el-table-column>
      <el-table-column label="预览" width="240">
        <template #default="scope">
          <img :src="scope.row.imageUrl" style="width:200px;height:80px;object-fit:cover;border-radius:8px;" @error="($event.target.style.opacity=0.3)" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="scope">
          <button class="ghost-btn" style="margin-right:6px;" @click="uploadImage(scope.row)">图片</button>
          <button class="ghost-btn" style="margin-right:6px;" @click="edit(scope.row)">编辑</button>
          <button class="ghost-btn" style="color:#FA2D48;" @click="remove(scope.row)">删除</button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="editing" style="position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:9999;" @click.self="editing=null">
      <div class="card" style="min-width:380px;">
        <h3 style="margin-top:0;">编辑横幅</h3>
        <div class="field"><label>标题</label><input v-model="editing.title" /></div>
        <div class="field"><label>链接歌单 ID（可为空）</label><input v-model.number="editing.link" /></div>
        <div class="field">
          <label>关联歌曲（可为空）</label>
          <el-select
            v-model="editing.song_id"
            filterable
            remote
            reserve-keyword
            clearable
            placeholder="搜索歌曲标题/歌手"
            :remote-method="searchSongs"
            :loading="songLoading"
            style="width:100%"
          >
            <el-option
              v-for="s in songOptions"
              :key="s.id"
              :label="`${s.title}${s.singer ? ' - ' + s.singer : ''}`"
              :value="s.id"
            />
          </el-select>
        </div>
        <div class="field">
          <label>广告链接（可为空）</label>
          <el-input v-model="editing.ad_url" placeholder="https://..." />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button class="ghost-btn" @click="editing=null">取消</button>
          <button class="primary-btn" @click="save">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { adminBanners, adminCreateBanner, adminUpdateBanner, adminDeleteBanner, adminUploadBannerImage, adminListSongs } from '../../api/endpoints';

const banners = ref([]);
const editing = ref(null);
const songOptions = ref([]);
const songLoading = ref(false);

async function reload() { banners.value = (await adminBanners()) || []; }

async function searchSongs(keyword) {
  songLoading.value = true;
  try {
    const r = await adminListSongs({ keyword, limit: 30 });
    let list = (r && r.list) || [];
    if (editing.value && editing.value.song_id) {
      const has = list.find(s => s.id === editing.value.song_id);
      if (!has) list = [{ id: editing.value.song_id, title: `歌曲#${editing.value.song_id}`, singer: '' }, ...list];
    }
    songOptions.value = list;
  } catch (e) {
    songOptions.value = [];
  } finally {
    songLoading.value = false;
  }
}

function songTitle(id) {
  const s = songOptions.value.find(x => x.id === id);
  return s ? s.title : `#${id}`;
}

onMounted(() => { reload(); searchSongs(''); });

function createBanner() { editing.value = { id: null, title: '新横幅', link: '', song_id: null, ad_url: '' }; }
function edit(b) {
  editing.value = { ...b, song_id: b.song_id || null, ad_url: b.ad_url || '' };
  if (b.song_id && !songOptions.value.find(s => s.id === b.song_id)) {
    songOptions.value = [{ id: b.song_id, title: `歌曲#${b.song_id}`, singer: '' }, ...songOptions.value];
  }
}

async function save() {
  try {
    if (editing.value.id) await adminUpdateBanner(editing.value.id, editing.value);
    else await adminCreateBanner(editing.value);
    editing.value = null; reload();
  } catch (e) { ElMessage.error(e.message); }
}

async function uploadImage(b) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async () => {
    if (!input.files[0]) return;
    try {
      const fd = new FormData(); fd.append('file', input.files[0]);
      await adminUploadBannerImage(b.id, fd); reload();
    } catch (e) { ElMessage.error('上传失败: ' + e.message); }
  };
  input.click();
}

async function remove(b) {
  if (!confirm('确认删除此横幅?')) return;
  await adminDeleteBanner(b.id); reload();
}
</script>
