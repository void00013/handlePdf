<script setup>
import { ref, onMounted, onUnmounted, watch, defineEmits, defineProps } from 'vue'
import { fabric } from 'fabric'
import { usePdfInfoStore } from '../stores/pdfInfo'

const pdfInfoStore = usePdfInfoStore()

const props = defineProps({
  pdfScale: {
    type: Number,
    default: 1.5 // 默认与PdfViewer中的scale保持一致
  }
})

const emit = defineEmits(['regions-updated'])

const canvasContainer = ref(null)
const fabricCanvas = ref(null)
const regions = ref([])
const isDrawing = ref(false)
const startPoint = ref({ x: 0, y: 0 })
const activeRegion = ref(null)
const currentScale = ref(1) // 用于跟踪当前PDF的缩放比例

// 初始化Fabric.js画布
const initCanvas = () => {
  if (!canvasContainer.value) return
  
  // 获取PDF画布的尺寸
  const pdfCanvas = document.querySelector('.pdf-canvas')
  if (!pdfCanvas) {
    setTimeout(initCanvas, 500) // 如果PDF画布还没准备好，稍后再试
    return
  }

  console.log('pdf画布', pdfCanvas);
  
  // 直接使用PDF画布的实际尺寸，确保两者完全一致
  const width = pdfCanvas.width
  const height = pdfCanvas.height
  console.log('设置区域选择器尺寸:', width, height)
  currentScale.value = 1.0 // 使用原始尺寸
  
  // 创建Fabric.js画布
  fabricCanvas.value = new fabric.Canvas('region-canvas', {
    width,
    height,
    selection: true, // 允许选择
    selectionKey: 'ctrlKey' // 只有按Ctrl才允许框选多个
  })
  
  // 设置画布事件
  fabricCanvas.value.on('mouse:down', onMouseDown)
  fabricCanvas.value.on('mouse:move', onMouseMove)
  fabricCanvas.value.on('mouse:up', onMouseUp)
  fabricCanvas.value.on('object:modified', updateRegions)
  fabricCanvas.value.on('object:removed', updateRegions)
}

// 鼠标按下事件
const onMouseDown = (options) => {
  // 如果点击了现有区域，不开始新的绘制
  if (options.target) return
  
  isDrawing.value = true
  const pointer = fabricCanvas.value.getPointer(options.e)
  startPoint.value = { x: pointer.x, y: pointer.y }
  
  // 创建新矩形
  const rect = new fabric.Rect({
    left: pointer.x,
    top: pointer.y,
    width: 0,
    height: 0,
    fill: 'rgba(255, 0, 0, 0.3)',
    stroke: 'red',
    strokeWidth: 1,
    selectable: true,
    hasControls: true,
    hasBorders: true
  })
  
  fabricCanvas.value.add(rect)
  activeRegion.value = rect
}

// 鼠标移动事件
const onMouseMove = (options) => {
  if (!isDrawing.value || !activeRegion.value) return
  
  const pointer = fabricCanvas.value.getPointer(options.e)
  
  // 计算矩形的宽度和高度
  let width = pointer.x - startPoint.value.x
  let height = pointer.y - startPoint.value.y
  
  // 处理负值情况
  if (width < 0) {
    activeRegion.value.set('left', pointer.x)
    width = Math.abs(width)
  }
  
  if (height < 0) {
    activeRegion.value.set('top', pointer.y)
    height = Math.abs(height)
  }
  
  activeRegion.value.set({
    width: width,
    height: height
  })
  
  fabricCanvas.value.renderAll()
}

// 鼠标释放事件
const onMouseUp = () => {
  isDrawing.value = false
  
  // 如果矩形太小，则删除
  if (activeRegion.value && (activeRegion.value.width < 10 || activeRegion.value.height < 10)) {
    fabricCanvas.value.remove(activeRegion.value)
  }
  
  activeRegion.value = null
  updateRegions()
}

// 更新区域列表
const updateRegions = () => {
  const objects = fabricCanvas.value.getObjects()
  const pdfCanvas = document.querySelector('.pdf-canvas')
  
  if (!pdfCanvas) return
  
  // 获取PDF画布的实际尺寸
  const canvasWidth = pdfCanvas.width
  const canvasHeight = pdfCanvas.height
  
  // 将画布上的坐标转换为原始PDF坐标
  regions.value = objects.map(obj => {
    // 计算对象在画布上的实际坐标
    const left = Math.round(obj.left)
    const top = Math.round(obj.top)
    const width = Math.round(obj.width * obj.scaleX)
    const height = Math.round(obj.height * obj.scaleY)
    
    // 计算对象在原始PDF中的比例坐标（百分比）
    const percentLeft = left / canvasWidth
    const percentTop = top / canvasHeight
    const percentWidth = width / canvasWidth
    const percentHeight = height / canvasHeight
    
    return {
      // 原始像素坐标
      left,
      top,
      width,
      height,
      // 比例坐标（用于处理不同尺寸的PDF）
      percentLeft,
      percentTop,
      percentWidth,
      percentHeight,
      // 保存原始坐标用于显示
      displayLeft: left,
      displayTop: top,
      displayWidth: width,
      displayHeight: height,
      // 保存画布尺寸信息
      canvasWidth,
      canvasHeight
    }
  })
  
  console.log('更新区域:', regions.value)
  emit('regions-updated', regions.value)
}

// 删除选中的区域
const deleteSelectedRegion = () => {
  const activeObject = fabricCanvas.value.getActiveObject()
  console.log(fabricCanvas.value);
  console.log(activeObject);
  
  if (activeObject) {
    fabricCanvas.value.remove(activeObject)
    updateRegions()
  }
}

// 清除所有区域
const clearAllRegions = () => {
  fabricCanvas.value.clear()
  regions.value = []
  emit('regions-updated', [])
}

// 监听键盘事件
const handleKeyDown = (e) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    deleteSelectedRegion()
  }
}

// 监听PDF画布变化
const handlePdfCanvasChange = () => {
  const pdfCanvas = document.querySelector('.pdf-canvas')
  if (!pdfCanvas || !fabricCanvas.value) return
  
  // 更新当前缩放比例
  currentScale.value = props.pdfScale
  
  // 调整区域选择画布的尺寸
  fabricCanvas.value.setDimensions({
    width: pdfCanvas.width,
    height: pdfCanvas.height
  })
}

// 监听PDF页面变化
watch(() => document.querySelector('.pdf-canvas'), (newCanvas) => {
  if (newCanvas && fabricCanvas.value) {
    handlePdfCanvasChange()
    // 清除旧区域
    clearAllRegions()
  }
})

// 切换页面
const changePage = (newPage) => {
  if (newPage < 1 || newPage > pdfInfoStore.pageCount) return
  pdfInfoStore.currentPage = newPage
}



onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  // 等待PDF画布加载完成
  setTimeout(() => {
    initCanvas()
  }, 5000)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  
  if (fabricCanvas.value) {
    fabricCanvas.value.dispose()
  }
})
</script>

<template>
  <div class="region-selector" ref="canvasContainer">
    <div class="toolbar">
      <h3>区域选择</h3>
      <div class="region-controls">
        <button class="control-btn" @click="clearAllRegions">清除所有区域</button>
        <button class="control-btn" @click="deleteSelectedRegion">删除选中区域</button>
      </div>
    </div>
    <div class="preview-toolbar">
      <h3>PDF预览</h3>
      <div class="page-controls" v-if="pdfInfoStore.pageCount > 0">
        <button 
          class="page-btn" 
          :disabled="pdfInfoStore.currentPage <= 1" 
          @click="changePage(pdfInfoStore.currentPage - 1)"
        >
          上一页
        </button>
        
        <span class="page-info">
          {{ pdfInfoStore.currentPage }} / {{ pdfInfoStore.pageCount }}
        </span>
        
        <button 
          class="page-btn" 
          :disabled="pdfInfoStore.currentPage >= pdfInfoStore.pageCount" 
          @click="changePage(pdfInfoStore.currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div>
    
    <div class="canvas-wrapper">
      <canvas id="region-canvas"></canvas>
    </div>
    
    <div class="region-info" v-if="regions.length > 0">
      <h4>已选择 {{ regions.length }} 个区域:</h4>
      <div class="region-list">
        <div v-for="(region, index) in regions" :key="index" class="region-item">
          区域 {{ index + 1 }}: {{ region.displayLeft || region.left }},{{ region.displayTop || region.top }} ({{ region.displayWidth || region.width }}x{{ region.displayHeight || region.height }})
          <div class="region-note">原始坐标: {{ region.left }},{{ region.top }} ({{ region.width }}x{{ region.height }})</div>
          <div class="region-note">百分比坐标: {{ (region.percentLeft * 100).toFixed(2) }}%, {{ (region.percentTop * 100).toFixed(2) }}% ({{ (region.percentWidth * 100).toFixed(2) }}% x {{ (region.percentHeight * 100).toFixed(2) }}%)</div>
          <div class="region-note">画布尺寸: {{ region.canvasWidth }} x {{ region.canvasHeight }}</div>
        </div>
      </div>
    </div>
    
    <div :class="{
      instructions: true,
      'instructions-top': regions.length === 0
    }">
      <p>操作说明:</p>
      <ul>
        <li>点击并拖动鼠标在PDF上绘制要去除的区域</li>
        <li>可以调整已绘制区域的大小和位置</li>
        <li>选中区域后按Delete键可删除</li>
        <li>所有选中的区域将在处理时被去除</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.region-note {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}
.canvas-wrapper {
  position: relative;
  width: auto; /* 不再强制宽度为100% */
  height: auto; /* 不再强制高度为100% */
  overflow: visible; /* 允许内容超出显示 */
  display: block;
  padding: 20px;
  /* padding-top: 73px; */
}
.region-selector {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  z-index: 1; /* 降低z-index值，确保不覆盖PDF查看器 */
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: rgba(238, 238, 238, 0.8);
  border-bottom: 1px solid #ddd;
  pointer-events: auto;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #eee;
  border-bottom: 1px solid #ddd;
  pointer-events: auto;
}

.page-btn {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
}

.region-controls {
  display: flex;
  gap: 10px;
}

.control-btn {
  background-color: #ff5722;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.control-btn:hover {
  background-color: #e64a19;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  pointer-events: auto;
}

#region-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.region-info {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px;
  /* padding-top: 100px; */
  margin-top: 85px;
  border-top: 1px solid #ddd;
  max-height: none; /* 移除高度限制 */
  overflow-y: visible; /* 替换为 visible 来移除滚动条 */
  pointer-events: auto;
  /* position: absolute; */
  bottom: 0; /* 固定在底部 */
  left: 0;
  right: 0;
  z-index: 10; /* 确保在其他元素之上 */
  border: 1px solid #ccc;
}

.region-list {
  display: flex;
  flex-direction: column; /* 改为列布局，每个区域占一行 */
  gap: 10px;
  margin-bottom: 10px;
}

.region-item {
  background-color: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  width: 100%;
  box-sizing: border-box;
  border-left: 3px solid #ff5722;
}

.instructions {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 10px;
  border-top: 1px solid #ddd;
  font-size: 12px;
  pointer-events: auto;
  border: 1px solid #ccc;
}

.instructions-top {
  margin-top: 85px;
}

.instructions ul {
  margin: 5px 0;
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 3px;
}
</style>