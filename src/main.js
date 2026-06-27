import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@applemusic-like-lyrics/core/style.css';
import App from './App.vue';
import router from './router';
import './styles/global.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.mount('#app');
