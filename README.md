# 瞳瞳音乐 - 前端

Apple Music 风格音乐播放器 Web 前端

## 技术栈

- Vue 3 + Vite + TypeScript
- Pinia 状态管理
- Element Plus UI
- VitePWA (渐进式 Web 应用)
- Lucide 图标

## 功能特性

- 发现页面（轮播横幅、每日推荐、精选歌单）
- 音乐库（专辑管理、歌单、收藏、历史）
- 排行榜
- 搜索功能
- 音乐播放器（支持歌词显示）
- 响应式设计（桌面/平板/移动端）
- PWA 支持（可添加到主屏幕）

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

## 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE=http://localhost:3000
```

## 接口配置

前端通过 Vite 代理连接后端 API，默认代理到 `http://localhost:3000`。

修改 `vite.config.js` 或设置 `VITE_API_BASE` 环境变量可更改后端地址。
