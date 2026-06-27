<template>
  <div class="admin-page">
    <h2 style="margin-top:0;">存储配置</h2>

    <!-- 当前存储状态 -->
    <div class="card">
      <div class="storage-status">
        <div>
          <span class="label">当前模式：</span>
          <span class="value">{{ config.mode || 'unknown' }}</span>
        </div>
        <button class="primary-btn" @click="test">测试连接</button>
      </div>
      <div v-if="msg" class="test-result">测试结果：{{ msg }}</div>
    </div>

    <!-- 环境变量编辑 -->
    <div class="card" style="margin-top:16px;">
      <div class="env-header">
        <h3>环境变量配置（.env）</h3>
        <button class="primary-btn" @click="saveEnv" :disabled="envSaving">
          <Loader v-if="envSaving" :size="14" style="animation:spin 1s linear infinite;" />
          {{ envSaving ? '保存中…' : '保存配置' }}
        </button>
      </div>
      <p class="env-tip">修改后需重启后端服务才能完全生效。敏感信息（如密钥）请谨慎填写。</p>

      <div v-if="envLoading" class="env-loading">加载中…</div>

      <div v-else>
        <div v-for="(section, si) in envSections" :key="si" class="env-section">
          <!-- 分组注释 -->
          <div v-if="section.comment" class="env-section-comment">
            <pre>{{ section.comment }}</pre>
          </div>
          <!-- 配置项 -->
          <div v-if="section.items && section.items.length" class="env-items">
            <div v-for="item in section.items" :key="item.key" class="env-item">
              <label class="env-key">{{ item.key }}</label>
              <input
                v-model="envUpdates[item.key]"
                :type="isSensitive(item.key) ? 'password' : 'text'"
                :placeholder="item.value || '(空)'"
                class="env-input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { Loader } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { adminStorageTest, adminGetEnv, adminSaveEnv } from '../../api/endpoints';

const config = ref({ mode: 'unknown' });
const msg = ref('');
const envSections = ref([]);
const envUpdates = reactive({});
const envLoading = ref(false);
const envSaving = ref(false);

// 敏感字段：显示为密码框
const SENSITIVE_KEYS = ['JWT_SECRET', 'ADMIN_PASSWORD', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
function isSensitive(key) { return SENSITIVE_KEYS.includes(key); }

onMounted(async () => {
  // 测试当前存储连接
  try {
    const r = await adminStorageTest();
    config.value = { mode: r.storage_mode || r.mode };
    msg.value = r.message || 'OK';
  } catch (e) { msg.value = e.message; }

  // 加载环境变量
  await loadEnv();
});

async function loadEnv() {
  envLoading.value = true;
  try {
    const r = await adminGetEnv();
    envSections.value = r.sections || [];
    // 初始化更新表单
    for (const section of envSections.value) {
      if (section.items) {
        for (const item of section.items) {
          envUpdates[item.key] = item.value;
        }
      }
    }
  } catch (e) {
    ElMessage.error('加载环境变量失败：' + e.message);
  } finally {
    envLoading.value = false;
  }
}

async function saveEnv() {
  envSaving.value = true;
  try {
    const r = await adminSaveEnv(envUpdates);
    ElMessage.success(r.message || '配置已保存');
  } catch (e) {
    ElMessage.error('保存失败：' + e.message);
  } finally {
    envSaving.value = false;
  }
}

async function test() {
  try {
    const r = await adminStorageTest();
    msg.value = (r.message || 'OK') + ' · storage_mode=' + (r.storage_mode || r.mode);
  } catch (e) { msg.value = e.message; }
}
</script>

<style scoped>
.admin-page { max-width: 800px; }

.card {
  background: var(--am-card);
  border: 1px solid var(--am-border);
  border-radius: 12px;
  padding: 20px;
}

.storage-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.storage-status .label { color: var(--am-text-secondary); font-size: 14px; }
.storage-status .value { font-weight: 700; color: var(--am-primary); font-size: 16px; }
.test-result { margin-top: 12px; padding: 10px; background: var(--am-bg-2); border-radius: 8px; font-size: 13px; color: var(--am-text-secondary); }

.env-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.env-header h3 { margin: 0; font-size: 16px; color: var(--am-text); }
.env-tip { font-size: 12px; color: var(--am-text-secondary); margin: 0 0 16px; }

.env-loading { padding: 32px; text-align: center; color: var(--am-text-secondary); }

.env-section { margin-bottom: 20px; }
.env-section-comment pre {
  font-size: 12px;
  color: var(--am-text-secondary);
  margin: 0 0 8px;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.5;
}

.env-items { display: flex; flex-direction: column; gap: 10px; }
.env-item { display: flex; align-items: center; gap: 12px; }
.env-key {
  width: 180px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--am-text);
  font-family: 'SF Mono', 'Consolas', monospace;
}
.env-input {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--am-border);
  border-radius: 8px;
  background: var(--am-bg-2);
  color: var(--am-text);
  font-size: 13px;
  transition: border-color 0.2s ease;
}
.env-input:focus {
  outline: none;
  border-color: var(--am-primary);
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
