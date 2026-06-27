<template>
  <div>
    <h2 style="margin-top:0;">用户管理</h2>
    <el-table :data="users" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" width="160" />
      <el-table-column prop="is_admin" label="管理员" width="100">
        <template #default="scope"><Check v-if="scope.row.is_admin" :size="16" /></template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="play_count" label="播放记录数" width="110" align="center" />
      <el-table-column prop="favorite_count" label="收藏数" width="90" align="center" />
      <el-table-column prop="playlist_count" label="歌单数" width="90" align="center" />
      <el-table-column label="操作" width="100">
        <template #default="scope">
          <button v-if="!scope.row.is_admin" class="ghost-btn" style="color:#FA2D48;" @click="remove(scope.row)">删除</button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Check } from 'lucide-vue-next';
import { adminUsers, adminDeleteUser } from '../../api/endpoints';
const users = ref([]);
async function reload() { const r = await adminUsers(); users.value = (r && r.list) || []; }
onMounted(reload);
async function remove(u) {
  if (!confirm(`确认删除用户 ${u.username}?`)) return;
  await adminDeleteUser(u.id); reload();
}
</script>
