<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from './Dialog.vue'

// 音效
import startSound from '@/assets/SkillCheck/start.MP3'
import goodSound from '@/assets/SkillCheck/good.MP3'
import perfectSound from '@/assets/SkillCheck/prefect.MP3'

const audioStart = new Audio(startSound)
const audioGood = new Audio(goodSound)
const audioPerfect = new Audio(perfectSound)

// 预加载音频 - 强制立即下载
audioStart.preload = 'auto'
audioGood.preload = 'auto'
audioPerfect.preload = 'auto'
audioStart.load()
audioGood.load()
audioPerfect.load()

const playSound = (type: 'start' | 'good' | 'perfect') => {
  const audio = type === 'start' ? audioStart : type === 'good' ? audioGood : audioPerfect
  audio.currentTime = 0
  audio.play().catch(() => {})
}

// 调试开关：true 时必定触发无情风暴
const isDevPlay = false

interface Props {
  modelValue: boolean
  difficulty?: 'easy' | 'normal' | 'hard'
}

const props = withDefaults(defineProps<Props>(), {
  difficulty: 'normal'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
  'fail': []
}>()

const { t } = useI18n()

// speed 单位改为 度/秒
const difficultyConfig = {
  easy: { successAngle: 60, perfectAngle: 15, speed: 150 },
  normal: { successAngle: 45, perfectAngle: 12, speed: 180 },
  hard: { successAngle: 30, perfectAngle: 8, speed: 240 }
}

const config = difficultyConfig[props.difficulty]

const isActive = ref(false)
const angle = ref(0)
const successStart = ref(0)
const result = ref<'none' | 'success' | 'perfect' | 'fail'>('none')
const animationId = ref<number | null>(null)

const isStormMode = ref(false)
const stormRound = ref(0)
const stormTotal = ref(0)
const currentSpeed = ref(config.speed)
let lastTime = 0

const successEnd = computed(() => successStart.value + config.successAngle)
const perfectStart = computed(() => successStart.value + (config.successAngle - config.perfectAngle) / 2)
const perfectEnd = computed(() => perfectStart.value + config.perfectAngle)

const generateSuccessZone = () => {
  successStart.value = 60 + Math.random() * 180
}

const checkStormMode = () => {
  if (isDevPlay || Math.random() < 0.05) {
    isStormMode.value = true
    stormTotal.value = 3 + Math.floor(Math.random() * 3)
    stormRound.value = 0
    currentSpeed.value = config.speed
    return true
  }
  return false
}

const startCheck = () => {
  isActive.value = true
  angle.value = 0
  result.value = 'none'
  generateSuccessZone()
  playSound('start')
  lastTime = performance.now()
  animationId.value = requestAnimationFrame(animate)
}

const stopAnimation = () => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }
}

const animate = (timestamp: number) => {
  if (!isActive.value) return
  const deltaTime = (timestamp - lastTime) / 1000 // 转换为秒
  lastTime = timestamp
  angle.value += currentSpeed.value * deltaTime
  if (angle.value >= 360) {
    handleFail()
    return
  }
  animationId.value = requestAnimationFrame(animate)
}

const handlePress = () => {
  if (!isActive.value || result.value !== 'none') return
  stopAnimation()
  isActive.value = false
  const currentAngle = angle.value

  if (currentAngle >= perfectStart.value && currentAngle <= perfectEnd.value) {
    result.value = 'perfect'
    playSound('perfect')
    handleSuccess()
  } else if (currentAngle >= successStart.value && currentAngle <= successEnd.value) {
    result.value = 'success'
    playSound('good')
    handleSuccess()
  } else {
    handleFail()
  }
}

const handleSuccess = () => {
  if (isStormMode.value) {
    stormRound.value++
    if (stormRound.value < stormTotal.value) {
      setTimeout(() => {
        currentSpeed.value += 30 // 每轮增加 30度/秒
        result.value = 'none'
        startCheck()
      }, 600)
    } else {
      setTimeout(() => {
        isStormMode.value = false
        emit('success')
        close()
      }, 800)
    }
  } else {
    setTimeout(() => {
      emit('success')
      close()
    }, 800)
  }
}

const handleFail = () => {
  stopAnimation()
  isActive.value = false
  result.value = 'fail'
  setTimeout(() => {
    emit('fail')
    if (isStormMode.value) {
      stormRound.value = 0
      currentSpeed.value = config.speed
    }
    startCheck()
  }, 1000)
}

const close = () => {
  stopAnimation()
  isActive.value = false
  result.value = 'none'
  isStormMode.value = false
  stormRound.value = 0
  emit('update:modelValue', false)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.modelValue) return
  if (e.code === 'Space') {
    e.preventDefault()
    handlePress()
  }
}

watch(() => props.modelValue, (show) => {
  if (show) {
    checkStormMode()
    setTimeout(() => startCheck(), 100)
  } else {
    stopAnimation()
    isActive.value = false
    isStormMode.value = false
  }
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  stopAnimation()
})
</script>

<template>
  <Dialog
    :model-value="modelValue"
    @update:model-value="close"
    :title="isStormMode ? t('mercilessStorm') : t('humanVerify')"
    width="320px"
    :show-close="true"
  >
    <div class="skill-check-content">
      <div v-if="isStormMode" class="storm-progress">
        <span v-for="i in stormTotal" :key="i" class="storm-dot" :class="{ done: i <= stormRound, current: i === stormRound + 1 }"></span>
      </div>
      
      <div class="skill-check-ring" @click="handlePress">
        <svg viewBox="0 0 200 200" class="ring-svg">
          <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e5e5" stroke-width="14" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#4ade80" stroke-width="14"
            :stroke-dasharray="`${config.successAngle / 360 * 2 * Math.PI * 80} ${2 * Math.PI * 80}`"
            :style="{ transform: `rotate(${successStart - 90}deg)`, transformOrigin: 'center' }" />
          <circle cx="100" cy="100" r="80" fill="none" stroke="#fbbf24" stroke-width="14"
            :stroke-dasharray="`${config.perfectAngle / 360 * 2 * Math.PI * 80} ${2 * Math.PI * 80}`"
            :style="{ transform: `rotate(${perfectStart - 90}deg)`, transformOrigin: 'center' }" />
          <line x1="100" y1="100" x2="100" y2="28" stroke="#ef4444" stroke-width="4" stroke-linecap="round"
            :style="{ transform: `rotate(${angle}deg)`, transformOrigin: 'center' }" class="pointer" />
          <circle cx="100" cy="100" r="10" fill="#ef4444" />
        </svg>
        
        <Transition name="pop">
          <div v-if="result !== 'none'" class="result-display" :class="result">
            <span v-if="result === 'perfect'">PERFECT!</span>
            <span v-else-if="result === 'success'">GOOD!</span>
            <span v-else>MISS!</span>
          </div>
        </Transition>
      </div>
      
      <p class="hint">{{ t('skillCheckHint') }}</p>
    </div>
  </Dialog>
</template>

<style scoped>
.skill-check-content { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.storm-progress { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.storm-dot { width: 12px; height: 12px; border-radius: 50%; background: #e5e5e5; transition: all 0.3s; }
.storm-dot.done { background: #22c55e; }
.storm-dot.current { background: #ef4444; animation: pulse 0.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
.skill-check-ring { position: relative; width: 200px; height: 200px; cursor: pointer; }
.ring-svg { width: 100%; height: 100%; }
.pointer { filter: drop-shadow(0 0 6px #ef4444); transition: none; }
.result-display { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; letter-spacing: 0.05em; pointer-events: none; }
.result-display.perfect { color: #fbbf24; }
.result-display.success { color: #22c55e; }
.result-display.fail { color: #ef4444; }
.hint { color: #666; font-size: 0.85rem; margin: 0; text-align: center; }
.pop-enter-active { animation: pop 0.3s ease-out; }
.pop-leave-active { animation: pop 0.2s ease-in reverse; }
@keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>
