<template>
  <el-dialog
    :model-value="modelValue"
    title="批量上传歌曲"
    :width="dialogWidth"
    :fullscreen="isMobile"
    :close-on-click-modal="false"
    append-to-body
    :before-close="handleBeforeClose"
    class="batch-upload-dialog"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <!-- 拖拽 + 选择文件 -->
    <div
      class="batch-dropzone"
      :class="{ 'is-active': dragActive }"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="handleDrop"
    >
      <Upload :size="36" class="batch-dropzone-icon" />
      <div class="batch-dropzone-title">拖拽音频文件到此处</div>
      <el-upload
        :show-file-list="false"
        :auto-upload="false"
        multiple
        accept="audio/*,.mp3,.wav,.flac,.m4a"
        :on-change="handleFileChange"
      >
        <button type="button" class="primary-btn batch-select-btn">选择文件</button>
      </el-upload>
      <div class="batch-dropzone-hint">支持 MP3 / WAV / FLAC / M4A,可多选,选择后自动解析元数据</div>
    </div>

    <!-- 总进度 -->
    <div v-if="files.length" class="batch-progress">
      <div class="batch-progress-head">
        <span>已完成 <b>{{ doneCount }}</b> / 总数 <b>{{ files.length }}</b></span>
        <span class="batch-progress-percent">{{ overallPercent }}%</span>
      </div>
      <el-progress :percentage="overallPercent" :show-text="false" :stroke-width="8" />
    </div>

    <!-- 文件列表 -->
    <div v-if="files.length" class="batch-list">
      <div v-for="item in files" :key="item.id" class="batch-item">
        <div class="batch-item-head">
          <span class="batch-item-name" :title="item.file.name">{{ item.file.name }}</span>
          <div class="batch-item-tools">
            <el-tag :type="statusTagType(item.status)" size="small" effect="light">
              {{ statusLabel(item.status) }}
            </el-tag>
            <button
              v-if="item.status === 'failed'"
              class="batch-icon-btn"
              type="button"
              title="重试"
              :disabled="uploading"
              @click="retryItem(item)"
            >
              <RefreshCw :size="16" />
            </button>
            <button
              class="batch-icon-btn"
              type="button"
              title="移除"
              :disabled="uploading || item.status === 'uploading' || item.status === 'probing'"
              @click="removeItem(item)"
            >
              <X :size="16" />
            </button>
          </div>
        </div>
        <div class="batch-item-fields">
          <el-input v-model="item.title" size="small" placeholder="歌名" :disabled="isLocked(item)" />
          <el-input v-model="item.artist" size="small" placeholder="演唱者" :disabled="isLocked(item)" />
          <el-input v-model="item.original_singer" size="small" placeholder="原唱" :disabled="isLocked(item)" />
          <el-input v-model="item.year" size="small" placeholder="日期" :disabled="isLocked(item)" />
        </div>
        <el-progress
          v-if="item.status === 'probing' || item.status === 'uploading'"
          :percentage="item.progress"
          :show-text="false"
          :stroke-width="3"
          class="batch-item-progress"
        />
        <div v-if="item.error" class="batch-item-error">{{ item.error }}</div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="batch-empty">暂无文件,请选择或拖入音频文件</div>

    <template #footer>
      <div class="batch-footer">
        <button class="ghost-btn" type="button" @click="handleCancel">取消</button>
        <button
          class="primary-btn"
          type="button"
          :disabled="!canStart"
          @click="startUpload"
        >
          {{ uploading ? '上传中…' : '开始上传' }}
        </button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Upload, X, RefreshCw } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  adminProbeAudio,
  adminCreateSong,
  adminUploadSongAudio,
} from '../../api/endpoints';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'success']);

const ACCEPTED_EXT = ['mp3', 'wav', 'flac', 'm4a'];
const STATUS_LABEL = {
  waiting: '等待',
  probing: '探测中',
  uploading: '上传中',
  done: '完成',
  failed: '失败',
};
const STATUS_TAG = {
  waiting: 'info',
  probing: 'primary',
  uploading: 'warning',
  done: 'success',
  failed: 'danger',
};

let idSeq = 0;
const files = ref([]);
const uploading = ref(false);
const dragActive = ref(false);
const isMobile = ref(false);

const probeQueue = [];
let probeRunning = false;

const dialogWidth = computed(() => (isMobile.value ? '100%' : '800px'));
const doneCount = computed(() => files.value.filter((f) => f.status === 'done').length);
const overallPercent = computed(() => {
  if (!files.value.length) return 0;
  return Math.round((doneCount.value / files.value.length) * 100);
});
const canStart = computed(
  () =>
    !uploading.value &&
    files.value.some((f) => f.status === 'waiting') &&
    !files.value.some((f) => f.status === 'probing')
);

function statusTagType(s) {
  return STATUS_TAG[s] || 'info';
}
function statusLabel(s) {
  return STATUS_LABEL[s] || '等待';
}
function isLocked(item) {
  return item.status === 'uploading' || item.status === 'probing';
}

function isAudio(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('audio/')) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ACCEPTED_EXT.includes(ext);
}

function onResize() {
  isMobile.value = window.innerWidth < 768;
}
onMounted(() => {
  onResize();
  window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => window.removeEventListener('resize', onResize));

function addFiles(fileList) {
  let added = 0;
  for (const f of fileList) {
    if (!isAudio(f)) {
      ElMessage.warning(`不支持的文件格式: ${f.name}`);
      continue;
    }
    const exists = files.value.some(
      (x) =>
        x.file.name === f.name &&
        x.file.size === f.size &&
        x.file.lastModified === f.lastModified
    );
    if (exists) continue;
    files.value.push({
      id: ++idSeq,
      file: f,
      title: '',
      artist: '',
      original_singer: '',
      year: '',
      status: 'waiting',
      progress: 0,
      tempToken: '',
      tempFileName: '',
      error: '',
    });
    added++;
  }
  if (added > 0) {
    const startIdx = files.value.length - added;
    for (let i = startIdx; i < files.value.length; i++) {
      enqueueProbe(files.value[i]);
    }
  }
}

function handleFileChange(file) {
  if (file && file.raw) addFiles([file.raw]);
}

function handleDrop(e) {
  dragActive.value = false;
  const list = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
  if (list.length) addFiles(list);
}

function enqueueProbe(item) {
  probeQueue.push(item);
  runProbeQueue();
}

async function runProbeQueue() {
  if (probeRunning) return;
  probeRunning = true;
  while (probeQueue.length) {
    const item = probeQueue.shift();
    if (!files.value.includes(item)) continue;
    if (item.status === 'done' || item.status === 'uploading') continue;
    item.status = 'probing';
    item.progress = 0;
    item.error = '';
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      const r = await adminProbeAudio(fd, (p) => {
        item.progress = p;
      });
      const meta = (r && r.metadata) || {};
      if (meta.title) item.title = meta.title;
      if (meta.artist) item.artist = meta.artist;
      if (meta.original_singer) item.original_singer = meta.original_singer;
      if (meta.year !== undefined && meta.year !== null && meta.year !== '') {
        item.year = String(meta.year);
      }
      item.tempToken = r.tempToken || '';
      item.tempFileName = r.tempFileName || '';
      item.status = 'waiting';
      item.progress = 100;
    } catch (e) {
      item.status = 'failed';
      item.error = (e && e.message) || '元数据解析失败';
    }
  }
  probeRunning = false;
}

function removeItem(item) {
  const idx = files.value.indexOf(item);
  if (idx >= 0) files.value.splice(idx, 1);
}

async function uploadSingle(item) {
  item.status = 'uploading';
  item.progress = 0;
  item.error = '';
  try {
    const payload = {
      title: (item.title || '').trim() || item.file.name,
      singer: (item.artist || '').trim(),
      original_singer: (item.original_singer || '').trim(),
      year: item.year ? parseInt(item.year, 10) || 0 : 0,
    };
    const r = await adminCreateSong(payload);
    const songId = r && (r.id || (r.data && r.data.id));
    if (!songId) throw new Error('创建歌曲失败');
    const fd = new FormData();
    await adminUploadSongAudio(
      songId,
      fd,
      (p) => {
        item.progress = p;
      },
      item.tempToken,
      item.tempFileName
    );
    item.status = 'done';
    item.progress = 100;
    return true;
  } catch (e) {
    item.status = 'failed';
    item.error = (e && e.message) || '上传失败';
    return false;
  }
}

function maybeFinish() {
  if (files.value.length && files.value.every((f) => f.status === 'done')) {
    ElMessage.success('批量上传完成');
    emit('success');
    resetState();
    emit('update:modelValue', false);
    return true;
  }
  return false;
}

async function startUpload() {
  if (!canStart.value) return;
  const toUpload = files.value.filter((f) => f.status === 'waiting');
  if (!toUpload.length) {
    ElMessage.info('没有可上传的文件');
    return;
  }
  const notProbed = toUpload.filter((f) => !f.tempToken);
  if (notProbed.length) {
    ElMessage.warning('部分文件尚未完成探测,请稍候');
    return;
  }
  uploading.value = true;
  try {
    for (const item of toUpload) {
      await uploadSingle(item);
    }
  } finally {
    uploading.value = false;
  }
  if (!maybeFinish()) {
    ElMessage.warning('部分文件上传失败,可点击重试');
  }
}

async function retryItem(item) {
  if (uploading.value) {
    ElMessage.warning('当前有上传任务进行中,请稍候');
    return;
  }
  if (!files.value.includes(item)) return;
  // 尚未探测成功 -> 先重新探测
  if (!item.tempToken) {
    item.status = 'probing';
    item.progress = 0;
    item.error = '';
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      const r = await adminProbeAudio(fd, (p) => {
        item.progress = p;
      });
      const meta = (r && r.metadata) || {};
      if (meta.title) item.title = meta.title;
      if (meta.artist) item.artist = meta.artist;
      if (meta.original_singer) item.original_singer = meta.original_singer;
      if (meta.year !== undefined && meta.year !== null && meta.year !== '') {
        item.year = String(meta.year);
      }
      item.tempToken = r.tempToken || '';
      item.tempFileName = r.tempFileName || '';
      item.status = 'waiting';
      item.progress = 100;
      ElMessage.success(`${item.file.name} 重新解析成功`);
    } catch (e) {
      item.status = 'failed';
      item.error = (e && e.message) || '元数据解析失败';
      ElMessage.error('重新解析失败');
      return;
    }
  }
  // 重新上传
  uploading.value = true;
  try {
    await uploadSingle(item);
  } finally {
    uploading.value = false;
  }
  if (!maybeFinish()) {
    if (item.status === 'done') ElMessage.success(`${item.file.name} 上传成功`);
    else ElMessage.error(`${item.file.name} 上传失败`);
  }
}

function resetState() {
  files.value = [];
  probeQueue.length = 0;
  uploading.value = false;
}

function requestClose(done) {
  const doClose = () => {
    resetState();
    if (typeof done === 'function') done();
    else emit('update:modelValue', false);
  };
  if (uploading.value) {
    ElMessageBox.confirm('有上传任务正在进行,确认取消并关闭?', '提示', {
      type: 'warning',
      confirmButtonText: '确认关闭',
      cancelButtonText: '继续',
    })
      .then(doClose)
      .catch(() => {});
    return;
  }
  if (files.value.some((f) => f.status === 'probing')) {
    ElMessageBox.confirm('仍有文件正在探测,确认关闭?', '提示', {
      type: 'warning',
      confirmButtonText: '确认关闭',
      cancelButtonText: '继续',
    })
      .then(doClose)
      .catch(() => {});
    return;
  }
  doClose();
}

function handleBeforeClose(done) {
  requestClose(done);
}
function handleCancel() {
  requestClose(null);
}
</script>

<style scoped>
.batch-upload-dialog :deep(.el-dialog__body) {
  padding-top: 12px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

/* 拖拽区 */
.batch-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  border: 2px dashed var(--am-border);
  border-radius: var(--am-radius-sm);
  background: var(--am-bg-2);
  color: var(--am-text-secondary);
  text-align: center;
  transition: border-color 0.2s var(--am-transition), background 0.2s var(--am-transition);
}
.batch-dropzone.is-active {
  border-color: var(--am-primary);
  background: rgba(139, 0, 255, 0.06);
}
.batch-dropzone-icon {
  color: var(--am-primary);
}
.batch-dropzone-title {
  font-size: 14px;
  color: var(--am-text);
  font-weight: 500;
}
.batch-select-btn {
  min-height: 44px;
  margin-top: 4px;
}
.batch-dropzone-hint {
  font-size: 12px;
  color: var(--am-text-secondary);
}

/* 总进度 */
.batch-progress {
  margin-top: 16px;
}
.batch-progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--am-text-secondary);
  margin-bottom: 6px;
}
.batch-progress-head b {
  color: var(--am-text);
  font-weight: 600;
}
.batch-progress-percent {
  font-variant-numeric: tabular-nums;
  color: var(--am-primary);
  font-weight: 600;
}
.batch-progress :deep(.el-progress-bar__inner) {
  background-color: var(--am-primary);
}

/* 文件列表 */
.batch-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.batch-item {
  border: 1px solid var(--am-border);
  border-radius: var(--am-radius-sm);
  padding: 10px 12px;
  background: var(--am-card);
}
.batch-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.batch-item-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--am-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.batch-item-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.batch-item-fields {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.batch-item-progress {
  margin-top: 8px;
}
.batch-item-progress :deep(.el-progress-bar__inner) {
  background-color: var(--am-primary);
}
.batch-item-error {
  margin-top: 6px;
  font-size: 12px;
  color: #f56c6c;
}

/* 图标按钮 */
.batch-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--am-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition), border-color 0.2s var(--am-transition);
}
.batch-icon-btn:hover:not(:disabled) {
  background: var(--am-border);
  color: var(--am-primary);
  border-color: var(--am-border);
}
.batch-icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 空状态 */
.batch-empty {
  margin-top: 18px;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--am-text-secondary);
}

/* 底部 */
.batch-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}
.batch-footer .ghost-btn,
.batch-footer .primary-btn {
  min-height: 44px;
}

/* 移动端 */
@media (max-width: 767px) {
  .batch-item-fields {
    grid-template-columns: repeat(2, 1fr);
  }
  .batch-icon-btn {
    width: 44px;
    height: 44px;
  }
}
</style>
