<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from './Dialog.vue'

// 音效导入
import sndHit0 from '@/assets/tempres/sndTempres_Hit0.ogg'
import sndHit1 from '@/assets/tempres/sndTempres_Hit1.ogg'
import sndHit2 from '@/assets/tempres/sndTempres_Hit2.ogg'
import sndHit3 from '@/assets/tempres/sndTempres_Hit3.ogg'
import sndHit4 from '@/assets/tempres/sndTempres_Hit4.ogg'
import sndHit5 from '@/assets/tempres/sndTempres_Hit5.ogg'
import sndHit6 from '@/assets/tempres/sndTempres_Hit6.ogg'
import sndHit7 from '@/assets/tempres/sndTempres_Hit7.ogg'
import sndHit8 from '@/assets/tempres/sndTempres_Hit8.ogg'
import sndHit9 from '@/assets/tempres/sndTempres_Hit9.ogg'
import sndFail0 from '@/assets/tempres/sndTempres_Fail0.ogg'
import sndFail1 from '@/assets/tempres/sndTempres_Fail1.ogg'
import sndFail2 from '@/assets/tempres/sndTempres_Fail2.ogg'
import sndFail3 from '@/assets/tempres/sndTempres_Fail3.ogg'
import sndFail4 from '@/assets/tempres/sndTempres_Fail4.ogg'
import sndFail5 from '@/assets/tempres/sndTempres_Fail5.ogg'
import sndFail6 from '@/assets/tempres/sndTempres_Fail6.ogg'
import sndFail7 from '@/assets/tempres/sndTempres_Fail7.ogg'
import sndFail8 from '@/assets/tempres/sndTempres_Fail8.ogg'
import sndFail9 from '@/assets/tempres/sndTempres_Fail9.ogg'
import sndWin from '@/assets/tempres/sndTempres_Win.ogg'

const hitSoundSrcs = [sndHit0, sndHit1, sndHit2, sndHit3, sndHit4, sndHit5, sndHit6, sndHit7, sndHit8, sndHit9]
const failSoundSrcs = [sndFail0, sndFail1, sndFail2, sndFail3, sndFail4, sndFail5, sndFail6, sndFail7, sndFail8, sndFail9]

const hitSounds: HTMLAudioElement[] = []
const failSounds: HTMLAudioElement[] = []
let winSound: HTMLAudioElement

const preloadAudio = () => {
  hitSoundSrcs.forEach(src => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.load() // 强制开始加载
    hitSounds.push(audio)
  })
  failSoundSrcs.forEach(src => {
    const audio = new Audio(src)
    audio.preload = 'auto'
    audio.load() // 强制开始加载
    failSounds.push(audio)
  })
  winSound = new Audio(sndWin)
  winSound.preload = 'auto'
  winSound.load() // 强制开始加载
}

interface Props { modelValue: boolean }

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; 'success': []; 'fail': [] }>()
const { t } = useI18n()

const TOTAL_BARS = 10
const bars = ref<{ active: boolean; time: number }[]>([])
const currentIndex = ref(0)
const isPlaying = ref(false)
const result = ref<'none' | 'success' | 'fail'>('none')
const showHint = ref(true)
const startTime = ref(0)
const totalTime = ref(0)

const playSound = (audio: HTMLAudioElement | undefined) => {
  if (!audio) return
  audio.currentTime = 0
  audio.play().catch(() => {})
}

const initGame = () => {
  bars.value = Array(TOTAL_BARS).fill(null).map(() => ({ active: false, time: 0 }))
  currentIndex.value = 0
  isPlaying.value = true
  result.value = 'none'
  showHint.value = true
  startTime.value = 0
  totalTime.value = 0
}

const handleTap = () => {
  if (!isPlaying.value || result.value !== 'none') return
  const now = performance.now()
  showHint.value = false
  const bar = bars.value[currentIndex.value]
  if (!bar) return

  if (currentIndex.value <= 1) {
    playSound(hitSounds[currentIndex.value])
    bar.active = true
    bar.time = now
    if (currentIndex.value === 0) startTime.value = now
    currentIndex.value++
    return
  }

  const prev1 = bars.value[currentIndex.value - 1]
  const prev2 = bars.value[currentIndex.value - 2]
  if (!prev1 || !prev2) return

  const lastInterval = prev1.time - prev2.time
  const currentInterval = now - prev1.time

  if (currentInterval > lastInterval) {
    playSound(hitSounds[currentIndex.value])
    bar.active = true
    bar.time = now
    currentIndex.value++
    if (currentIndex.value >= TOTAL_BARS) handleWin()
  } else {
    playSound(failSounds[currentIndex.value])
    handleFail()
  }
}

const handleWin = () => {
  isPlaying.value = false
  result.value = 'success'
  totalTime.value = (performance.now() - startTime.value) / 1000
  setTimeout(() => playSound(winSound), 500)
  setTimeout(() => { emit('success'); close() }, 1500)
}

const handleFail = () => {
  isPlaying.value = false
  result.value = 'fail'
  setTimeout(() => { emit('fail'); initGame() }, 1000)
}

const close = () => {
  isPlaying.value = false
  emit('update:modelValue', false)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.modelValue) return
  if (e.code === 'Space') { e.preventDefault(); handleTap() }
}

watch(() => props.modelValue, (show) => { if (show) setTimeout(() => initGame(), 100) })
onMounted(() => { preloadAudio(); window.addEventListener('keydown', handleKeydown) })
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Dialog :model-value="modelValue" @update:model-value="close" :title="t('tempresTitle')" width="520px" :show-close="true">
    <div class="tempres-content" @click="handleTap">
      <p class="tempres-desc">{{ t('tempresDesc') }}</p>
      <div class="bars-container">
        <div v-for="(bar, index) in bars" :key="index" class="bar" :class="{ active: bar.active, current: index === currentIndex }"></div>
      </div>
      <div class="progress-text">{{ currentIndex }} / {{ TOTAL_BARS }}</div>
      <div v-if="totalTime > 0" class="time-text">{{ t('tempresTotalTime') }}: {{ totalTime.toFixed(2) }}s</div>
      <Transition name="pop">
        <div v-if="result !== 'none'" class="result-display" :class="result">
          <span v-if="result === 'success'">{{ t('tempresWin') }}</span>
          <span v-else>{{ t('tempresFail') }}</span>
        </div>
      </Transition>
      <p v-if="showHint" class="hint">{{ t('tempresHint') }}</p>
      <p v-else-if="isPlaying" class="hint">{{ t('tempresKeepRhythm') }}</p>
    </div>
  </Dialog>
</template>

<style scoped>
.tempres-content { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 1rem 0; cursor: pointer; user-select: none; min-height: 200px; }
.tempres-desc { font-size: 0.85rem; color: #666; text-align: center; margin: 0; line-height: 1.5; }
.bars-container { display: flex; gap: 12px; align-items: flex-end; height: 120px; padding: 0 1rem; }
.bar { width: 28px; height: 20px; background: #e5e5e5; border-radius: 4px; transition: all 0.15s ease-out; }
.bar.current { background: #fbbf24; height: 40px; }
.bar.active { background: #22c55e; height: 80px; }
.progress-text { font-size: 1.25rem; font-weight: 600; color: #333; }
.time-text { font-size: 1rem; color: #666; }
.result-display { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.5rem; font-weight: 700; padding: 1rem 2rem; border-radius: 8px; background: rgba(255, 255, 255, 0.95); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); }
.result-display.success { color: #22c55e; }
.result-display.fail { color: #ef4444; }
.hint { font-size: 0.8rem; color: #999; margin: 0; text-align: center; }
.pop-enter-active { animation: pop 0.3s ease-out; }
.pop-leave-active { animation: pop 0.2s ease-in reverse; }
@keyframes pop { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
</style>
