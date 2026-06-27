<template>
  <div class="login-wrap">
    <div class="login-card">
      <h1>{{ mode === 'login' ? '登录' : '注册' }} 瞳瞳音乐</h1>
      <p>欢迎回来，让音乐继续</p>
      <div class="field">
        <label>用户名</label>
        <input v-model="username" placeholder="请输入用户名" />
      </div>
      <div class="field">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" />
      </div>
      <div v-if="mode==='register'" class="field">
        <label>昵称</label>
        <input v-model="nickname" placeholder="昵称" />
      </div>
      <button class="primary-btn" style="width:100%;min-height:48px;margin-top:10px;" @click="onSubmit">{{ mode==='login' ? '登录' : '创建' }}</button>
      <div style="text-align:center;margin-top:12px;color:var(--am-text-secondary);cursor:pointer;" @click="mode=mode==='login'?'register':'login'">
        {{ mode==='login' ? '还没有账号？去注册' : '已有账号？去登录' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { login, register } from '../api/endpoints';
import { useUserStore } from '../stores/user';

const user = useUserStore();
const mode = ref('login');
const username = ref('');
const password = ref('');
const nickname = ref('');

async function onSubmit() {
  try {
    const r = mode.value === 'login'
      ? await login({ username: username.value, password: password.value })
      : await register({ username: username.value, password: password.value, nickname: nickname.value });
    user.setAuth(r.user, r.token);
    location.hash = '#/discover';
  } catch (e) { alert(e.message); }
}
</script>
