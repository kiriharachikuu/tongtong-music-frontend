<template>
  <div>
    <h2 style="margin-top:0;">本地 → 对象存储迁移</h2>
    <p style="color:var(--am-text-secondary);">将本地磁盘中的歌曲音频、封面、LRC 文件迁移到 S3 兼容对象存储。支持断点续传。</p>
    <div class="card" style="margin-bottom:16px;">
      <p><strong>状态：</strong>{{ status }}</p>
      <p><strong>进度：</strong>{{ done }} / {{ total }}</p>
      <div style="height:12px;background:var(--am-bg-2);border-radius:999px;overflow:hidden;">
        <div style="height:100%;background:var(--am-primary);width:{{ pct }}%;transition:width 0.3s;"></div>
      </div>
      <div style="margin-top:12px;">
        <button class="primary-btn" @click="start">开始迁移</button>
        <button class="ghost-btn" @click="load">刷新</button>
      </div>
    </div>
    <div v-if="log" class="card">
      <h3 style="margin-top:0;">日志</h3>
      <pre style="white-space:pre-wrap;">{{ log }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { adminMigrate, adminMigrateProgress } from '../../api/endpoints';

const done = ref(0);
const total = ref(0);
const status = ref('未开始');
const log = ref('');
const pct = computed(() => total.value ? Math.round((done.value / total.value) * 100) : 0);

async function load() {
  try {
    const r = await adminMigrateProgress();
    done.value = r.done || 0;
    total.value = r.total || 0;
    status.value = r.status || '未知';
    log.value = r.log || '';
  } catch (e) { log.value = e.message; }
}
onMounted(load);

async function start() {
  try {
    await adminMigrate();
    status.value = '已请求触发';
    const timer = setInterval(async () => {
      await load();
      if (done.value >= total.value && total.value > 0) clearInterval(timer);
    }, 2000);
  } catch (e) { log.value = e.message; }
}
</script>
