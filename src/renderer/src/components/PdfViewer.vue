<script setup>
import { ref, onMounted, watch, watchEffect, defineProps, defineEmits } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import { usePdfInfoStore } from '../stores/pdfInfo'

const pdfInfoStore = usePdfInfoStore()

console.log(pdfjsLib);
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  page: {
    type: Number,
    default: 1
  },
  initialScale: {
    type: Number,
    default: 1.5
  }
})

const emit = defineEmits(['page-selected', 'scale-changed'])

const canvas = ref(null)
let pdfDocument = null
// const pageCount = ref(0)
// const currentPage = ref(props.page)
const isLoading = ref(false)
const error = ref(null)
const scale = ref(props.initialScale) // 使用传入的缩放比例
const pdfOriginalWidth = ref(0) // 原始PDF宽度
const pdfOriginalHeight = ref(0) // 原始PDF高度
let currentRenderTask = null
let lastRenderPromise = Promise.resolve()

// 加载PDF文件
const loadPdf = async () => {
  if (!props.file) return
  
  try {
    isLoading.value = true
    error.value = null
    
    // 读取文件内容
    const base64Data = await window.api.readFile(props.file.path)
    if (!base64Data) {
      throw new Error('无法读取PDF文件')
    }
    
    // 将Base64转换为二进制数组
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    console.log(1);
    
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: bytes })
    pdfDocument = await loadingTask.promise
    console.log(pdfDocument);
    // console.log(pdfDocument.getPage);
    
    // pageCount.value = pdfDocument.numPages
    pdfInfoStore.pageCount = pdfDocument.numPages
    console.log(2);
    
    
    // 确保当前页面在有效范围内
    // if (pdfInfoStore.currentPage > pageCount.value) {
    if (pdfInfoStore.currentPage > pdfInfoStore.pageCount) {
      pdfInfoStore.currentPage = 1
      emit('page-selected', 1)
    }
    
    // 渲染当前页面
    renderPage(pdfInfoStore.currentPage)
  } catch (err) {
    console.error('Error loading PDF:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// 渲染指定页面
const renderPage = async (pageNumber) => {
  if (!pdfDocument) return

  // 等待上一次渲染完成或被取消
  await lastRenderPromise.catch(() => {})

  // 取消上一次渲染
  if (currentRenderTask) {
    currentRenderTask.cancel()
    currentRenderTask = null
  }

  let renderResolve, renderReject
  lastRenderPromise = new Promise((resolve, reject) => {
    renderResolve = resolve
    renderReject = reject
  })

  try {
    isLoading.value = true
    
    // 获取页面
    const page = await pdfDocument.getPage(pageNumber)
    
    // 获取原始PDF尺寸
    const originalViewport = page.getViewport({ scale: 1.0 })
    pdfOriginalWidth.value = originalViewport.width
    pdfOriginalHeight.value = originalViewport.height
    
    // 使用固定的缩放比例，而不是自适应容器宽度
    // 这样可以确保PDF预览的尺寸始终与实际PDF尺寸成比例
    scale.value = 1.0 // 使用原始尺寸
    
    // 设置缩放和视口
    const viewport = page.getViewport({ scale: scale.value })

    console.log('视口宽度：', viewport.width);
    console.log('视口高度：', viewport.height);
    
    // 通知scale变化
    emit('scale-changed', scale.value)
    
    // 设置canvas尺寸
    const context = canvas.value.getContext('2d')
    canvas.value.height = viewport.height
    canvas.value.width = viewport.width
    
    // 渲染页面
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    
    currentRenderTask = page.render(renderContext)
    await currentRenderTask.promise
    currentRenderTask = null
    renderResolve()
  } catch (err) {
    renderReject(err)
    if (err && err.name === 'RenderingCancelledException') {
      // 忽略被取消的渲染
      return
    }
    console.error('Error rendering page:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// 切换页面
// const changePage = (newPage) => {
//   // if (newPage < 1 || newPage > pageCount.value) return
//   if (newPage < 1 || newPage > pdfInfoStore.pageCount) return
  
//   pdfInfoStore.currentPage = newPage
//   emit('page-selected', newPage)
//   renderPage(newPage)
// }

// 监听文件变化
watch(() => props.file, () => {
  if (props.file) {
    loadPdf()
  }
}, { immediate: true })

// 监听页面变化
// watch(() => pdfInfoStore.currentPage, (newPage) => {
//     renderPage(newPage)
// }, {
//   immediate: true
// })

watchEffect(() => {
  renderPage(pdfInfoStore.currentPage)
})

// 监听缩放比例变化
watch(() => props.initialScale, (newScale) => {
  if (newScale !== scale.value) {
    scale.value = newScale
    if (pdfDocument && pdfInfoStore.currentPage) {
      renderPage(pdfInfoStore.currentPage)
    }
  }
})

onMounted(async () => {
  if (props.file) {
    loadPdf()
  }
})
</script>

<template>
  <div class="pdf-viewer">
    <!-- <div class="toolbar">
      <h3>PDF预览</h3>
      <div class="page-controls" v-if="pageCount > 0">
        <button 
          class="page-btn" 
          :disabled="pdfInfoStore.currentPage <= 1" 
          @click="changePage(pdfInfoStore.currentPage - 1)"
        >
          上一页
        </button>
        
        <span class="page-info">
          {{ pdfInfoStore.currentPage }} / {{ pageCount }}
        </span>
        
        <button 
          class="page-btn" 
          :disabled="pdfInfoStore.currentPage >= pageCount" 
          @click="changePage(pdfInfoStore.currentPage + 1)"
        >
          下一页
        </button>
      </div>
    </div> -->
    
    <div class="canvas-container">
      <div v-if="isLoading" class="loading">
        <span>加载中...</span>
      </div>
      
      <div v-else-if="error" class="error">
        <span>{{ error }}</span>
      </div>
      
      <canvas ref="canvas" class="pdf-canvas"></canvas>
      
      <div class="pdf-info">
        <div>原始PDF尺寸: {{ pdfOriginalWidth }} x {{ pdfOriginalHeight }}</div>
        <div>当前显示尺寸: {{ canvas?.width || 0 }} x {{ canvas?.height || 0 }}</div>
        <div>缩放比例: {{ scale }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
  padding-top: 106px;
}

/* .toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #eee;
  border-bottom: 1px solid #ddd;
} */

.page-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* .page-btn {
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
} */

/* .page-info {
  font-size: 14px;
} */

.canvas-container {
  flex: 1;
  overflow: auto; /* 允许滚动 */
  display: block; /* 改为块级显示 */
  padding: 20px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  /* 不再使用flex布局居中，而是让内容保持原始尺寸，允许滚动 */
}

.pdf-canvas {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  background-color: white;
}

.loading, .error {
  /* position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0; */
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.8);
}

.error {
  color: #f44336;
}
</style>