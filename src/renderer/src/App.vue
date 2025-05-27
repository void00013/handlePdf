<script setup>
import { ref, reactive } from 'vue'
import PdfUploader from './components/PdfUploader.vue'
import PdfViewer from './components/PdfViewer.vue'
import RegionSelector from './components/RegionSelector.vue'
import ProcessingControls from './components/ProcessingControls.vue'
import { usePdfInfoStore } from './stores/pdfInfo'

const pdfInfoStore = usePdfInfoStore()

// 状态管理
const uploadedFiles = ref([])
const selectedFile = ref(null)
// const selectedPage = ref(1)
const selectedRegions = ref([])
const pdfScale = ref(1.5) // 默认PDF缩放比例
const processingStatus = ref({
  isProcessing: false,
  progress: 0,
  message: ''
})

// 处理上传的PDF文件
const handleFilesUploaded = (files) => {
  uploadedFiles.value = files
  if (files.length > 0 && !selectedFile.value) {
    selectedFile.value = files[0]
    // selectedPage.value = 1
    pdfInfoStore.currentPage = 1
  }
}

// 选择示例文件
const handleFileSelected = (file) => {
  selectedFile.value = file
  // selectedPage.value = 1
  pdfInfoStore.currentPage = 1
}

// 选择示例页面
const handlePageSelected = (page) => {
  // selectedPage.value = page
  pdfInfoStore.currentPage = page
}

// 更新选择的区域
const handleRegionsUpdated = (regions) => {
  selectedRegions.value = regions
}

// 处理PDF缩放比例变化
const handleScaleChanged = (scale) => {
  pdfScale.value = scale
}

// 开始处理PDF文件
const handleStartProcessing = async () => {
  if (uploadedFiles.value.length === 0 || selectedRegions.value.length === 0) {
    alert('请先上传PDF文件并选择要去除的区域')
    return
  }
  
  processingStatus.value.isProcessing = true
  processingStatus.value.progress = 0
  processingStatus.value.message = '准备处理文件...'
  
  // 处理逻辑将在ProcessingControls组件中实现
}
</script>

<template>
  <div class="container">
    <h1 class="title">PDF区域处理工具</h1>
    
    <div class="main-content">
      <div class="left-panel">
        <PdfUploader 
          @files-uploaded="handleFilesUploaded" 
          :uploaded-files="uploadedFiles"
          @file-selected="handleFileSelected"
          :selected-file="selectedFile"
        />
        
        <ProcessingControls 
          :uploaded-files="uploadedFiles"
          :selected-file="selectedFile"
          :selected-page="pdfInfoStore.currentPage"
          :selected-regions="selectedRegions"
          :processing-status="processingStatus"
          @start-processing="handleStartProcessing"
        />
      </div>
      
      <div class="right-panel">
        <div v-if="selectedFile" class="viewer-container">
          <PdfViewer 
            :file="selectedFile" 
            :page="pdfInfoStore.currentPage"
            :initial-scale="pdfScale"
            @page-selected="handlePageSelected"
            @scale-changed="handleScaleChanged"
          />
          
          <RegionSelector 
            v-if="selectedFile" 
            :pdf-scale="pdfScale"
            @regions-updated="handleRegionsUpdated"
          />
        </div>
        <div v-else class="empty-state">
          <p>请上传PDF文件并选择一个示例页面</p>
        </div>
      </div>
    </div>
    
    <div v-if="processingStatus.isProcessing" class="processing-overlay">
      <div class="processing-dialog">
        <h3>正在处理文件</h3>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: processingStatus.progress + '%' }"></div>
        </div>
        <p>{{ processingStatus.message }}</p>
      </div>
    </div>
  </div>
</template>

<style>
.container {
  /* position: absolute;
  left: 50%;
  transform: translateX(-50%); */
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.title {
  text-align: center;
  margin-bottom: 20px;
}

.main-content {
  display: flex;
  gap: 20px;
}

.left-panel {
  min-width: 626px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-panel {
  min-width: 640px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.viewer-container {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.processing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.processing-dialog {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  text-align: center;
}

.progress-bar {
  height: 20px;
  background-color: #eee;
  border-radius: 10px;
  margin: 15px 0;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}
</style>
