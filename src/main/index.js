import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import { fileURLToPath } from 'url'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 打开开发者工具
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 选择PDF文件
  ipcMain.handle('select-pdf-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    })
    if (canceled) {
      return []
    }
    return filePaths
  })

  // 保存处理后的ZIP文件
  ipcMain.handle('save-zip-file', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '保存处理后的文件',
      defaultPath: 'processed_pdfs.zip',
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    })
    if (canceled || !filePath) {
      return null
    }
    return filePath
  })

  // 读取文件
  ipcMain.handle('read-file', async (_, filePath) => {
    try {
      const buffer = await fs.promises.readFile(filePath)
      return buffer.toString('base64')
    } catch (error) {
      console.error('Error reading file:', error)
      return null
    }
  })

  // 写入文件
  ipcMain.handle('write-file', async (_, { filePath, data }) => {
    try {
      const buffer = Buffer.from(data, 'base64')
      await fs.promises.writeFile(filePath, buffer)
      return true
    } catch (error) {
      console.error('Error writing file:', error)
      return false
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
