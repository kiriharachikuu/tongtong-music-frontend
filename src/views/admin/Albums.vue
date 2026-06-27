<template>
  <div class="admin-page">
    <!-- 头部：标题 + 创建按钮 -->
    <div class="page-header">
      <h2 class="page-title">专辑管理</h2>
      <button class="primary-btn create-btn" @click="openCreate">
        <Plus :size="16" />
        <span>创建专辑</span>
      </button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <Search :size="16" class="search-icon" />
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索专辑名或歌手..."
      />
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="state-box">
      <Loader :size="28" class="spin" />
      <span>加载中...</span>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!filteredAlbums.length" class="state-box">
      <Disc3 :size="44" />
      <span>{{ keyword.trim() ? '没有匹配的专辑' : '暂无专辑，点击右上角创建' }}</span>
    </div>

    <!-- 专辑网格 -->
    <div v-else class="albums-grid">
      <div v-for="album in filteredAlbums" :key="album.id" class="album-card">
        <!-- 封面区域（点击上传） -->
        <div class="cover-wrap" @click="triggerUpload(album)">
          <img
            v-if="showCover(album)"
            :src="coverUrl(album)"
            class="album-cover"
            alt="cover"
            @error="onCoverError(album)"
          />
          <div v-else class="cover-placeholder">
            <Disc3 :size="40" />
          </div>
          <!-- 悬浮上传提示 -->
          <div class="cover-overlay">
            <Upload :size="18" />
            <span>上传封面</span>
          </div>
          <!-- 上传中遮罩 -->
          <div v-if="uploadingId === album.id" class="cover-loading">
            <Loader :size="26" class="spin" />
          </div>
        </div>

        <!-- 信息 -->
        <div class="album-info">
          <div class="album-name" :title="album.name">{{ album.name }}</div>
          <div class="album-singer" :title="album.singer">{{ album.singer || '未知歌手' }}</div>
          <div class="album-meta">{{ album.song_count || 0 }} 首</div>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions">
          <button class="icon-btn" title="编辑" @click="openEdit(album)">
            <Edit3 :size="15" />
          </button>
          <button
            class="icon-btn"
            title="上传封面"
            :disabled="uploadingId === album.id"
            @click="triggerUpload(album)"
          >
            <Upload :size="15" />
          </button>
          <button class="icon-btn danger" title="删除" @click="remove(album)">
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </div>

    <!-- 隐藏的文件选择 input -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      style="display:none"
      @change="onFileChange"
    />

    <!-- 创建 / 编辑弹窗 -->
    <div v-if="dialog.visible" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">{{ dialog.id ? '编辑专辑' : '创建专辑' }}</h3>
          <button class="icon-btn" title="关闭" @click="closeDialog">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label>名称 <span class="required">*</span></label>
            <input
              v-model="dialog.name"
              placeholder="请输入专辑名称"
              maxlength="100"
            />
          </div>
          <div class="field">
            <label>歌手</label>
            <input
              v-model="dialog.singer"
              placeholder="请输入歌手名"
              maxlength="100"
            />
          </div>
          <div class="field">
            <label>简介</label>
            <textarea
              v-model="dialog.description"
              placeholder="请输入专辑简介（可选）"
              rows="3"
              maxlength="500"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="ghost-btn" :disabled="dialog.saving" @click="closeDialog">取消</button>
          <button
            class="primary-btn"
            :disabled="dialog.saving || !dialog.name.trim()"
            @click="submitDialog"
          >
            <Loader v-if="dialog.saving" :size="15" class="spin" />
            <span>{{ dialog.saving ? '保存中...' : '保存' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { Plus, Search, Edit3, Trash2, Upload, X, Disc3, Loader } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  adminListAlbums, adminCreateAlbum, adminUpdateAlbum,
  adminDeleteAlbum, adminUploadAlbumCover
} from '../../api/endpoints';

// 专辑列表与搜索状态
const albums = ref([]);
const keyword = ref('');
const loading = ref(false);
const uploadingId = ref(null);          // 当前正在上传封面的专辑 id
const fileInput = ref(null);            // 隐藏的文件 input 引用
const pendingUploadAlbum = ref(null);   // 待上传封面的专辑
const brokenCovers = ref(new Set());    // 封面加载失败的专辑 id 集合

// 创建 / 编辑弹窗状态
const dialog = reactive({
  visible: false,
  id: null,
  name: '',
  singer: '',
  description: '',
  saving: false,
});

// 前端即时过滤：按名称或歌手
const filteredAlbums = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return albums.value;
  return albums.value.filter(
    (a) =>
      (a.name || '').toLowerCase().includes(kw) ||
      (a.singer || '').toLowerCase().includes(kw)
  );
});

/**
 * 构造封面访问 URL
 * - s3 存储模式：后端返回完整可访问路径
 * - http 开头：直接使用
 * - 本地文件：拼接 /api/uploads/ 前缀，去掉 'uploads/'
 */
function coverUrl(album) {
  if (!album || !album.cover) return '';
  if (album.storage_mode === 's3' && album.cover_object_key) return album.cover;
  if (album.cover.startsWith('http')) return album.cover;
  let p = album.cover;
  if (p.startsWith('uploads/')) p = p.slice('uploads/'.length);
  return `/api/uploads/${p}`;
}

// 是否展示封面图片（排除加载失败的）
function showCover(album) {
  if (brokenCovers.value.has(album.id)) return false;
  return !!coverUrl(album);
}

// 封面加载失败：记录并回退到占位图
function onCoverError(album) {
  if (brokenCovers.value.has(album.id)) return;
  const next = new Set(brokenCovers.value);
  next.add(album.id);
  brokenCovers.value = next;
}

// 加载专辑列表
async function reload() {
  loading.value = true;
  try {
    const r = await adminListAlbums();
    // 兼容多种返回结构
    let list = [];
    if (Array.isArray(r)) list = r;
    else if (r && Array.isArray(r.data)) list = r.data;
    else if (r && Array.isArray(r.list)) list = r.list;
    albums.value = list;
  } catch (e) {
    ElMessage.error('加载专辑失败: ' + e.message);
  } finally {
    loading.value = false;
  }
}
onMounted(reload);

// 打开创建弹窗
function openCreate() {
  Object.assign(dialog, {
    visible: true,
    id: null,
    name: '',
    singer: '',
    description: '',
    saving: false,
  });
}

// 打开编辑弹窗（预填数据）
function openEdit(album) {
  Object.assign(dialog, {
    visible: true,
    id: album.id,
    name: album.name || '',
    singer: album.singer || '',
    description: album.description || '',
    saving: false,
  });
}

// 关闭弹窗
function closeDialog() {
  if (dialog.saving) return;
  dialog.visible = false;
}

// 提交创建 / 编辑
async function submitDialog() {
  if (!dialog.name.trim()) {
    ElMessage.warning('请输入专辑名称');
    return;
  }
  dialog.saving = true;
  const payload = {
    name: dialog.name.trim(),
    singer: dialog.singer.trim(),
    description: dialog.description.trim(),
  };
  try {
    if (dialog.id) {
      await adminUpdateAlbum(dialog.id, payload);
      ElMessage.success('专辑已更新');
    } else {
      await adminCreateAlbum(payload);
      ElMessage.success('专辑已创建');
    }
    dialog.visible = false;
    reload();
  } catch (e) {
    ElMessage.error('保存失败: ' + e.message);
  } finally {
    dialog.saving = false;
  }
}

// 触发封面文件选择
function triggerUpload(album) {
  if (uploadingId.value === album.id) return;
  pendingUploadAlbum.value = album;
  if (fileInput.value) {
    fileInput.value.value = '';
    fileInput.value.click();
  }
}

// 文件选择回调：上传封面
async function onFileChange(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !pendingUploadAlbum.value) return;
  const album = pendingUploadAlbum.value;
  pendingUploadAlbum.value = null;
  uploadingId.value = album.id;
  try {
    const fd = new FormData();
    fd.append('file', file);
    await adminUploadAlbumCover(album.id, fd);
    ElMessage.success('封面已上传');
    // 清除该专辑的失败标记
    if (brokenCovers.value.has(album.id)) {
      const next = new Set(brokenCovers.value);
      next.delete(album.id);
      brokenCovers.value = next;
    }
    reload();
  } catch (err) {
    ElMessage.error('上传封面失败: ' + err.message);
  } finally {
    uploadingId.value = null;
  }
}

// 删除专辑（带确认）
async function remove(album) {
  try {
    await ElMessageBox.confirm(
      `确认删除专辑《${album.name}》吗？此操作不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    );
  } catch {
    return; // 用户取消
  }
  try {
    await adminDeleteAlbum(album.id);
    ElMessage.success('专辑已删除');
    reload();
  } catch (e) {
    ElMessage.error('删除失败: ' + e.message);
  }
}
</script>

<style scoped>
/* ========== 页面容器 ========== */
.admin-page {
  min-height: 100%;
}

/* 头部：标题 + 操作按钮 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--am-text);
}
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

/* ========== 搜索栏 ========== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 420px;
  height: 44px;
  padding: 0 14px;
  margin-bottom: 18px;
  background: var(--am-bg-2);
  border: 1px solid transparent;
  border-radius: 12px;
  transition: border 0.2s var(--am-transition), background 0.2s var(--am-transition),
    box-shadow 0.2s var(--am-transition);
}
.search-bar:focus-within {
  border-color: var(--am-primary);
  background: var(--am-card);
  box-shadow: 0 0 0 3px rgba(139, 0, 255, 0.12);
}
.search-icon {
  color: var(--am-text-secondary);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--am-text);
  outline: none;
}

/* ========== 状态提示 ========== */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--am-text-secondary);
  font-size: 14px;
}

/* ========== 专辑网格 ========== */
.albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 18px;
}
.album-card {
  display: flex;
  flex-direction: column;
  background: var(--am-card);
  border: 1px solid var(--am-border);
  border-radius: 12px;
  padding: 14px;
  box-shadow: var(--am-shadow);
  transition: transform 0.25s var(--am-transition),
    box-shadow 0.25s var(--am-transition);
}
.album-card:hover {
  transform: translateY(-4px);
}

/* 封面区域 */
.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: var(--am-bg-2);
  cursor: pointer;
  box-shadow: var(--am-shadow);
}
.album-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--am-text-secondary);
  background: linear-gradient(135deg, var(--am-bg-2), var(--am-border));
}
/* 悬浮上传提示 */
.cover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s var(--am-transition);
}
.cover-wrap:hover .cover-overlay {
  opacity: 1;
}
/* 上传中遮罩 */
.cover-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
}

/* 信息区 */
.album-info {
  margin-top: 12px;
  min-width: 0;
}
.album-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--am-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.album-singer {
  margin-top: 3px;
  font-size: 13px;
  color: var(--am-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.album-meta {
  margin-top: 2px;
  font-size: 12px;
  color: var(--am-text-secondary);
}

/* 操作按钮区 */
.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--am-bg-2);
  color: var(--am-text-secondary);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition);
}
.icon-btn:hover {
  background: var(--am-border);
  color: var(--am-primary);
}
.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.icon-btn.danger:hover {
  color: #fa2d48;
  background: rgba(250, 45, 72, 0.1);
}

/* ========== 弹窗 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  z-index: 9999;
}
.modal-card {
  width: 100%;
  max-width: 460px;
  background: var(--am-card);
  border: 1px solid var(--am-border);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--am-border);
}
.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--am-text);
}
.modal-body {
  padding: 20px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--am-border);
}
.modal-footer .primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
}
.modal-footer .ghost-btn {
  min-height: 40px;
}

/* 表单字段（沿用全局 .field 布局，补充 textarea） */
.required {
  color: #fa2d48;
  margin-left: 2px;
}
.modal-body textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px 14px;
  border: 1px solid var(--am-border);
  border-radius: 12px;
  background: var(--am-bg-2);
  color: var(--am-text);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border 0.2s var(--am-transition);
  box-sizing: border-box;
}
.modal-body textarea:focus {
  border-color: var(--am-primary);
}

/* ========== 旋转动画 ========== */
.spin {
  animation: am-spin 0.8s linear infinite;
}
@keyframes am-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ========== 响应式 ========== */
@media (max-width: 600px) {
  .page-title {
    font-size: 19px;
  }
  .create-btn span {
    display: none;
  }
  .search-bar {
    max-width: none;
  }
}
</style>
