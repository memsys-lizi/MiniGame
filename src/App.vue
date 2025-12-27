<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import SkillCheck from './components/SkillCheck.vue'
import TempresGame from './components/TempresGame.vue'
import RhythmStacker from './components/RhythmStacker.vue'

const { t, locale } = useI18n()

const showSkillCheck = ref(false)
const showTempres = ref(false)
const showRhythmStacker = ref(false)

const games = [
  { id: 'skillcheck', icon: 'lucide:target', color: '#ef4444' },
  { id: 'tempres', icon: 'lucide:music', color: '#8b5cf6' },
  { id: 'rhythmstacker', icon: 'lucide:layers', color: '#f59e0b' }
]

const startGame = (gameId: string) => {
  if (gameId === 'skillcheck') showSkillCheck.value = true
  else if (gameId === 'tempres') showTempres.value = true
  else if (gameId === 'rhythmstacker') showRhythmStacker.value = true
}

const toggleLang = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}
</script>

<template>
  <div class="minigames-page">
    <div class="lang-switch" @click="toggleLang">
      <Icon icon="lucide:globe" />
      {{ locale === 'zh' ? 'EN' : '中' }}
    </div>

    <div class="page-header">
      <h1>{{ t('title') }}</h1>
      <p class="subtitle">{{ t('subtitle') }}</p>
    </div>

    <div class="games-grid">
      <div
        v-for="game in games"
        :key="game.id"
        class="game-card"
        @click="startGame(game.id)"
      >
        <div class="game-icon" :style="{ background: game.color }">
          <Icon :icon="game.icon" />
        </div>
        <h3>{{ t(`${game.id}.name`) }}</h3>
        <p>{{ t(`${game.id}.desc`) }}</p>
      </div>
    </div>

    <SkillCheck v-model="showSkillCheck" difficulty="normal" />
    <TempresGame v-model="showTempres" />
    <RhythmStacker v-model="showRhythmStacker" />
  </div>
</template>

<style scoped>
.minigames-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
}

.lang-switch {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.lang-switch:hover {
  background: #f5f5f5;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 600;
  color: #0a0a0a;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1rem;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.game-card {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
}

.game-card:hover {
  border-color: #ccc;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.game-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: #fff;
  font-size: 1.5rem;
}

.game-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #0a0a0a;
  margin-bottom: 0.5rem;
}

.game-card p {
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
}
</style>
