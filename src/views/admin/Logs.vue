<template>
  <div>
    <h2 style="margin-top:0;">操作日志</h2>
    <el-form :inline="true" style="margin-bottom:14px;">
      <el-form-item label="操作类型">
        <el-select v-model="filter.action" placeholder="全部" clearable style="width:180px;" @change="applyFilter">
          <el-option label="全部" value="" />
          <el-option v-for="a in actionOptions" :key="a" :label="a" :value="a" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户">
        <el-select v-model="filter.user_id" placeholder="全部" clearable filterable style="width:200px;" @change="applyFilter">
          <el-option v-for="u in userOptions" :key="u.id" :label="u.username" :value="u.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="filter.range"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width:380px;"
          @change="applyFilter"
        />
      </el-form-item>
      <el-form-item>
        <button class="ghost-btn" type="button" @click="resetFilter">重置</button>
      </el-form-item>
    </el-form>
    <el-table :data="logs" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="user_id" label="用户 ID" width="100" />
      <el-table-column prop="action" label="动作" width="160" />
      <el-table-column prop="target_type" label="目标类型" width="120" />
      <el-table-column prop="target_id" label="目标 ID" width="100" />
      <el-table-column prop="detail" label="详情" />
      <el-table-column prop="created_at" label="时间" width="180" />
    </el-table>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { adminLogsFiltered, adminUsers } from '../../api/endpoints';
const logs = ref([]);
const actionOptions = ref([]);
const userOptions = ref([]);
const filter = reactive({ action: '', user_id: null, range: null });

async function loadLogs() {
  try {
    const params = {};
    if (filter.action) params.action = filter.action;
    if (filter.user_id) params.user_id = filter.user_id;
    if (filter.range && filter.range.length === 2) {
      params.from = filter.range[0];
      params.to = filter.range[1];
    }
    const r = await adminLogsFiltered(params);
    logs.value = (r && r.list) || (Array.isArray(r) ? r : []);
    // 从已有日志的 action 字段去重累积选项
    const actions = new Set(actionOptions.value);
    logs.value.forEach(l => { if (l.action) actions.add(l.action); });
    actionOptions.value = Array.from(actions);
  } catch (e) { logs.value = []; }
}

function applyFilter() { loadLogs(); }

function resetFilter() {
  filter.action = '';
  filter.user_id = null;
  filter.range = null;
  loadLogs();
}

async function loadUsers() {
  try {
    const r = await adminUsers();
    userOptions.value = (r && r.list) || (Array.isArray(r) ? r : []);
  } catch (e) { userOptions.value = []; }
}

onMounted(() => { loadLogs(); loadUsers(); });
</script>
