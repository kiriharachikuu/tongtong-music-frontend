<template>
  <Teleport to="body">
    <Transition name="tp-fade">
      <div
        v-if="modelValue"
        class="theme-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-title">
        <div class="tp-backdrop" @click="close"></div>

        <div class="tp-panel">
          <!-- 头部 -->
          <header class="tp-header">
            <h2 id="tp-title" class="tp-title">选择主题</h2>
            <button class="tp-icon-btn" type="button" @click="close" aria-label="关闭">
              <X :size="20" />
            </button>
          </header>

          <!-- 主题网格 -->
          <div class="tp-body">
            <div class="tp-grid">
              <button
                v-for="theme in themeStore.themes"
                :key="theme.id"
                type="button"
                class="tp-card"
                :class="{ 'is-active': theme.id === themeStore.current }"
                @click="selectTheme(theme.id)"
                :aria-label="`应用主题：${theme.name}`"
                :aria-pressed="theme.id === themeStore.current">
                <div class="tp-card-preview" :style="previewStyle(theme)">
                  <div class="tp-mini-player">
                    <div class="tp-mini-row">
                      <div class="tp-mini-cover"><span>Aa</span></div>
                      <div class="tp-mini-meta">
                        <div class="tp-mini-title">歌名</div>
                        <div class="tp-mini-artist">演唱者</div>
                      </div>
                    </div>
                    <div class="tp-mini-bar">
                      <div class="tp-mini-bar-fill"></div>
                    </div>
                  </div>
                  <span
                    v-if="theme.id === themeStore.current"
                    class="tp-check"
                    aria-hidden="true">
                    <Check :size="15" />
                  </span>
                </div>
                <div class="tp-card-name">{{ theme.name }}</div>
              </button>
            </div>
          </div>

          <!-- 底部 -->
          <footer class="tp-footer">
            <button class="tp-done-btn" type="button" @click="close">
              <Check :size="18" />
              <span>完成</span>
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue';
import { Check, X } from 'lucide-vue-next';
import { useThemeStore } from '../stores/theme';

const props = defineProps({
  modelValue: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue']);

const themeStore = useThemeStore();

function close() {
  emit('update:modelValue', false);
}

function selectTheme(id) {
  themeStore.apply(id);
}

/* ---- 颜色工具：根据主题主色生成预览样式 ---- */
function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function darken(hex, amount = 0.35) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  const toHex = (v) =>
    Math.max(0, Math.min(255, Math.round(v * f)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isLightColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62;
}

function previewStyle(theme) {
  const c = theme.color;
  const light = isLightColor(c);
  return {
    background: `linear-gradient(135deg, ${c} 0%, ${darken(c, 0.4)} 100%)`,
    '--tp-fg': light ? 'rgba(0,0,0,0.88)' : '#ffffff',
    '--tp-fg-soft': light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.82)',
    '--tp-card-bg': light ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.16)',
    '--tp-cover-bg': light ? 'rgba(20,20,22,0.85)' : 'rgba(255,255,255,0.96)',
    '--tp-cover-fg': light ? '#ffffff' : c,
    '--tp-track': light ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.28)',
    '--tp-track-fill': light ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)'
  };
}

/* ---- 弹窗开启时：锁定 body 滚动 + Esc 关闭 ---- */
function onKeydown(e) {
  if (e.key === 'Escape') close();
}

watch(
  () => props.modelValue,
  (val) => {
    if (typeof document === 'undefined') return;
    if (val) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeydown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeydown);
    }
  }
);

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.body.style.overflow = '';
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.theme-picker {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.tp-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px) saturate(1.4);
  -webkit-backdrop-filter: blur(8px) saturate(1.4);
}

.tp-panel {
  position: relative;
  z-index: 1;
  width: min(960px, 100%);
  max-height: min(86vh, 860px);
  display: flex;
  flex-direction: column;
  background: var(--am-bg);
  color: var(--am-text);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--am-border);
  overflow: hidden;
}

/* 头部 */
.tp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px 14px;
  border-bottom: 1px solid var(--am-border);
}
.tp-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: var(--am-text);
}
.tp-icon-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: var(--am-bg-2);
  color: var(--am-text);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease;
}
.tp-icon-btn:hover {
  background: var(--am-border);
  transform: scale(1.05);
}
.tp-icon-btn:active {
  transform: scale(0.96);
}

/* 主体 */
.tp-body {
  padding: 20px 24px 8px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.tp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

/* 卡片 */
.tp-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  border-radius: 16px;
  transition: transform 0.18s ease;
}
.tp-card:hover {
  transform: translateY(-3px);
}
.tp-card:active {
  transform: translateY(0) scale(0.98);
}
.tp-card:focus-visible {
  outline: none;
}
.tp-card:focus-visible .tp-card-preview {
  box-shadow: 0 0 0 3px var(--am-primary), 0 10px 28px rgba(0, 0, 0, 0.22);
}

.tp-card-preview {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 16px;
  overflow: hidden;
  padding: 14px;
  display: flex;
  align-items: flex-end;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  transition: box-shadow 0.2s ease;
}
.tp-card.is-active .tp-card-preview {
  box-shadow: 0 0 0 3px var(--am-primary), 0 10px 28px rgba(0, 0, 0, 0.22);
}

/* 迷你播放器 */
.tp-mini-player {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--tp-card-bg);
  backdrop-filter: blur(8px) saturate(1.4);
  -webkit-backdrop-filter: blur(8px) saturate(1.4);
  border-radius: 12px;
  padding: 9px 10px 10px;
}
.tp-mini-row {
  display: flex;
  align-items: center;
  gap: 9px;
}
.tp-mini-cover {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--tp-cover-bg);
  color: var(--tp-cover-fg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}
.tp-mini-meta {
  min-width: 0;
  flex: 1;
}
.tp-mini-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--tp-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tp-mini-artist {
  font-size: 10px;
  color: var(--tp-fg-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tp-mini-bar {
  height: 3px;
  border-radius: 3px;
  background: var(--tp-track);
  overflow: hidden;
}
.tp-mini-bar-fill {
  width: 38%;
  height: 100%;
  background: var(--tp-track-fill);
  border-radius: 3px;
}

/* 当前主题选中标记 */
.tp-check {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--am-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9), 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tp-card-name {
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  color: var(--am-text);
}
.tp-card.is-active .tp-card-name {
  color: var(--am-primary);
}

/* 底部 */
.tp-footer {
  padding: 14px 24px 22px;
  border-top: 1px solid var(--am-border);
  display: flex;
  justify-content: center;
}
.tp-done-btn {
  min-height: 44px;
  padding: 0 30px;
  border: none;
  border-radius: 980px;
  background: var(--am-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}
.tp-done-btn:hover {
  background: var(--am-primary-hover);
  transform: translateY(-1px);
}
.tp-done-btn:active {
  transform: translateY(0) scale(0.98);
}

/* 过渡动画 */
.tp-fade-enter-active,
.tp-fade-leave-active {
  transition: opacity 0.25s ease;
}
.tp-fade-enter-from,
.tp-fade-leave-to {
  opacity: 0;
}
.tp-fade-enter-active .tp-panel {
  animation: tp-pop-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.tp-fade-leave-active .tp-panel {
  animation: tp-pop-out 0.2s ease forwards;
}
@keyframes tp-pop-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes tp-pop-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
}
@keyframes tp-sheet-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes tp-sheet-down {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

/* 平板：2 列 */
@media (max-width: 1024px) {
  .tp-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
}

/* 移动端：1 列 + 底部抽屉式 */
@media (max-width: 767px) {
  .theme-picker {
    padding: 0;
    align-items: flex-end;
  }
  .tp-panel {
    width: 100%;
    max-width: 100%;
    max-height: 92vh;
    border-radius: 22px 22px 0 0;
  }
  .tp-fade-enter-active .tp-panel {
    animation: tp-sheet-up 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .tp-fade-leave-active .tp-panel {
    animation: tp-sheet-down 0.22s ease forwards;
  }
  .tp-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .tp-header {
    padding: 18px 18px 12px;
  }
  .tp-body {
    padding: 14px 16px 6px;
  }
  .tp-footer {
    padding: 12px 16px 20px;
  }
}
</style>
