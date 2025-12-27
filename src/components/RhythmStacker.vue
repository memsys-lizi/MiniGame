<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from './Dialog.vue'

// 背景音乐
import bgmSrc from '@/assets/RhythmStacker/rsexport.ogg'

const bgm = new Audio(bgmSrc)
bgm.preload = 'auto'
bgm.loop = true
bgm.load()

interface Props { modelValue: boolean }
const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useI18n()

// 游戏配置
const BPM = 75
const CROTCHET = 60 / BPM * 1000 // 每拍毫秒数
const BLOCK_HEIGHT = 20
const INITIAL_WIDTH = 120
const CANVAS_WIDTH = 300
const CANVAS_HEIGHT = 400
const TIMING_LENIENCY = 5 // 完美判定容差(像素)

// 调试模式：true 时自动播放
const DEBUG_MODE = true
let debugTapped = false // 防止调试模式重复点击

// 游戏状态
const score = ref(0)
const highScore = ref(parseInt(localStorage.getItem('rhythmStackerHighScore') || '0'))
const gameState = ref<'ready' | 'playing' | 'gameover'>('ready')
const blocks = ref<{ x: number; width: number; y: number }[]>([])
const movingBlockX = ref(0)
const movingBlockWidth = ref(INITIAL_WIDTH)
const direction = ref(1)
const lastHitInfo = ref<{ offset: number; perfect: boolean } | null>(null)

// 节拍相关
let startTime = 0
let animationId: number | null = null

// 计算移动方块的 Y 位置
const movingBlockY = computed(() => {
  return CANVAS_HEIGHT - (blocks.value.length + 1) * BLOCK_HEIGHT
})

// 计算视口偏移（当堆叠过高时向下滚动）
const viewOffset = computed(() => {
  const stackHeight = (blocks.value.length + 1) * BLOCK_HEIGHT
  return Math.max(0, stackHeight - CANVAS_HEIGHT + 100)
})

const initGame = () => {
  score.value = 0
  blocks.value = [{ x: (CANVAS_WIDTH - INITIAL_WIDTH) / 2, width: INITIAL_WIDTH, y: CANVAS_HEIGHT - BLOCK_HEIGHT }]
  movingBlockWidth.value = INITIAL_WIDTH
  movingBlockX.value = 0
  direction.value = 1
  gameState.value = 'ready'
  lastHitInfo.value = null
}

const startGame = () => {
  if (gameState.value === 'gameover') {
    initGame()
  }
  gameState.value = 'playing'
  startTime = performance.now()
  bgm.currentTime = 0
  bgm.play().catch(() => {})
  animate(startTime)
}

const animate = (timestamp: number) => {
  if (gameState.value !== 'playing') return
  
  // 计算当前节拍进度 (0-1)
  const songTime = timestamp - startTime
  const beatFraction = (songTime % CROTCHET) / CROTCHET
  
  // 方块从左到右单向移动，到右边后从左边重新出现
  const moveRange = CANVAS_WIDTH + movingBlockWidth.value
  movingBlockX.value = beatFraction * moveRange - movingBlockWidth.value
  
  // 调试模式：在方块对齐时自动点击
  if (DEBUG_MODE) {
    const lastBlock = blocks.value[blocks.value.length - 1]
    const offset = Math.abs(movingBlockX.value - lastBlock.x)
    if (offset < TIMING_LENIENCY + 2) {
      if (!debugTapped) {
        debugTapped = true
        handleTap()
      }
    } else {
      debugTapped = false
    }
  }
  
  animationId = requestAnimationFrame(animate)
}

const handleTap = () => {
  if (gameState.value === 'ready') {
    startGame()
    return
  }
  
  if (gameState.value === 'gameover') {
    initGame()
    gameState.value = 'ready'
    return
  }
  
  if (gameState.value !== 'playing') return
  
  const lastBlock = blocks.value[blocks.value.length - 1]
  const movingLeft = movingBlockX.value
  const movingRight = movingBlockX.value + movingBlockWidth.value
  const lastLeft = lastBlock.x
  const lastRight = lastBlock.x + lastBlock.width
  
  // 计算重叠区域
  const overlapLeft = Math.max(movingLeft, lastLeft)
  const overlapRight = Math.min(movingRight, lastRight)
  const overlapWidth = overlapRight - overlapLeft
  
  if (overlapWidth <= 0) {
    // 没有重叠，游戏结束
    gameOver()
    return
  }
  
  // 计算偏移量
  const offset = Math.abs(movingBlockX.value - lastBlock.x)
  const isPerfect = offset <= TIMING_LENIENCY
  
  if (isPerfect) {
    // 完美判定，保持原宽度
    blocks.value.push({
      x: lastBlock.x,
      width: lastBlock.width,
      y: CANVAS_HEIGHT - (blocks.value.length + 1) * BLOCK_HEIGHT
    })
    movingBlockX.value = lastBlock.x
  } else {
    // 普通判定，裁剪方块
    blocks.value.push({
      x: overlapLeft,
      width: overlapWidth,
      y: CANVAS_HEIGHT - (blocks.value.length + 1) * BLOCK_HEIGHT
    })
    movingBlockWidth.value = overlapWidth
  }
  
  score.value++
  lastHitInfo.value = { offset: Math.round(offset), perfect: isPerfect }
  
  // 清除提示
  setTimeout(() => { lastHitInfo.value = null }, 500)
  
  // 检查是否方块太小
  if (movingBlockWidth.value < 10) {
    gameOver()
  }
}

const gameOver = () => {
  gameState.value = 'gameover'
  bgm.pause()
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  if (score.value > highScore.value) {
    highScore.value = score.value
    localStorage.setItem('rhythmStackerHighScore', score.value.toString())
  }
}

const close = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
  bgm.pause()
  gameState.value = 'ready'
  emit('update:modelValue', false)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!props.modelValue) return
  if (e.code === 'Space') {
    e.preventDefault()
    handleTap()
  }
}

watch(() => props.modelValue, (show) => {
  if (show) initGame()
  else {
    bgm.pause()
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
  }
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (animationId) cancelAnimationFrame(animationId)
})
</script>

<template>
  <Dialog :model-value="modelValue" @update:model-value="close" :title="t('rhythmstacker.title')" width="360px" :show-close="true">
    <div class="stacker-content" @click="handleTap">
      <div class="score-bar">
        <span>{{ t('rhythmstacker.score') }}: {{ score }}</span>
        <span>{{ t('rhythmstacker.best') }}: {{ highScore }}</span>
      </div>
      
      <div class="game-canvas">
        <svg :viewBox="`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`" class="canvas-svg">
          <!-- 背景网格 -->
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f0f0f0" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <!-- 已堆叠的方块 -->
          <g :transform="`translate(0, ${viewOffset})`">
            <rect
              v-for="(block, index) in blocks"
              :key="index"
              :x="block.x"
              :y="block.y"
              :width="block.width"
              :height="BLOCK_HEIGHT - 2"
              :fill="`hsl(${(index * 15) % 360}, 70%, 60%)`"
              rx="2"
            />
            
            <!-- 移动中的方块 -->
            <rect
              v-if="gameState !== 'gameover'"
              :x="movingBlockX"
              :y="movingBlockY"
              :width="movingBlockWidth"
              :height="BLOCK_HEIGHT - 2"
              :fill="`hsl(${(blocks.length * 15) % 360}, 70%, 50%)`"
              rx="2"
              class="moving-block"
            />
          </g>
        </svg>
        
        <!-- 判定提示 -->
        <Transition name="pop">
          <div v-if="lastHitInfo" class="hit-info" :class="{ perfect: lastHitInfo.perfect }">
            {{ lastHitInfo.perfect ? 'PERFECT!' : `${lastHitInfo.offset}px` }}
          </div>
        </Transition>
        
        <!-- 游戏状态提示 -->
        <div v-if="gameState === 'ready'" class="state-overlay">
          <p>{{ t('rhythmstacker.tapToStart') }}</p>
        </div>
        
        <div v-if="gameState === 'gameover'" class="state-overlay gameover">
          <p class="gameover-title">{{ t('rhythmstacker.gameOver') }}</p>
          <p class="final-score">{{ score }}</p>
          <p class="tap-hint">{{ t('rhythmstacker.tapToRetry') }}</p>
        </div>
      </div>
      
      <p class="hint">{{ t('rhythmstacker.hint') }}</p>
    </div>
  </Dialog>
</template>

<style scoped>
.stacker-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  user-select: none;
}

.score-bar {
  width: 100%;
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #666;
  padding: 0 0.5rem;
}

.game-canvas {
  position: relative;
  width: 300px;
  height: 400px;
  background: #fafafa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.05);
}

.canvas-svg {
  width: 100%;
  height: 100%;
}

.moving-block {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.hit-info {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2rem;
  font-weight: 700;
  color: #666;
  background: rgba(255,255,255,0.9);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.hit-info.perfect {
  color: #22c55e;
  font-size: 1.5rem;
}

.state-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  font-size: 1rem;
  color: #666;
}

.state-overlay.gameover {
  background: rgba(0,0,0,0.8);
  color: #fff;
}

.gameover-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ef4444;
  margin-bottom: 0.5rem;
}

.final-score {
  font-size: 3rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.tap-hint {
  font-size: 0.9rem;
  opacity: 0.7;
}

.hint {
  font-size: 0.8rem;
  color: #999;
  margin: 0;
}

.pop-enter-active { animation: pop 0.2s ease-out; }
.pop-leave-active { animation: pop 0.15s ease-in reverse; }
@keyframes pop {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
</style>
