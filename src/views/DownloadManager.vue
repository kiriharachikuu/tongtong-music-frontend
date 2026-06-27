<template>
  <div class="download-page">
    <h1 class="title-1">下载管理</h1>

    <!-- 顶部说明卡片 -->
    <div class="info-card">
      <div class="info-icon" aria-hidden="true">
        <Info :size="22" />
      </div>
      <div class="info-body">
        <div class="info-title">下载说明</div>
        <p class="info-text">
          已下载的歌曲保存在系统下载目录,文件名格式:歌手-歌名.mp3。PWA 沙箱限制,无法在 App 内枚举设备文件,以下仅展示本次会话内的下载记录。
        </p>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <button class="ghost-btn action-btn" @click="openBrowserDownloads">
        <ExternalLink :size="16" />
        <span>打开浏览器下载页</span>
      </button>
      <button
        class="ghost-btn action-btn danger"
        :disabled="!history.length"
        @click="onClear"
      >
        <Trash2 :size="16" />
        <span>清空记录</span>
      </button>
      <div class="action-count">
        共 <strong>{{ history.length }}</strong> 条记录
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!history.length" class="empty-state">
      <FolderOpen :size="76" :stroke-width="1.2" />
      <div class="empty-text">暂无下载记录</div>
      <div class="empty-hint">下载歌曲后,记录会出现在这里</div>
    </div>

    <!-- 下载历史列表 -->
    <div v-else class="dl-table">
      <!-- 表头(桌面端) -->
      <div class="dl-head">
        <span class="col-cover"></span>
        <span class="col-title">歌曲</span>
        <span class="col-time">下载时间</span>
        <span class="col-action">操作</span>
      </div>

      <div v-for="item in history" :key="item.id" class="dl-row">
        <!-- 封面 -->
        <div class="col-cover">
          <img
            v-if="item.coverUrl && !coverErrors.has(item.id)"
            class="dl-cover"
            :src="item.coverUrl"
            :alt="item.title"
            loading="lazy"
            @error="onCoverError(item.id)"
          />
          <div v-else class="dl-cover dl-cover-fallback" aria-hidden="true">
            <Music :size="20" />
          </div>
        </div>

        <!-- 标题 + 演唱者 -->
        <div class="col-title">
          <div class="dl-title" :title="item.title">{{ item.title }}</div>
          <div class="dl-singer" :title="item.singer">{{ item.singer || '未知歌手' }}</div>
        </div>

        <!-- 下载时间 -->
        <div class="col-time">
          <span class="dl-time">{{ formatTime(item.downloadedAt) }}</span>
        </div>

        <!-- 重新下载 -->
        <div class="col-action">
          <button
            class="icon-action"
            title="重新下载"
            aria-label="重新下载"
            @click="onRedownload(item)"
          >
            <Download :size="18" />
            <span class="icon-action-label">下载</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Info, ExternalLink, Trash2, Download, FolderOpen, Music } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useDownloadStore } from '../stores/download';
import { getDownloadUrl } from '../api/endpoints';

const downloadStore = useDownloadStore();
const history = computed(() => downloadStore.history);

// 封面加载失败的记录集合
const coverErrors = ref(new Set());

// 格式化为 YYYY-MM-DD HH:mm
function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function onCoverError(id) {
  if (!coverErrors.value.has(id)) {
    coverErrors.value = new Set(coverErrors.value).add(id);
  }
}

// 打开浏览器下载页
function openBrowserDownloads() {
  let win = null;
  try {
    win = window.open('chrome://downloads/', '_blank');
  } catch {
    win = null;
  }
  // 大多数浏览器出于安全会拦截 chrome:// 协议,window.open 返回 null
  if (!win) {
    ElMessage.warning('请手动打开浏览器下载页查看');
  }
}

// 清空记录(二次确认)
async function onClear() {
  if (!history.value.length) return;
  try {
    await ElMessageBox.confirm(
      '确认清空所有下载记录吗?此操作仅清除本会话记录,不会删除已下载的文件。',
      '清空确认',
      {
        type: 'warning',
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      }
    );
  } catch {
    return; // 用户取消
  }
  downloadStore.clear();
  coverErrors.value = new Set();
  ElMessage.success('已清空下载记录');
}

// 重新下载:隐藏 a 标签触发 + 更新会话下载时间
function onRedownload(song) {
  const singer = song.singer || '未知歌手';
  const title = song.title || '未知歌曲';
  const fileName = `${singer}-${title}.mp3`;
  try {
    const a = document.createElement('a');
    a.href = getDownloadUrl(song.id);
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 更新会话下载记录时间(去重后置顶)
    downloadStore.record(song);
    ElMessage.success(`已开始下载:${fileName}`);
  } catch (e) {
    ElMessage.error('下载失败:' + (e && e.message ? e.message : '未知错误'));
  }
}
</script>

<style scoped>
.download-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ====== 顶部说明卡片 ====== */
.info-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  padding: 18px 20px;
  border: 1px solid var(--am-border);
}
.info-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 0, 255, 0.1);
  color: var(--am-primary);
}
.info-body { flex: 1; min-width: 0; }
.info-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--am-text);
  margin-bottom: 4px;
}
.info-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--am-text-secondary);
}

/* ====== 操作栏 ====== */
.action-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.action-btn.danger {
  color: #ff3b30;
}
.action-btn.danger:not(:disabled):hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}
.action-count {
  margin-left: auto;
  font-size: 13px;
  color: var(--am-text-secondary);
}
.action-count strong {
  color: var(--am-text);
  font-variant-numeric: tabular-nums;
}

/* ====== 空状态 ====== */
.empty-state {
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  padding: 64px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--am-text-secondary);
}
.empty-state svg {
  color: var(--am-text-secondary);
  opacity: 0.4;
}
.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--am-text);
}
.empty-hint {
  font-size: 13px;
  color: var(--am-text-secondary);
}

/* ====== 列表(桌面端表格布局) ====== */
.dl-table {
  background: var(--am-card);
  border-radius: var(--am-radius);
  box-shadow: var(--am-shadow);
  overflow: hidden;
}
.dl-head {
  display: grid;
  grid-template-columns: 64px 1fr 180px 120px;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--am-border);
  background: var(--am-bg-2);
  font-size: 12px;
  font-weight: 600;
  color: var(--am-text-secondary);
  letter-spacing: 0.3px;
}
.dl-row {
  display: grid;
  grid-template-columns: 64px 1fr 180px 120px;
  gap: 12px;
  padding: 12px 18px;
  align-items: center;
  border-bottom: 1px solid var(--am-border);
  transition: background 0.2s var(--am-transition);
}
.dl-row:last-child { border-bottom: none; }
.dl-row:hover { background: var(--am-bg-2); }

.col-cover { display: flex; align-items: center; }
.col-title { min-width: 0; }
.col-time { min-width: 0; }
.col-action { display: flex; justify-content: flex-end; }

.dl-cover {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  object-fit: cover;
  background: var(--am-bg-2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
.dl-cover-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--am-text-secondary);
}
.dl-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--am-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl-singer {
  font-size: 12px;
  color: var(--am-text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dl-time {
  font-size: 13px;
  color: var(--am-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* 重新下载按钮:触控目标 >= 44x44 */
.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 44px;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 12px;
  background: var(--am-bg-2);
  color: var(--am-primary);
  font-size: 13px;
  font-weight: 500;
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition), transform 0.15s ease;
}
.icon-action:hover {
  background: var(--am-primary);
  color: #fff;
}
.icon-action:active { transform: scale(0.96); }
.icon-action-label { display: none; }

/* ====== 移动端卡片布局 ====== */
@media (max-width: 767px) {
  .dl-head { display: none; }
  .dl-row {
    grid-template-columns: 56px 1fr auto;
    grid-template-areas:
      "cover title action"
      "cover time  action";
    gap: 2px 12px;
    padding: 14px 16px;
  }
  .col-cover { grid-area: cover; align-self: center; }
  .col-title { grid-area: title; }
  .col-time { grid-area: time; }
  .col-action { grid-area: action; align-self: center; }
  .dl-time { font-size: 12px; }
  .icon-action {
    padding: 0 12px;
  }
  .icon-action-label { display: inline; }
  .action-count {
    width: 100%;
    margin-left: 0;
    text-align: right;
  }
}
</style>
