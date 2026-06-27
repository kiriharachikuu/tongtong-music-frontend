<template>
  <div class="admin-page">
    <!-- 头部:标题 + 发布按钮 -->
    <div class="page-header">
      <h2 class="page-title">版本管理</h2>
      <button class="primary-btn create-btn" @click="openCreate">
        <Plus :size="16" />
        <span>发布新版本</span>
      </button>
    </div>

    <!-- 发版流程说明 折叠面板 -->
    <div class="flow-panel">
      <button class="flow-header" @click="flowOpen = !flowOpen">
        <span class="flow-title">
          <Info :size="16" />
          <span>发版流程说明</span>
        </span>
        <ChevronDown
          :size="18"
          class="flow-chevron"
          :class="{ open: flowOpen }"
        />
      </button>
      <div v-show="flowOpen" class="flow-body">
        <ol class="flow-steps">
          <li>
            <span class="step-num">1</span>
            <div class="step-content">
              <strong>打包 APK</strong>
              <span>运行 <code>npm run build:android</code> 生成安装包</span>
            </div>
          </li>
          <li>
            <span class="step-num">2</span>
            <div class="step-content">
              <strong>上传 APK 到下载服务器</strong>
              <span>如 OSS / CDN,获取直链地址</span>
            </div>
          </li>
          <li>
            <span class="step-num">3</span>
            <div class="step-content">
              <strong>在本页填写版本信息</strong>
              <span>version_code 递增、version_name、download_url、changelog</span>
            </div>
          </li>
          <li>
            <span class="step-num">4</span>
            <div class="step-content">
              <strong>点击「发布新版本」按钮提交</strong>
              <span>新版本会自动设为 active,旧版本自动 deactive</span>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <!-- 版本表格 -->
    <div class="table-wrap" v-loading="loading">
      <el-table :data="versions" style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="version_code" label="版本号" width="90" />
        <el-table-column prop="version_name" label="版本名" width="110" />
        <el-table-column
          prop="download_url"
          label="下载链接"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="状态" width="110" align="center">
          <template #default="scope">
            <el-tag v-if="scope.row.is_active" type="success" size="small">
              当前版本
            </el-tag>
            <el-tag v-else type="info" size="small">已下线</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="scope">
            <span class="time-cell">{{ formatDate(scope.row.created_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="scope">
            <button
              class="icon-btn"
              title="编辑"
              @click="openEdit(scope.row)"
            >
              <Edit3 :size="15" />
            </button>
            <button
              class="icon-btn danger"
              title="删除"
              @click="remove(scope.row)"
            >
              <Trash2 :size="15" />
            </button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <Package :size="44" />
            <span>暂无版本记录,点击「发布新版本」创建第一个版本</span>
          </div>
        </template>
      </el-table>
    </div>

    <!-- 创建 / 编辑弹窗 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.id ? '编辑版本' : '发布新版本'"
      width="520px"
      :close-on-click-modal="false"
      append-to-body
      class="version-dialog"
    >
      <el-form
        ref="formRef"
        :model="dialog.form"
        :rules="rules"
        label-position="top"
        class="version-form"
      >
        <el-form-item label="版本号 (version_code)" prop="version_code">
          <el-input-number
            v-model="dialog.form.version_code"
            :min="1"
            :step="1"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-hint">整数,需大于当前最新版本</div>
        </el-form-item>

        <el-form-item label="版本名 (version_name)" prop="version_name">
          <el-input
            v-model="dialog.form.version_name"
            placeholder="如 1.2.0"
            maxlength="50"
          />
        </el-form-item>

        <el-form-item label="下载链接 (download_url)" prop="download_url">
          <el-input
            v-model="dialog.form.download_url"
            placeholder="APK 下载直链"
          />
        </el-form-item>

        <el-form-item label="更新日志 (changelog)">
          <el-input
            v-model="dialog.form.changelog"
            type="textarea"
            :rows="4"
            placeholder="每行一条更新日志"
          />
        </el-form-item>

        <el-form-item label="设为当前版本 (is_active)">
          <div class="switch-row">
            <el-switch v-model="dialog.form.is_active" />
            <span class="form-hint">
              开启后此版本设为最新,其他版本自动下线
            </span>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <button
            class="ghost-btn"
            :disabled="dialog.saving"
            @click="closeDialog"
          >
            取消
          </button>
          <button
            class="primary-btn save-btn"
            :disabled="dialog.saving"
            @click="submitDialog"
          >
            <Loader v-if="dialog.saving" :size="15" class="spin" />
            <span>{{ dialog.saving ? '保存中...' : '保存' }}</span>
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import {
  Plus,
  ChevronDown,
  Edit3,
  Trash2,
  Loader,
  Info,
  Package,
} from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  adminListVersions,
  adminCreateVersion,
  adminUpdateVersion,
  adminDeleteVersion,
} from '../../api/endpoints';

// 版本列表与状态
const versions = ref([]);
const loading = ref(false);
const flowOpen = ref(false); // 发版流程面板展开状态
const formRef = ref(null); // el-form 引用

// 创建 / 编辑弹窗
const dialog = reactive({
  visible: false,
  id: null,
  saving: false,
  form: {
    version_code: 1,
    version_name: '',
    download_url: '',
    changelog: '',
    is_active: true,
  },
});

// 表单校验规则
const rules = {
  version_code: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { type: 'number', message: '版本号必须为整数', trigger: 'blur' },
  ],
  version_name: [
    { required: true, message: '请输入版本名', trigger: 'blur' },
  ],
  download_url: [
    { required: true, message: '请输入下载链接', trigger: 'blur' },
  ],
};

// 格式化时间
function formatDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// 加载版本列表(兼容多种返回结构,按 version_code 倒序)
async function reload() {
  loading.value = true;
  try {
    const r = await adminListVersions();
    let list = [];
    if (Array.isArray(r)) list = r;
    else if (r && Array.isArray(r.data)) list = r.data;
    else if (r && Array.isArray(r.list)) list = r.list;
    list = list
      .slice()
      .sort((a, b) => (Number(b.version_code) || 0) - (Number(a.version_code) || 0));
    versions.value = list;
  } catch (e) {
    ElMessage.error('加载版本列表失败: ' + e.message);
  } finally {
    loading.value = false;
  }
}
onMounted(reload);

// 打开创建弹窗(自动建议下一个版本号)
function openCreate() {
  const maxCode = versions.value.reduce(
    (m, v) => Math.max(m, Number(v.version_code) || 0),
    0
  );
  Object.assign(dialog, {
    visible: true,
    id: null,
    saving: false,
    form: {
      version_code: maxCode + 1,
      version_name: '',
      download_url: '',
      changelog: '',
      is_active: true,
    },
  });
  if (formRef.value) formRef.value.clearValidate();
}

// 打开编辑弹窗(预填数据)
function openEdit(row) {
  Object.assign(dialog, {
    visible: true,
    id: row.id,
    saving: false,
    form: {
      version_code: Number(row.version_code) || 0,
      version_name: row.version_name || '',
      download_url: row.download_url || '',
      changelog: row.changelog || '',
      is_active: !!row.is_active,
    },
  });
  if (formRef.value) formRef.value.clearValidate();
}

// 关闭弹窗
function closeDialog() {
  if (dialog.saving) return;
  dialog.visible = false;
}

// 提交创建 / 编辑
async function submitDialog() {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return; // 校验未通过
  }
  dialog.saving = true;
  const payload = {
    version_code: Number(dialog.form.version_code),
    version_name: dialog.form.version_name.trim(),
    download_url: dialog.form.download_url.trim(),
    changelog: dialog.form.changelog,
    is_active: dialog.form.is_active,
  };
  try {
    if (dialog.id) {
      await adminUpdateVersion(dialog.id, payload);
      ElMessage.success('版本已更新');
    } else {
      await adminCreateVersion(payload);
      ElMessage.success('版本已发布');
    }
    dialog.visible = false;
    reload();
  } catch (e) {
    ElMessage.error('保存失败: ' + e.message);
  } finally {
    dialog.saving = false;
  }
}

// 删除版本(二次确认)
async function remove(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除版本 ${row.version_name} (v${row.version_code}) 吗?此操作不可恢复。`,
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
    await adminDeleteVersion(row.id);
    ElMessage.success('版本已删除');
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

/* 头部 */
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

/* ========== 发版流程说明 折叠面板 ========== */
.flow-panel {
  background: var(--am-card);
  border: 1px solid var(--am-border);
  border-radius: 14px;
  margin-bottom: 18px;
  overflow: hidden;
  box-shadow: var(--am-shadow);
}
.flow-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: var(--am-card);
  color: var(--am-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s var(--am-transition);
}
.flow-header:hover {
  background: var(--am-bg-2);
}
.flow-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--am-primary);
}
.flow-chevron {
  color: var(--am-text-secondary);
  transition: transform 0.3s var(--am-transition);
}
.flow-chevron.open {
  transform: rotate(180deg);
}
.flow-body {
  padding: 16px 18px 18px 18px;
  border-top: 1px solid var(--am-border);
}
.flow-steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.flow-steps li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.step-num {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--am-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: var(--am-text-secondary);
  line-height: 1.5;
}
.step-content strong {
  color: var(--am-text);
  font-weight: 600;
}
.step-content code {
  background: var(--am-bg-2);
  padding: 1px 6px;
  border-radius: 6px;
  font-family: "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--am-primary);
}

/* ========== 表格容器 ========== */
.table-wrap {
  background: var(--am-card);
  border-radius: 14px;
  border: 1px solid var(--am-border);
  box-shadow: var(--am-shadow);
  overflow: hidden;
  min-height: 200px;
  position: relative;
}
.time-cell {
  font-size: 13px;
  color: var(--am-text-secondary);
  font-variant-numeric: tabular-nums;
}

/* 表格内操作按钮 */
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
  margin-right: 6px;
  transition: background 0.2s var(--am-transition),
    color 0.2s var(--am-transition);
}
.icon-btn:last-child {
  margin-right: 0;
}
.icon-btn:hover {
  background: var(--am-border);
  color: var(--am-primary);
}
.icon-btn.danger:hover {
  color: #fa2d48;
  background: rgba(250, 45, 72, 0.1);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--am-text-secondary);
  font-size: 14px;
}

/* ========== 表单提示 ========== */
.form-hint {
  font-size: 12px;
  color: var(--am-text-secondary);
  line-height: 1.4;
}
.switch-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ========== 弹窗底部按钮 ========== */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--am-border);
}
.dialog-footer .primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
}
.dialog-footer .ghost-btn {
  min-height: 40px;
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

/* ========== Element Plus 样式适配 ========== */

/* el-dialog */
:deep(.version-dialog .el-dialog) {
  border-radius: 16px;
  background: var(--am-card);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  max-width: calc(100vw - 32px);
}
:deep(.version-dialog .el-dialog__header) {
  padding: 18px 20px;
  margin-right: 0;
  border-bottom: 1px solid var(--am-border);
}
:deep(.version-dialog .el-dialog__title) {
  font-size: 17px;
  font-weight: 700;
  color: var(--am-text);
}
:deep(.version-dialog .el-dialog__headerbtn) {
  top: 18px;
  right: 18px;
}
:deep(.version-dialog .el-dialog__body) {
  padding: 20px;
  color: var(--am-text);
}
:deep(.version-dialog .el-dialog__footer) {
  padding: 0;
}

/* el-table */
:deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--am-bg-2);
  --el-table-border-color: var(--am-border);
  --el-table-text-color: var(--am-text);
  --el-table-header-text-color: var(--am-text-secondary);
  background: transparent;
  color: var(--am-text);
}
:deep(.el-table th.el-table__cell) {
  background: var(--am-bg-2) !important;
  color: var(--am-text-secondary);
  font-weight: 600;
  font-size: 13px;
}
:deep(.el-table .el-table__cell) {
  border-bottom: 1px solid var(--am-border);
}
:deep(.el-table__row:hover > .el-table__cell) {
  background: var(--am-bg-2) !important;
}
:deep(.el-table__empty-block) {
  background: transparent;
}
:deep(.el-table__inner-wrapper::before) {
  background-color: var(--am-border);
}

/* el-form */
:deep(.el-form-item__label) {
  font-size: 13px;
  color: var(--am-text-secondary);
  font-weight: 500;
  padding-bottom: 4px;
  line-height: 1.4;
}
:deep(.el-form-item__error) {
  font-size: 12px;
}

/* el-input / el-textarea */
:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 12px;
  background: var(--am-bg-2);
  box-shadow: 0 0 0 1px var(--am-border) inset;
  transition: box-shadow 0.2s var(--am-transition);
}
:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--am-primary) inset;
}
:deep(.el-input__inner),
:deep(.el-textarea__inner) {
  color: var(--am-text);
}
:deep(.el-input__inner::placeholder),
:deep(.el-textarea__inner::placeholder) {
  color: var(--am-text-secondary);
  opacity: 0.7;
}

/* el-input-number */
:deep(.el-input-number .el-input__wrapper) {
  padding-left: 12px;
  padding-right: 38px;
}

/* el-switch */
:deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--am-primary);
  border-color: var(--am-primary);
}

/* el-tag */
:deep(.el-tag--success) {
  background: rgba(48, 209, 88, 0.12);
  color: #30d158;
  border-color: transparent;
  font-weight: 600;
}
:deep(.el-tag--info) {
  background: var(--am-bg-2);
  color: var(--am-text-secondary);
  border-color: var(--am-border);
}

/* ========== 响应式 ========== */
@media (max-width: 600px) {
  .page-title {
    font-size: 19px;
  }
  .create-btn span {
    display: none;
  }
}
</style>
