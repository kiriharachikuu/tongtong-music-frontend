<template>
  <div style="display:grid;grid-template-columns:200px 1fr;min-height:calc(100vh - 80px);gap:18px;">
    <aside style="background:var(--am-card);padding:18px;border-radius:var(--am-radius);box-shadow:var(--am-shadow);">
      <h3 style="margin-top:0;">管理后台</h3>
      <router-link to="/admin/dashboard" class="nav-item" :class="{active: route.path==='/admin/dashboard'}">
        <BarChart3 :size="16" /> 数据总览
      </router-link>
      <router-link to="/admin/songs" class="nav-item" :class="{active: route.path==='/admin/songs'}">
        <Music :size="16" /> 歌曲管理
      </router-link>
      <router-link to="/admin/albums" class="nav-item" :class="{active: route.path==='/admin/albums'}">
        <Disc3 :size="16" /> 专辑管理
      </router-link>
      <router-link to="/admin/banners" class="nav-item" :class="{active: route.path==='/admin/banners'}">
        <Image :size="16" /> 横幅管理
      </router-link>
      <router-link to="/admin/playlists" class="nav-item" :class="{active: route.path==='/admin/playlists'}">
        <ListMusic :size="16" /> 歌单管理
      </router-link>
      <router-link to="/admin/users" class="nav-item" :class="{active: route.path==='/admin/users'}">
        <Users :size="16" /> 用户管理
      </router-link>
      <router-link to="/admin/logs" class="nav-item" :class="{active: route.path==='/admin/logs'}">
        <ScrollText :size="16" /> 操作日志
      </router-link>
      <router-link to="/admin/storage" class="nav-item" :class="{active: route.path==='/admin/storage'}">
        <HardDrive :size="16" /> 存储配置
      </router-link>
      <router-link to="/admin/migrate" class="nav-item" :class="{active: route.path==='/admin/migrate'}">
        <ArrowLeftRight :size="16" /> 存储迁移
      </router-link>
      <div style="margin-top:20px;"><router-link class="ghost-btn" to="/discover" style="display:block;text-align:center;text-decoration:none;">
        <ChevronLeft :size="14" /> 返回前台
      </router-link></div>
    </aside>
    <div style="background:var(--am-card);padding:20px;border-radius:var(--am-radius);box-shadow:var(--am-shadow);min-width:0;position:relative;">
      <div class="route-transition-wrap">
        <router-view v-slot="{ Component, route: r }">
          <transition name="route-fade" mode="default">
            <component :is="Component" :key="r.path" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import {
  BarChart3, Music, Disc3, Image, ListMusic, Users,
  ScrollText, HardDrive, ArrowLeftRight, ChevronLeft
} from 'lucide-vue-next';
const route = useRoute();
</script>
