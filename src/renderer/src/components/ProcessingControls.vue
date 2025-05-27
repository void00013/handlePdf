<script setup>
import { ref, defineProps, defineEmits, onMounted } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'


const props = defineProps({
  uploadedFiles: {
    type: Array,
    required: true
  },
  selectedFile: {
    type: Object,
    default: null
  },
  selectedPage: {
    type: Number,
    default: 1
  },
  selectedRegions: {
    type: Array,
    required: true
  },
  processingStatus: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['start-processing'])

// 开始处理PDF文件
const startProcessing = async () => {
  if (props.uploadedFiles.length === 0 || props.selectedRegions.length === 0) {
    alert('请先上传PDF文件并选择要去除的区域')
    return
  }

  console.log(props.uploadedFiles, props.selectedRegions);
  
  
  emit('start-processing')
  
  try {
    // 获取示例页面的尺寸信息
    const templateSize = await getPageSize(props.selectedFile.path, props.selectedPage)
    if (!templateSize) {
      throw new Error('无法获取示例页面尺寸')
    }
    
    const zip = new JSZip()
    let processedCount = 0
    const totalFiles = props.uploadedFiles.length
    
    // 处理每个PDF文件
    for (let i = 0; i < totalFiles; i++) {
      const file = props.uploadedFiles[i]
      props.processingStatus.message = `处理文件 ${i + 1}/${totalFiles}: ${file.name}`
      props.processingStatus.progress = (i / totalFiles) * 100
      
      // 处理单个PDF文件
      const processedPdfData = await processPdf(file.path, templateSize)
      
      if (processedPdfData) {
        // 将处理后的PDF添加到ZIP文件
        const fileName = file.name.replace(/\.pdf$/i, '_processed.pdf')
        zip.file(fileName, processedPdfData, { binary: true })
      }
      
      processedCount++
    }
    
    props.processingStatus.message = '正在生成ZIP文件...';
    props.processingStatus.progress = 95;
    
    // 生成ZIP文件
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    // 保存ZIP文件
    props.processingStatus.message = '正在保存ZIP文件...';
    props.processingStatus.progress = 98;
    
    const savePath = await window.api.saveZipFile()
    if (savePath) {
      // 将Blob转换为Base64
      const reader = new FileReader()
      reader.readAsDataURL(zipBlob)
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1]
        
        // 保存文件
        const result = await window.api.writeFile(savePath, base64data)
        if (result) {
          props.processingStatus.message = '处理完成！'
          props.processingStatus.progress = 100
          setTimeout(() => {
            props.processingStatus.isProcessing = false
          }, 1500)
        } else {
          throw new Error('保存ZIP文件失败')
        }
      }
    } else {
      throw new Error('未选择保存路径')
    }
  } catch (error) {
    console.error('处理PDF文件时出错:', error)
    props.processingStatus.message = `处理失败: ${error.message}`
    setTimeout(() => {
      props.processingStatus.isProcessing = false
    }, 3000)
  }
}

// 获取PDF页面尺寸
const getPageSize = async (filePath, pageNumber) => {
  try {
    // 读取文件内容
    const base64Data = await window.api.readFile(filePath)
    if (!base64Data) {
      throw new Error('无法读取PDF文件')
    }
    
    // 将Base64转换为二进制数组
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: bytes })
    const pdfDocument = await loadingTask.promise
    
    // 获取指定页面
    const page = await pdfDocument.getPage(pageNumber)
    
    // 获取页面尺寸
    const viewport = page.getViewport({ scale: 1.0 })
    
    return {
      width: viewport.width,
      height: viewport.height
    }
  } catch (error) {
    console.error('获取页面尺寸时出错:', error)
    return null
  }
}

// 处理单个PDF文件
const processPdf = async (filePath, templateSize) => {
  try {
    // 读取文件内容
    const base64Data = await window.api.readFile(filePath)
    if (!base64Data) {
      throw new Error('无法读取PDF文件')
    }
    
    // 将Base64转换为二进制数组
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: bytes })
    const pdfDocument = await loadingTask.promise
    
    // 创建一个新的PDF文档
    const { PDFDocument } = await import('pdf-lib')
    const newPdfDoc = await PDFDocument.create()
    
    // 处理每一页
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      props.processingStatus.message = `处理文件: ${filePath.split(/[\\/]/).pop()} - 页面 ${i}/${pdfDocument.numPages}`
      
      // 获取页面
      const page = await pdfDocument.getPage(i)
      
      // 获取页面尺寸
      const viewport = page.getViewport({ scale: 1.0 })
      
      // 检查页面尺寸是否与模板匹配
      const sizeMatches = Math.abs(viewport.width - templateSize.width) < 1 && 
                         Math.abs(viewport.height - templateSize.height) < 1
      
      // 创建canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      // 渲染页面到canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise
      
      // 如果尺寸匹配，处理区域
      if (sizeMatches && props.selectedRegions.length > 0) {
        console.log('处理区域:', props.selectedRegions)
        
        props.selectedRegions.forEach(region => {
          // 如果有百分比坐标，使用百分比坐标计算
          if (region.percentLeft !== undefined && region.percentTop !== undefined) {
            // 使用百分比坐标计算实际像素坐标
            // 注意：PDF.js在渲染时已经处理了坐标系统的转换
            // 我们需要直接使用与Canvas一致的坐标系统
            
            // 计算原始坐标（基于百分比）
            const x = Math.round(viewport.width * region.percentLeft)
            const y = Math.round(viewport.height * region.percentTop)
            const width = Math.round(viewport.width * region.percentWidth)
            const height = Math.round(viewport.height * region.percentHeight)
            
            console.log('计算的坐标:', x, y, width, height)
            console.log('原始百分比:', region.percentLeft, region.percentTop, region.percentWidth, region.percentHeight)
            console.log('当前画布尺寸:', viewport.width, viewport.height)
            
            // 用白色矩形覆盖区域
            context.fillStyle = 'white'
            context.fillRect(x, y, width, height)
          } else {
            // 兼容旧版本的坐标系统
            // 计算实际坐标（考虑缩放）
            const scale = viewport.width / templateSize.width
            const x = region.left * scale
            const y = region.top * scale
            const width = region.width * scale
            const height = region.height * scale
            
            console.log('使用原始坐标覆盖区域:', x, y, width, height)
            
            // 用白色矩形覆盖区域
            context.fillStyle = 'white'
            context.fillRect(x, y, width, height)
          }
        })
      }
      
      
      // 将canvas转换为图片
      const imgData = canvas.toDataURL('image/png')
      
      // 将图片添加到新PDF
      const img = await newPdfDoc.embedPng(imgData)
      const newPage = newPdfDoc.addPage([viewport.width, viewport.height])
      newPage.drawImage(img, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
      })
    }
    
    // 保存新PDF
    const newPdfBytes = await newPdfDoc.save()
    return newPdfBytes
  } catch (error) {
    console.error('处理PDF文件时出错:', error)
    return null
  }
}
</script>

<template>
  <div class="processing-controls">
    <h2>处理控制</h2>
    
    <div class="status-info">
      <div class="status-item">
        <span class="status-label">已上传文件:</span>
        <span class="status-value">{{ uploadedFiles.length }} 个</span>
      </div>
      
      <div class="status-item">
        <span class="status-label">已选择区域:</span>
        <span class="status-value">{{ selectedRegions.length }} 个</span>
      </div>
      
      <div class="status-item" v-if="selectedFile">
        <span class="status-label">示例文件:</span>
        <span class="status-value">{{ selectedFile.name }}</span>
      </div>
      
      <div class="status-item" v-if="selectedFile">
        <span class="status-label">示例页面:</span>
        <span class="status-value">{{ selectedPage }}</span>
      </div>
    </div>
    
    <div class="actions">
      <button 
        class="process-btn" 
        @click="startProcessing"
        :disabled="uploadedFiles.length === 0 || selectedRegions.length === 0 || processingStatus.isProcessing"
      >
        开始处理
      </button>
    </div>
    
    <div class="instructions">
      <h3>操作步骤:</h3>
      <ol>
        <li>上传一个或多个PDF文件</li>
        <li>选择一个文件和页面作为示例</li>
        <li>在示例页面上标记要去除的区域</li>
        <li>点击"开始处理"按钮</li>
        <li>选择保存位置，等待处理完成</li>
      </ol>
      <p class="note">注意: 只有与示例页面尺寸相同的页面会被处理</p>
    </div>
  </div>
</template>

<style scoped>
.processing-controls {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  background-color: #f9f9f9;
}

.status-info {
  margin: 15px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  background-color: #eee;
  border-radius: 4px;
}

.status-label {
  font-weight: bold;
  color: #555;
}

.status-value {
  color: #2196f3;
}

.actions {
  margin: 20px 0;
  text-align: center;
}

.process-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}

.process-btn:hover {
  background-color: #45a049;
}

.process-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.instructions {
  margin-top: 20px;
  padding: 10px;
  background-color: #e8f5e9;
  border-radius: 4px;
  border-left: 4px solid #4caf50;
}

.instructions h3 {
  margin-top: 0;
  color: #2e7d32;
}

.instructions ol {
  padding-left: 20px;
}

.instructions li {
  margin-bottom: 5px;
}

.note {
  font-style: italic;
  color: #f57c00;
  margin-top: 10px;
  font-size: 14px;
}
</style>