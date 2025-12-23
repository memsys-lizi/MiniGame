import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import zh from './i18n/zh.json'
import en from './i18n/en.json'
import './style.css'

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages: { zh, en }
})

const app = createApp(App)
app.use(i18n)
app.mount('#app')
