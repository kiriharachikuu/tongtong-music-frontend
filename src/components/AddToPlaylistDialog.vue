<template>
  <el-dialog
    :model-value="modelValue"
    class="atpl-dialog"
    width="480px"
    :show-close="false"
    align-center
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <!-- 自定义头部 -->
    <template #header>
      <div class="atpl-header">
        <h3 class="atpl-title">加入歌单</h3>
        <button
          type="button"
          class="atpl-icon-btn"
          aria-label="关闭"
          @click="close"
        >
          <X :size="20" />
        </button>
      </div>
    </template>

    <!-- 内容区 -->
    <div
      v-loading="loading"
      element-loading-text="加载中..."
      class="atpl-body"
    >
      <!-- 新建歌单输入区 -->
      <div v-if="creating" class="atpl-create">
        <el-input
          ref="createInputRef"
          v-model="newPlaylistName"
          placeholder="输入歌单名称"
          maxlength="40"
          @keyup.enter="confirmCreate"
        />
        <el-button
          type="primary"
          :loading="createLoading"
          @click="confirmCreate"
        >创建</el-button>
        <el-button @click="cancelCreate">取消</el-button>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="!loading && playlists.length === 0"
        class="atpl-empty"
      >
        <ListMusic :size="40" />
        <p class="atpl-empty-title">还没有歌单</p>
        <p class="atpl-empty-hint">点击下方「新建歌单」创建第一个</p>
      </div>

      <!-- 歌单列表 -->
      <ul v-else class="atpl-list">
        <li
          v-for="pl in playlists"
          :key="pl.id"
          class="atpl-item"
          :class="{ 'is-selected': isSelected(pl.id) }"
          role="button"
          tabindex="0"
          @click="toggleSelect(pl.id)"
          @keydown.enter.prevent="toggleSelect(pl.id)"
          @keydown.space.prevent="toggleSelect(pl.id)"
        >
          <div class="atpl-cover">
            <img
              v-if="pl.cover"
              :src="pl.cover"
              :alt="pl.name"
              @error="onCoverError"
            />
            <div v-else class="atpl-cover-fallback">
              <Music :size="20" />
            </div>
          </div>
          <div class="atpl-meta">
            <div class="atpl-name">{{ pl.name }}</div>
            <div class="atpl-count">{{ pl.songCount || 0 }} 首</div>
          </div>
          <div class="atpl-check" :class="{ 'is-on': isSelected(pl.id) }">
            <Check v-if="isSelected(pl.id)" :size="22" />
          </div>
        </li>
      </ul>
    </div>

    <!-- 底部 -->
    <template #footer>
      <div class="atpl-footer">
        <button
          type="button"
          class="atpl-new-btn"
          :disabled="creating || loading"
          @click="startCreate"
        >
          <Plus :size="18" />
          <span>新建歌单</span>
        </button>
        <div class="atpl-actions">
          <el-button @click="close">取消</el-button>
          <el-button
            type="primary"
            :loading="submitting"
            :disabled="selectedIds.size === 0"
            @click="confirm"
          >确定</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Check, X, Music, ListMusic } from 'lucide-vue-next';
import {
  listPlaylists,
  createPlaylist,
  addSongToPlaylist,
} from '../api/endpoints';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  songIds: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue', 'success']);

const loading = ref(false);
const submitting = ref(false);
const creating = ref(false);
const createLoading = ref(false);
const playlists = ref([]);
const selectedIds = reactive(new Set());
const newPlaylistName = ref('');
const createInputRef = ref(null);

// 弹窗打开时重置状态并加载歌单列表
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      selectedIds.clear();
      creating.value = false;
      newPlaylistName.value = '';
      loadPlaylists();
    }
  }
);

async function loadPlaylists() {
  loading.value = true;
  try {
    const list = await listPlaylists();
    playlists.value = Array.isArray(list) ? list : [];
  } catch (e) {
    ElMessage.error('加载歌单失败：' + (e.message || '未知错误'));
    playlists.value = [];
  } finally {
    loading.value = false;
  }
}

function isSelected(id) {
  return selectedIds.has(id);
}

function toggleSelect(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
}

function startCreate() {
  creating.value = true;
  newPlaylistName.value = '';
  nextTick(() => {
    createInputRef.value?.focus?.();
  });
}

function cancelCreate() {
  creating.value = false;
  newPlaylistName.value = '';
}

async function confirmCreate() {
  const name = newPlaylistName.value.trim();
  if (!name) {
    ElMessage.warning('请输入歌单名称');
    return;
  }
  createLoading.value = true;
  try {
    const created = await createPlaylist({ name });
    if (created && created.id) {
      // 后端返回新歌单对象：加入候选列表并选中
      playlists.value.unshift({
        id: created.id,
        name: created.name || name,
        cover: created.cover || '',
        songCount: created.songCount || 0,
      });
      selectedIds.add(created.id);
    } else {
      // 后端未返回对象：重新拉取列表
      await loadPlaylists();
    }
    ElMessage.success('歌单已创建');
    creating.value = false;
    newPlaylistName.value = '';
  } catch (e) {
    ElMessage.error('创建失败：' + (e.message || '未知错误'));
  } finally {
    createLoading.value = false;
  }
}

async function confirm() {
  if (selectedIds.size === 0) {
    ElMessage.warning('请选择至少一个歌单');
    return;
  }
  if (!props.songIds || props.songIds.length === 0) {
    ElMessage.warning('未选择要加入的歌曲');
    return;
  }
  submitting.value = true;
  const ids = Array.from(selectedIds);
  const songIds = [...props.songIds];

  // 并发加入所有选中歌单；单个失败不中断其他
  const results = await Promise.allSettled(
    ids.map((pid) => addSongToPlaylist(pid, songIds))
  );

  let okCount = 0;
  let failCount = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      okCount++;
    } else {
      failCount++;
      const pl = playlists.value.find((p) => p.id === ids[i]);
      const plName = pl ? pl.name : '歌单';
      ElMessage.error(`加入「${plName}」失败：${r.reason?.message || '未知错误'}`);
    }
  });

  submitting.value = false;

  if (okCount > 0) {
    ElMessage.success(`已加入 ${okCount} 个歌单`);
    emit('success');
    close();
  }
}

function close() {
  emit('update:modelValue', false);
}

function onCoverError(e) {
  e.target.style.display = 'none';
}
</script>

<style scoped>
/* ============ 头部 ============ */
.atpl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 12px;
}
.atpl-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--am-text);
  letter-spacing: 0.2px;
}
.atpl-icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--am-text-secondary);
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition);
}
.atpl-icon-btn:hover {
  background: var(--am-bg-2);
  color: var(--am-text);
}

/* ============ 内容区 ============ */
.atpl-body {
  min-height: 220px;
  max-height: 56vh;
  overflow-y: auto;
  padding: 4px 12px 12px;
}

/* 新建歌单输入区 */
.atpl-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 14px;
}

/* 空状态 */
.atpl-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--am-text-secondary);
  text-align: center;
  gap: 6px;
}
.atpl-empty-title {
  margin: 8px 0 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--am-text);
}
.atpl-empty-hint {
  margin: 0;
  font-size: 12px;
  opacity: 0.75;
}

/* 歌单列表 */
.atpl-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.atpl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--am-radius-sm);
  cursor: pointer;
  transition: background 0.18s var(--am-transition);
  outline: none;
  min-height: 60px;
}
.atpl-item:hover,
.atpl-item:focus-visible {
  background: var(--am-bg-2);
}
.atpl-item.is-selected {
  background: rgba(139, 0, 255, 0.08);
}
.atpl-item.is-selected .atpl-check {
  color: var(--am-primary);
}

.atpl-cover {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--am-bg-2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.atpl-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.atpl-cover-fallback {
  color: var(--am-text-secondary);
}

.atpl-meta {
  flex: 1;
  min-width: 0;
}
.atpl-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--am-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atpl-count {
  font-size: 12px;
  color: var(--am-text-secondary);
  margin-top: 2px;
}

.atpl-check {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--am-primary);
}

/* ============ 底部 ============ */
.atpl-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--am-border);
}
.atpl-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--am-bg-2);
  color: var(--am-primary);
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s var(--am-transition), transform 0.15s var(--am-transition);
}
.atpl-new-btn:hover:not(:disabled) {
  background: var(--am-border);
}
.atpl-new-btn:active:not(:disabled) {
  transform: scale(0.96);
}
.atpl-new-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.atpl-actions {
  display: flex;
  gap: 8px;
}

/* ============ 移动端：触控目标放大 ============ */
@media (max-width: 767px) {
  .atpl-header {
    padding: 16px 16px 8px;
  }
  .atpl-title {
    font-size: 16px;
  }
  .atpl-icon-btn {
    width: 44px;
    height: 44px;
  }
  .atpl-body {
    padding: 4px 8px 8px;
    max-height: 50vh;
  }
  .atpl-item {
    min-height: 64px;
    padding: 10px;
  }
  .atpl-cover {
    width: 52px;
    height: 52px;
  }
  .atpl-check {
    width: 32px;
    height: 32px;
  }
  .atpl-new-btn {
    height: 44px;
    padding: 0 16px;
  }
  .atpl-footer {
    padding: 12px 12px calc(16px + env(safe-area-inset-bottom, 0px));
  }
}
</style>

<style>
/* ============ el-dialog 包装器覆盖（teleport 到 body，需用全局样式） ============ */
.atpl-dialog.el-dialog {
  border-radius: var(--am-radius-lg);
  background: var(--am-card);
  box-shadow: var(--am-shadow);
  overflow: hidden;
}
.atpl-dialog .el-dialog__header {
  padding: 0;
  margin: 0;
  margin-right: 0;
}
.atpl-dialog .el-dialog__headerbtn {
  display: none;
}
.atpl-dialog .el-dialog__body {
  padding: 0;
  color: var(--am-text);
}
.atpl-dialog .el-dialog__footer {
  padding: 0;
}

/* loading 遮罩主题适配 */
.atpl-dialog .el-loading-mask {
  border-radius: 0;
  background: rgba(255, 255, 255, 0.75);
}
.atpl-dialog .el-loading-spinner .el-loading-text {
  color: var(--am-text-secondary);
}
.atpl-dialog .el-loading-spinner .path {
  stroke: var(--am-primary);
}
[data-theme='dark'] .atpl-dialog .el-loading-mask {
  background: rgba(28, 28, 30, 0.75);
}
@media (prefers-color-scheme: dark) {
  [data-theme='light'] .atpl-dialog .el-loading-mask {
    background: rgba(255, 255, 255, 0.75);
  }
  :root:not([data-theme='light']) .atpl-dialog .el-loading-mask {
    background: rgba(28, 28, 30, 0.75);
  }
}

/* Element Plus 按钮主题适配 */
.atpl-dialog .el-button--primary {
  background-color: var(--am-primary);
  border-color: var(--am-primary);
}
.atpl-dialog .el-button--primary:hover,
.atpl-dialog .el-button--primary:focus {
  background-color: var(--am-primary-hover);
  border-color: var(--am-primary-hover);
}

/* ============ 移动端：底部抽屉样式 ============ */
@media (max-width: 767px) {
  .el-overlay-dialog:has(.atpl-dialog) {
    align-items: flex-end !important;
  }
  .atpl-dialog.el-dialog {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    align-self: flex-end;
    border-radius: var(--am-radius-lg) var(--am-radius-lg) 0 0;
    max-height: 92vh;
  }
}
</style>
