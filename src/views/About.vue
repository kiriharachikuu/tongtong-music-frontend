<template>
  <!-- 关于项目页面 - 桌面端独占 -->
  <div class="about-page">
    <!-- 顶部 Hero 头部 -->
    <header class="about-hero">
      <div class="hero-badge">
        <Info :size="16" />
        <span>关于本项目</span>
      </div>
      <h1 class="hero-title">瞳瞳音乐</h1>
      <p class="hero-subtitle">TongTong Music · 星瞳专属的全栈音乐流媒体平台</p>
    </header>

    <!-- ========== 1. 项目策划说明 ========== -->
    <section class="about-section">
      <div class="section-head">
        <span class="section-accent"></span>
        <h2 class="section-title">
          <Info :size="20" class="section-icon" />
          项目说明
        </h2>
      </div>

      <div class="glass-card desc-card">
        <div class="desc-block">
          <p class="desc-text">瞳瞳音乐是一个基于 Vue3 + Node.js + Express + SQLite 的全栈音乐流媒体项目，跨平台兼容（Windows/macOS/Linux/iOS/Android）、支持 PWA 离线访问、具有 Apple Music 风格 UI 的轻量级音乐播放平台。</p>
        </div>
      </div>
    </section>

    <!-- ========== 2. 参与人员列表 ========== -->
    <section class="about-section">
      <div class="section-head">
        <span class="section-accent"></span>
        <h2 class="section-title">
          <Users :size="20" class="section-icon" />
          参与人员
        </h2>
      </div>

      <div class="member-grid">
        <article v-for="m in members" :key="m.name" class="glass-card member-card">
          <div class="member-avatar" :style="{ background: m.color }">
            {{ m.name.slice(0, 1) }}
          </div>
          <div class="member-info">
            <h3 class="member-name">{{ m.name }}</h3>
            <span class="member-role">{{ m.role }}</span>
          </div>
          <a
            class="link-btn"
            :href="m.bilibili"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>B站主页</span>
            <ExternalLink :size="14" />
          </a>
        </article>
      </div>
    </section>

    <!-- ========== 3. 项目使用技术栈清单 ========== -->
    <section class="about-section">
      <div class="section-head">
        <span class="section-accent"></span>
        <h2 class="section-title">
          <Code2 :size="20" class="section-icon" />
          技术栈
        </h2>
      </div>

      <div class="tech-grid">
        <article v-for="t in techStack" :key="t.name" class="glass-card tech-card">
          <div class="tech-head">
            <span class="tech-icon-dot"></span>
            <h3 class="tech-name">{{ t.name }}</h3>
          </div>
          <p class="tech-desc">{{ t.desc }}</p>
          <a
            class="link-btn"
            :href="t.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>官网</span>
            <ExternalLink :size="14" />
          </a>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
// 关于项目页面 - 展示项目说明、团队与技术栈
import { ExternalLink, Users, Code2, Music, Info } from 'lucide-vue-next';

// 参与人员列表（含虚构成员）
const members = [
  {
    name: '不啦不啦小星瞳',
    role: '项目策划 / 苦力小星星一号',
    bilibili: 'https://space.bilibili.com/',
    color: 'linear-gradient(135deg, #8B00FF 0%, #b14dff 100%)',
  },
  {
    name: '桐原知空',
    role: '苦力小星星二号',
    bilibili: 'https://space.bilibili.com/',
    color: 'linear-gradient(135deg, #ff2d55 0%, #ff6b8a 100%)',
  },
  {
    name: 'AI 助手',
    role: '代码审查 / 文档编写',
    bilibili: 'https://space.bilibili.com/',
    color: 'linear-gradient(135deg, #007aff 0%, #5ac8fa 100%)',
  },
];

// 技术栈清单
const techStack = [
  { name: 'Vue 3', desc: '渐进式 JavaScript 框架，用于构建用户界面', url: 'https://vuejs.org/' },
  { name: 'Vite', desc: '下一代前端构建工具，极速冷启动', url: 'https://vitejs.dev/' },
  { name: 'Pinia', desc: 'Vue 的状态管理库', url: 'https://pinia.vuejs.org/' },
  { name: 'Node.js', desc: 'JavaScript 运行时', url: 'https://nodejs.org/' },
  { name: 'Express', desc: '快速、极简的 Node.js Web 框架', url: 'https://expressjs.com/' },
  { name: 'better-sqlite3', desc: '同步 SQLite3 绑定 for Node.js', url: 'https://github.com/WiseLibs/better-sqlite3' },
  { name: 'FFmpeg', desc: '多媒体处理工具，用于音频转码', url: 'https://ffmpeg.org/' },
  { name: 'VitePWA', desc: 'Vite 的 PWA 插件', url: 'https://vite-pwa-org.netlify.app/' },
  { name: 'lucide-vue-next', desc: '轻量级 SVG 图标库', url: 'https://lucide.dev/' },
  { name: '@applemusic-like-lyrics', desc: 'Apple Music 风格歌词组件', url: 'https://github.com/Steve-xmh/applemusic-like-lyrics' },
];

// 占位引用，避免未使用告警（保留语义化的图标集合）
void Music;
</script>

<style scoped>
/* ============ 页面容器 ============ */
.about-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 4px 48px;
  scroll-behavior: smooth;
}

/* ============ Hero 头部 ============ */
.about-hero {
  text-align: center;
  padding: 40px 24px 36px;
  margin-bottom: 32px;
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(139, 0, 255, 0.10) 0%, transparent 60%),
    linear-gradient(180deg, var(--am-bg-2) 0%, var(--am-bg) 100%);
  border-radius: 24px;
  border: 1px solid var(--am-border);
  box-shadow: var(--am-shadow);
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(139, 0, 255, 0.10);
  color: var(--am-primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  margin-bottom: 16px;
}
.hero-title {
  margin: 0;
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(135deg, var(--am-primary) 0%, #b14dff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.hero-subtitle {
  margin: 10px 0 0;
  font-size: 15px;
  color: var(--am-text-secondary);
  letter-spacing: 0.2px;
}

/* ============ 区块通用 ============ */
.about-section { margin-bottom: 36px; }

.section-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.section-accent {
  width: 4px;
  height: 22px;
  border-radius: 4px;
  background: var(--am-primary);
  box-shadow: 0 0 12px rgba(139, 0, 255, 0.5);
}
.section-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--am-text);
}
.section-icon { color: var(--am-primary); }

/* ============ 玻璃态卡片 ============ */
.glass-card {
  background: var(--am-card);
  border: 1px solid var(--am-border);
  border-radius: 16px;
  box-shadow: var(--am-shadow);
  transition: transform 0.25s var(--am-transition), box-shadow 0.25s var(--am-transition);
}

/* ============ 项目说明卡片 ============ */
.desc-card {
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.desc-block { display: flex; flex-direction: column; gap: 8px; }
.desc-label {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--am-primary);
  letter-spacing: 0.2px;
}
.desc-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--am-text);
}
.feature-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feature-list li {
  position: relative;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--am-text);
}
.feature-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--am-primary);
  box-shadow: 0 0 6px rgba(139, 0, 255, 0.5);
}

/* ============ 团队成员网格 ============ */
.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}
.member-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
}
.member-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 14px 36px rgba(139, 0, 255, 0.16), var(--am-shadow);
}
.member-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
}
.member-info { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.member-name {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--am-text);
}
.member-role {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(139, 0, 255, 0.10);
  color: var(--am-primary);
  font-size: 12px;
  font-weight: 600;
}

/* ============ 技术栈网格 ============ */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.tech-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tech-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(139, 0, 255, 0.14), var(--am-shadow);
}
.tech-head { display: flex; align-items: center; gap: 10px; }
.tech-icon-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--am-primary);
  box-shadow: 0 0 8px rgba(139, 0, 255, 0.6);
  flex-shrink: 0;
}
.tech-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--am-text);
  letter-spacing: -0.2px;
}
.tech-desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--am-text-secondary);
  flex: 1;
}

/* ============ 链接按钮 ============ */
.link-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 999px;
  background: rgba(139, 0, 255, 0.10);
  color: var(--am-primary);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid rgba(139, 0, 255, 0.18);
  transition: background 0.2s var(--am-transition), color 0.2s var(--am-transition), border-color 0.2s var(--am-transition), transform 0.15s var(--am-transition);
}
.link-btn:hover {
  background: var(--am-primary);
  color: #fff;
  border-color: var(--am-primary);
  transform: translateY(-1px);
}
.link-btn:active { transform: scale(0.97); }

/* 平板适配（保留 desktop-only 限定，仅调整内边距） */
@media (max-width: 1024px) {
  .desc-card { padding: 24px; }
  .hero-title { font-size: 36px; }
}
</style>
