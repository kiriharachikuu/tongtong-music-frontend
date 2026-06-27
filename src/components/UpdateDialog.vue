<template>
  <Teleport to="body">
    <transition name="ud-fade">
      <div v-if="modelValue" class="ud-mask" @click.self="onMaskClick">
        <div
          class="ud-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ud-title"
        >
          <!-- 顶部：图标 + 标题 + 版本号 -->
          <div class="ud-head">
            <div class="ud-icon">
              <RefreshCw :size="26" />
            </div>
            <h2 id="ud-title" class="ud-title">发现新版本</h2>
            <div class="ud-version">v{{ version?.version_name || '—' }}</div>
          </div>

          <!-- 更新内容 -->
          <div class="ud-body">
            <div class="ud-label">更新内容</div>
            <pre class="ud-changelog">{{ version?.changelog || '暂无更新说明' }}</pre>
          </div>

          <!-- 底部操作 -->
          <div class="ud-actions">
            <button class="ud-btn ud-btn--ghost" @click="onIgnore">
              本次忽略
            </button>
            <button class="ud-btn ud-btn--primary" @click="onUpdate">
              <Download :size="16" />
              <span>立即更新</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { RefreshCw, Download } from 'lucide-vue-next';

const props = defineProps({
  // v-model 控制显隐
  modelValue: { type: Boolean, default: false },
  // 版本信息：{ version_code, version_name, download_url, changelog }
  version: { type: Object, default: () => ({}) }
});

const emit = defineEmits(['update:modelValue', 'close', 'confirm', 'ignore']);

function close() {
  emit('update:modelValue', false);
  emit('close');
}

// 弹窗不可点击遮罩关闭：强制用户做出选择，此处不执行任何操作
function onMaskClick() {
  /* no-op */
}

function onIgnore() {
  emit('ignore');
  close();
}

function onUpdate() {
  if (props.version?.download_url) {
    window.open(props.version.download_url, '_blank');
  }
  emit('confirm');
  close();
}
</script>

<style scoped>
.ud-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.ud-dialog {
  width: 100%;
  max-width: 420px;
  background: var(--am-card);
  border-radius: var(--am-radius-lg);
  box-shadow: var(--am-shadow);
  border: 1px solid var(--am-border);
  overflow: hidden;
  animation: ud-pop 0.32s var(--am-transition);
}

@keyframes ud-pop {
  from { transform: translateY(12px) scale(0.96); opacity: 0; }
  to   { transform: translateY(0) scale(1); opacity: 1; }
}

.ud-head {
  padding: 28px 28px 18px;
  text-align: center;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--am-primary) 12%, transparent),
    transparent 70%
  );
}

.ud-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  background: var(--am-primary);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--am-primary) 45%, transparent);
  animation: ud-spin 2.4s linear infinite;
}

@keyframes ud-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.ud-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: var(--am-text);
  letter-spacing: 0.5px;
}

.ud-version {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--am-primary);
  letter-spacing: 0.5px;
}

.ud-body {
  padding: 6px 28px 22px;
}

.ud-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--am-text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.ud-changelog {
  margin: 0;
  padding: 14px 16px;
  max-height: 220px;
  overflow: auto;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--am-text);
  background: var(--am-bg-2);
  border: 1px solid var(--am-border);
  border-radius: var(--am-radius-sm);
}

.ud-actions {
  display: flex;
  gap: 12px;
  padding: 0 28px 26px;
}

.ud-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  padding: 0 18px;
  border: none;
  border-radius: var(--am-radius-sm);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s var(--am-transition),
              background 0.18s var(--am-transition),
              opacity 0.18s var(--am-transition);
}

.ud-btn:active { transform: scale(0.97); }

.ud-btn--ghost {
  background: var(--am-bg-2);
  color: var(--am-text);
  border: 1px solid var(--am-border);
}

.ud-btn--ghost:hover {
  background: color-mix(in srgb, var(--am-bg-2) 60%, var(--am-border));
}

.ud-btn--primary {
  background: var(--am-primary);
  color: #fff;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--am-primary) 40%, transparent);
}

.ud-btn--primary:hover {
  background: var(--am-primary-hover);
}

/* 过渡 */
.ud-fade-enter-active,
.ud-fade-leave-active {
  transition: opacity 0.25s var(--am-transition);
}
.ud-fade-enter-from,
.ud-fade-leave-to {
  opacity: 0;
}
.ud-fade-enter-active .ud-dialog,
.ud-fade-leave-active .ud-dialog {
  transition: transform 0.25s var(--am-transition);
}
.ud-fade-enter-from .ud-dialog {
  transform: translateY(12px) scale(0.96);
}
.ud-fade-leave-to .ud-dialog {
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 480px) {
  .ud-mask { padding: 16px; }
  .ud-head { padding: 22px 22px 14px; }
  .ud-body { padding: 6px 22px 18px; }
  .ud-actions { padding: 0 22px 22px; gap: 10px; }
  .ud-version { font-size: 22px; }
}

/* 低端设备 / 减弱动画：关闭旋转与弹跳 */
:global(html.low-end) .ud-icon,
:global(.reduce-motion) .ud-icon {
  animation: none;
}
</style>
