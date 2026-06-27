import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

// 读取 package.json 的 version 字段，注入为全局常量 __APP_VERSION__
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

// 后端 API 地址（可在此处修改，或通过 .env 文件的 VITE_API_BASE 设置）
const API_BASE = process.env.VITE_API_BASE || 'http://xtmusicapi.chikuu.top:3000/';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: '瞳瞳音乐',
        short_name: '瞳音',
        description: '星瞳专属的全栈音乐流媒体平台',
        theme_color: '#8B00FF',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /\/songs\/.*\/stream/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => !url.pathname.startsWith('/api') && !url.pathname.match(/\.(mp3|wav|flac|m4a|ogg)$/),
            handler: 'CacheFirst',
            options: { cacheName: 'tongtong-static', expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 } }
          }
        ]
      }
    })
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  define: {
    // 注入应用版本号（来自 package.json），供前端与服务端 version_code 比对
    __APP_VERSION__: JSON.stringify(pkg.version),
    // 注入后端 API 地址，供 axios 等使用
    __API_BASE__: JSON.stringify(API_BASE)
  },
  server: {
    port: 5173,
    proxy: {
      '/api': API_BASE,
      '/uploads': API_BASE
    }
  }
});
