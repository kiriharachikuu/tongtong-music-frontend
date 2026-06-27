<template>
  <div class="amll-lyric-box" :class="{ 'amll-transparent': transparent }" ref="boxRef">
    <!-- 非透明模式：WebGL mesh 渐变背景 -->
    <template v-if="!transparent">
      <div v-if="showWebGLBg" class="amll-bg-wrapper">
        <BackgroundRender
          :album="coverUrl"
          :playing="false"
          :fps="30"
          @vue:mounted="onBgMounted"
        />
      </div>
      <div v-else-if="coverUrl" class="amll-bg-fallback"
           :style="{ backgroundImage: 'url(' + coverUrl + ')' }"></div>
      <div v-else class="amll-bg-solid"></div>
      <div class="amll-mask amll-mask-top"></div>
      <div class="amll-mask amll-mask-bottom"></div>
    </template>

    <!-- 透明模式：添加上下渐隐遮罩，提升歌词可读性 -->
    <template v-else>
      <div class="amll-mask amll-mask-top amll-mask-transparent"></div>
      <div class="amll-mask amll-mask-bottom amll-mask-transparent"></div>
    </template>

    <!-- 歌词播放器 -->
    <LyricPlayer
      v-show="lines.length > 0 && !parseError"
      ref="lyricRef"
      :lyric-lines="lines"
      :current-time="currentTimeMs"
      :playing="playing"
      :enable-spring="true"
      :enable-blur="false"
      :enable-scale="true"
      :word-fade-width="0.6"
      align-anchor="center"
      :align-position="0.5"
      class="amll-player"
      @line-click="onLineClick"
    />

    <!-- 加载中 -->
    <div v-if="loading" class="amll-empty-state" :class="{ 'amll-empty-light': transparent }">
      <div class="amll-loading-spinner"></div>
      <div class="title">歌词加载中…</div>
    </div>

    <!-- 解析错误提示 -->
    <div v-else-if="parseError" class="amll-empty-state amll-error-state">
      <AlertCircle :size="48" class="amll-empty-icon" />
      <div class="title">歌词加载失败</div>
      <div class="hint">{{ parseError }}</div>
      <button class="amll-retry-btn" @click="$emit('retry')">重试</button>
    </div>

    <!-- 空状态 -->
    <div v-else-if="empty" class="amll-empty-state" :class="{ 'amll-empty-light': transparent }">
      <Music :size="48" class="amll-empty-icon" />
      <div class="title">{{ hasSong ? '暂无歌词' : '挑一首歌开始播放吧' }}</div>
      <div class="hint">{{ hasSong ? '当前歌曲没有关联歌词文件' : '暂无播放内容' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onErrorCaptured, nextTick } from 'vue';
import { Music, AlertCircle } from 'lucide-vue-next';
import { LyricPlayer, BackgroundRender } from '@applemusic-like-lyrics/vue';

const props = defineProps({
  lines: { type: Array, default: () => [] },
  coverUrl: { type: String, default: '' },
  currentTime: { type: Number, default: 0 },
  playing: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  parseError: { type: String, default: '' },
  transparent: { type: Boolean, default: false },
});

const emit = defineEmits(['line-click', 'retry']);

const boxRef = ref(null);
const lyricRef = ref(null);
const bgError = ref(false);
const webglAvailable = checkWebGLSupport();

const hasSong = computed(() => !!props.coverUrl);
const empty = computed(() => !props.lines || props.lines.length === 0);
const showWebGLBg = computed(() => !!props.coverUrl && !bgError.value && webglAvailable && !props.transparent);

const currentTimeMs = computed(() => Math.floor((props.currentTime || 0) * 1000));

function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

onErrorCaptured((err, instance, info) => {
  console.warn('[AmllLyricPlayer] 子组件错误已捕获，降级处理:', err?.message || err);
  bgError.value = true;
  return false;
});

function onBgMounted() {
  bgError.value = false;
}

function onLineClick(e) {
  if (e && e.line && typeof e.line.startTime === 'number') {
    emit('line-click', e.line.startTime / 1000);
  }
}

watch(() => props.lines, () => {
  nextTick(() => {
    if (lyricRef.value && lyricRef.value.lyricPlayer) {
      try { lyricRef.value.lyricPlayer.calcLayout?.(true, true); } catch {}
    }
  });
}, { deep: false });

watch(() => props.coverUrl, () => {
  bgError.value = false;
});
</script>

<style scoped>
.amll-lyric-box {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ========== 非透明模式背景 ========== */
.amll-bg-wrapper {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
.amll-bg-wrapper :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}
.amll-bg-fallback {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-size: cover;
  background-position: center;
  filter: blur(80px) saturate(1.6) brightness(0.5);
  transform: scale(1.2);
}
.amll-bg-solid {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}

/* ========== 渐变遮罩 ========== */
.amll-mask {
  position: absolute;
  left: 0;
  right: 0;
  height: 120px;
  z-index: 2;
  pointer-events: none;
}
.amll-mask-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
}
.amll-mask-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
}
.amll-mask-transparent {
  background: linear-gradient(to bottom, var(--am-bg), transparent) !important;
}
.amll-mask-transparent.amll-mask-bottom {
  background: linear-gradient(to top, var(--am-bg), transparent) !important;
}

/* ========== 歌词播放器 ========== */
.amll-player {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
}
.amll-player :deep(.amll-lyric-player.dom) {
  width: 100% !important;
  height: 100% !important;
}

/* ========== 非透明模式歌词行样式 ========== */
.amll-player :deep(.amll-lyric-line) {
  color: rgba(255, 255, 255, 0.5) !important;
  font-weight: 600;
  letter-spacing: 0.2px;
  line-height: 1.55;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  transition: all 0.25s ease;
}
.amll-player :deep(.amll-lyric-line.active) {
  color: #ffffff !important;
  font-weight: 800;
}

/* ========== 透明模式歌词行样式 ========== */
.amll-transparent .amll-player :deep(.amll-lyric-line) {
  color: var(--am-text-secondary) !important;
  text-shadow: 0 1px 4px var(--am-bg);
  font-weight: 600;
}
.amll-transparent .amll-player :deep(.amll-lyric-line.active) {
  color: var(--am-primary) !important;
  font-weight: 800;
  text-shadow: 0 2px 20px rgba(139, 0, 255, 0.4), 0 1px 4px var(--am-bg);
}

/* 字号响应式 */
@media (min-width: 1025px) {
  .amll-lyric-box { min-height: 400px; }
  .amll-player :deep(.amll-lyric-line) { font-size: 24px; }
  .amll-player :deep(.amll-lyric-line.active) { font-size: 30px; }
}
@media (min-width: 768px) and (max-width: 1024px) {
  .amll-lyric-box { min-height: 320px; }
  .amll-player :deep(.amll-lyric-line) { font-size: 20px; }
  .amll-player :deep(.amll-lyric-line.active) { font-size: 25px; }
}
@media (max-width: 767px) {
  .amll-lyric-box { min-height: 240px; }
  .amll-mask { height: 60px; }
  .amll-player :deep(.amll-lyric-line) { font-size: 17px; }
  .amll-player :deep(.amll-lyric-line.active) { font-size: 21px; }
}

/* ========== 空状态 / 加载 / 错误 ========== */
.amll-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
  color: rgba(255,255,255,0.8);
  text-align: center;
  padding: 20px;
}
.amll-empty-light {
  color: var(--am-text-secondary);
}
.amll-error-state { pointer-events: auto; }
.amll-empty-icon {
  margin-bottom: 14px;
  opacity: 0.6;
}
.amll-empty-state .title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  letter-spacing: 0.2px;
}
.amll-empty-state .hint {
  font-size: 13px;
  color: inherit;
  opacity: 0.6;
  max-width: 320px;
  margin-bottom: 16px;
}

/* 加载动画 */
.amll-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid currentColor;
  border-top-color: transparent;
  opacity: 0.3;
  border-radius: 50%;
  animation: amll-spin 0.8s linear infinite;
  margin-bottom: 12px;
}
.amll-transparent .amll-loading-spinner {
  border-color: var(--am-text-secondary);
  border-top-color: transparent;
  opacity: 0.4;
}
@keyframes amll-spin {
  to { transform: rotate(360deg); }
}

/* 重试按钮 */
.amll-retry-btn {
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-size: 13px;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
  transition: background 0.2s ease;
}
.amll-retry-btn:hover { background: rgba(255,255,255,0.25); }
.amll-transparent .amll-retry-btn {
  background: var(--am-primary);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(139, 0, 255, 0.3);
}
.amll-transparent .amll-retry-btn:hover { background: var(--am-primary-hover); }
</style>
