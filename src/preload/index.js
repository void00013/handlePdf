import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 选择PDF文件
  selectPdfFiles: () => ipcRenderer.invoke('select-pdf-files'),
  
  // 保存ZIP文件
  saveZipFile: () => ipcRenderer.invoke('save-zip-file'),
  
  // 读取文件
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // 写入文件
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', { filePath, data })
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
