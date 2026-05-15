import { app, BrowserWindow, ipcMain, Menu, dialog, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

interface AppSettings {
  storagePath: string | null
}

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), 'app-settings.json')
}

function readAppSettings(): AppSettings {
  const settingsPath = getSettingsFilePath()
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    }
  } catch {}
  return { storagePath: null }
}

function writeAppSettings(settings: AppSettings): void {
  const settingsPath = getSettingsFilePath()
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
}

let mainWindow: BrowserWindow

function getIconPath(): string | undefined {
  // Tenta encontrar o ícone em diferentes localizações
  const possiblePaths = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../build/icon.png'),
    path.join(process.resourcesPath, 'build/icon.ico'),
    path.join(process.resourcesPath, 'build/icon.png')
  ]

  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath
    }
  }

  return undefined
}

function createWindow(): void {
  const iconPath = getIconPath()

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#ffffff',
    icon: iconPath // Define o ícone da janela
  })

  const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged
  
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Remove o menu da aplicação
  Menu.setApplicationMenu(null)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('copy-to-clipboard', async (_, text: string) => {
  const { clipboard } = require('electron')
  clipboard.writeText(text)
  return true
})

ipcMain.handle('settings:get-storage-info', async () => {
  const settings = readAppSettings()
  return {
    storagePath: settings.storagePath ?? app.getPath('userData'),
    isCustomPath: settings.storagePath !== null,
    defaultPath: app.getPath('userData')
  }
})

ipcMain.handle('settings:select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Selecionar pasta para salvar snippets'
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('settings:set-storage-path', async (_, newPath: string, data: unknown) => {
  const dataPath = path.join(newPath, 'snippets-data.json')
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
  writeAppSettings({ storagePath: newPath })
  return true
})

ipcMain.handle('settings:reset-storage-path', async () => {
  writeAppSettings({ storagePath: null })
  return true
})

ipcMain.handle('settings:open-folder', async (_, folderPath: string) => {
  shell.openPath(folderPath)
  return true
})

ipcMain.handle('file-storage:load', async () => {
  const settings = readAppSettings()
  if (!settings.storagePath) return null
  const dataPath = path.join(settings.storagePath, 'snippets-data.json')
  if (!fs.existsSync(dataPath)) return null
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'))
})

ipcMain.handle('file-storage:save', async (_, data: unknown) => {
  const settings = readAppSettings()
  if (!settings.storagePath) return false
  const dataPath = path.join(settings.storagePath, 'snippets-data.json')
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
  return true
})