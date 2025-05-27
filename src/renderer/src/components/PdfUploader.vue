<script setup>
import { ref, defineProps, defineEmits } from 'vue'

const props = defineProps({
  uploadedFiles: {
    type: Array,
    required: true
  },
  selectedFile: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['files-uploaded', 'file-selected'])

// 选择PDF文件
const selectFiles = async () => {
  try {
    const filePaths = await window.api.selectPdfFiles()
    if (filePaths && filePaths.length > 0) {
      const files = await Promise.all(
        filePaths.map(async (path) => {
          return {
            path,
            name: path.split(/[\\/]/).pop(),
            selected: false
          }
        })
      )
      emit('files-uploaded', files)
    }
  } catch (error) {
    console.error('Error selecting PDF files:', error)
    alert('选择PDF文件时出错: ' + error.message)
  }
}

// 选择文件作为示例
const selectFile = (file) => {
  emit('file-selected', file)
}

// 删除文件
const removeFile = (index) => {
  const newFiles = [...props.uploadedFiles]
  newFiles.splice(index, 1)
  emit('files-uploaded', newFiles)
  
  // 如果删除的是当前选中的文件，则重置选中状态
  if (props.selectedFile && props.selectedFile.path === props.uploadedFiles[index].path) {
    emit('file-selected', newFiles.length > 0 ? newFiles[0] : null)
  }
}
</script>

<template>
  <div class="uploader-container">
    <h2>PDF文件上传</h2>
    
    <div class="upload-actions">
      <button class="upload-btn" @click="selectFiles">选择PDF文件</button>
      <span class="file-count" v-if="uploadedFiles.length > 0">
        已上传 {{ uploadedFiles.length }} 个文件
      </span>
    </div>
    
    <div class="file-list" v-if="uploadedFiles.length > 0">
      <div 
        v-for="(file, index) in uploadedFiles" 
        :key="file.path"
        class="file-item"
        :class="{ 'selected': selectedFile && selectedFile.path === file.path }"
        @click="selectFile(file)"
      >
        <div class="file-name">{{ file.name }}</div>
        <button class="remove-btn" @click.stop="removeFile(index)">删除</button>
      </div>
    </div>
    
    <div class="empty-list" v-else>
      <p>未上传任何PDF文件</p>
    </div>
  </div>
</template>

<style scoped>
.uploader-container {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  background-color: #f9f9f9;
}

.upload-actions {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.upload-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.upload-btn:hover {
  background-color: #45a049;
}

.file-count {
  margin-left: 15px;
  font-size: 14px;
  color: #666;
}

.file-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background-color: #f0f0f0;
}

.file-item.selected {
  background-color: #e3f2fd;
}

.file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.remove-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn:hover {
  background-color: #d32f2f;
}

.empty-list {
  text-align: center;
  padding: 20px;
  color: #666;
  font-style: italic;
}
</style>