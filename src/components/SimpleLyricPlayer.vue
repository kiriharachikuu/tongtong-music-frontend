<template>
  <div class="simple-lyric" ref="containerRef">
    <!-- 顶部渐变遮罩 -->
    <div class="mask mask-top"></div>
    <!-- 底部渐变遮罩 -->
    <div class="mask mask-bottom"></div>

    <!-- 加载状态 -->
    <div v-if="loading" class="state">
      <div class="spinner"></div>
      <div class="state-text">歌词加载中…</div>
    </div>

    <!-- 无歌词 -->
    <div v-else-if="!lyrics || !lyrics.length" class="state">
      <div class="state-icon">🎵</div>
      <div class="state-text">{{ hasSong ? '暂无歌词' : '挑一首歌开始播放吧' }}</div>
      <div class="state-hint">{{ hasSong ? '当前歌曲没有关联歌词文件' : '还没有播放内容' }}</div>
    </div>

    <!-- 歌词列表 -->
    <div v-else ref="scrollRef" class="lyric-scroll" @click="onContainerClick">
      <div class="lyric-pad-top"></div>
      <div
        v-for="(line, idx) in lyrics"
        :key="idx"
        :ref="el => setLineRef(el, idx)"
        class="lyric-line"
        :class="{ active: idx === currentIndex, near: Math.abs(idx - currentIndex) <= 2, far: Math.abs(idx - currentIndex) > 4 }"
        :data-time="line.time"
        @click.stop="onLineClick(line, idx)"
      >
        <span class="lyric-text">{{ line.text }}</span>
      </div>
      <div class="lyric-pad-bottom"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { findCurrentLineIndex } from '../utils/lyricParser';

const props = defineProps({
  // 歌词数组：[{ time, text }]
  lyrics: { type: Array, default: () => [] },
  // 当前播放时间（秒）
  currentTime: { type: Number, default: 0 },
  // 是否正在播放（保留 API，影响动画）
  playing: { type: Boolean, default: false },
  // 是否加载中
  loading: { type: Boolean, default: false },
  // 是否已有歌曲（空状态文案区分）
  hasSong: { type: Boolean, default: true }
});

const emit = defineEmits(['seek']);

const containerRef = ref(null);
const scrollRef = ref(null);
const lineRefs = {};
const currentIndex = ref(-1);

function setLineRef(el, idx) {
  if (el) lineRefs[idx] = el;
  else delete lineRefs[idx];
}

// 根据 currentTime 计算当前行
function updateCurrentIndex() {
  if (!props.lyrics || !props.lyrics.length) {
    currentIndex.value = -1;
    return;
  }
  currentIndex.value = findCurrentLineIndex(props.lyrics, props.currentTime);
}

// 自动滚动到当前行
function scrollToCurrent() {
  const idx = currentIndex.value;
  if (idx < 0 || !scrollRef.value) return;

  const lineEl = lineRefs[idx];
  if (!lineEl) return;

  // 计算滚动位置：把当前行放到中间
  const containerHeight = scrollRef.value.clientHeight;
  const lineTop = lineEl.offsetTop;
  const lineHeight = lineEl.offsetHeight;
  const targetScroll = lineTop - containerHeight / 2 + lineHeight / 2;

  scrollRef.value.scrollTo({
    top: Math.max(0, targetScroll),
    behavior: 'smooth'
  });
}

// 点击歌词行跳转
function onLineClick(line) {
  if (line && typeof line.time === 'number') {
    emit('seek', line.time);
  }
}

function onContainerClick(e) {
  // 空白区域点击忽略
}

// 响应式更新
watch(() => props.currentTime, () => {
  updateCurrentIndex();
});

watch(() => props.lyrics, (newVal) => {
  updateCurrentIndex();
  nextTick(scrollToCurrent);
}, { deep: true });

watch(currentIndex, () => {
  // 延迟一点再滚动，让 DOM 先渲染
  setTimeout(scrollToCurrent, 50);
});

onMounted(() => {
  updateCurrentIndex();
});

onBeforeUnmount(() => {
  Object.keys(lineRefs).forEach(k => delete lineRefs[k]);
});
</script>

<style scoped>
.simple-lyric {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  background: transparent;
}

/* 渐变遮罩 */
.mask {
  position: absolute;
  left: 0;
  right: 0;
  height: 80px;
  z-index: 10;
  pointer-events: none;
}
.mask-top {
  top: 0;
  background: linear-gradient(to bottom,
    var(--am-bg, #ffffff) 0%,
    rgba(255,255,255,0) 100%);
}
.mask-bottom {
  bottom: 0;
  background: linear-gradient(to top,
    var(--am-bg, #ffffff) 0%,
    rgba(255,255,255,0) 100%);
}

/* 状态文本 */
.state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 5;
  padding: 20px;
  text-align: center;
}
.state-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.4;
}
.state-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--am-text, #333);
  margin-bottom: 4px;
}
.state-hint {
  font-size: 13px;
  color: var(--am-text-secondary, #999);
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--am-primary, #8B00FF);
  border-top-color: transparent;
  border-radius: 50%;
  animation: sl-spin 0.8s linear infinite;
  margin-bottom: 12px;
}
@keyframes sl-spin {
  to { transform: rotate(360deg); }
}

/* 歌词滚动容器 */
.lyric-scroll {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
.lyric-scroll::-webkit-scrollbar {
  width: 4px;
}
.lyric-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.lyric-scroll::-webkit-scrollbar-thumb {
  background: var(--am-border, #e0e0e0);
  border-radius: 2px;
}

/* 上下 padding 确保中间行可以居中 */
.lyric-pad-top, .lyric-pad-bottom {
  height: 45%;
}

/* 歌词行 */
.lyric-line {
  padding: 12px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  line-height: 1.6;
  opacity: 0.35;
  font-size: 16px;
  color: var(--am-text-secondary, #666);
}
.lyric-line.near {
  opacity: 0.6;
  font-size: 17px;
}
.lyric-line.active {
  opacity: 1;
  font-size: 22px;
  font-weight: 700;
  color: var(--am-primary, #8B00FF);
  transform: scale(1.02);
  padding: 16px 24px;
}
.lyric-line:hover {
  opacity: 0.85;
}
.lyric-line.active:hover {
  opacity: 1;
}
.lyric-text {
  display: inline-block;
}

/* 响应式 */
@media (max-width: 1024px) {
  .lyric-line { font-size: 15px; padding: 10px 20px; }
  .lyric-line.near { font-size: 16px; }
  .lyric-line.active { font-size: 20px; padding: 14px 20px; }
}
@media (max-width: 767px) {
  .lyric-line { font-size: 14px; padding: 8px 16px; }
  .lyric-line.near { font-size: 15px; }
  .lyric-line.active { font-size: 18px; padding: 12px 16px; }
  .mask { height: 60px; }
  .state-icon { font-size: 36px; }
  .state-text { font-size: 14px; }
}
</style>
