import { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell, clipboard, nativeImage } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { AppLanguage, getStrings } from './locales'

interface AppSettings {
  storagePath: string | null
  minimizeToTray: boolean
  hotSnippetsEnabled: boolean
  hasShownTrayBalloon: boolean
  language: AppLanguage | null
}

interface HotSnippetTrayItem {
  id: string
  title: string
  content: string
}

const DEFAULT_SETTINGS: AppSettings = {
  storagePath: null,
  minimizeToTray: true,
  hotSnippetsEnabled: true,
  hasShownTrayBalloon: false,
  language: null
}

function detectLanguage(): AppLanguage {
  return app.getLocale().toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

function getSettingsFilePath(): string {
  return path.join(app.getPath('userData'), 'app-settings.json')
}

function readAppSettings(): AppSettings {
  const settingsPath = getSettingsFilePath()
  let settings = { ...DEFAULT_SETTINGS }
  try {
    if (fs.existsSync(settingsPath)) {
      const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      settings = { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {}

  if (!settings.language) {
    settings.language = detectLanguage()
    writeAppSettings(settings)
  }

  return settings
}

function writeAppSettings(settings: AppSettings): void {
  const settingsPath = getSettingsFilePath()
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
}

function patchAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...readAppSettings(), ...patch }
  writeAppSettings(next)
  return next
}

let mainWindow: BrowserWindow
let tray: Tray | null = null
let isQuiting = false
let currentHotSnippets: HotSnippetTrayItem[] = []

function getIconPath(): string | undefined {
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

function truncateLabel(text: string, max = 40, language: AppLanguage = 'en'): string {
  if (!text) return getStrings(language).untitled
  return text.length > max ? text.slice(0, max) + '…' : text
}

function showMainWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function buildTrayMenu(): Menu {
  const settings = readAppSettings()
  const language = settings.language ?? 'en'
  const strings = getStrings(language)
  const template: Electron.MenuItemConstructorOptions[] = [
    { label: strings.appName, enabled: false },
    { type: 'separator' }
  ]

  if (settings.hotSnippetsEnabled) {
    template.push({ label: strings.hotSnippets, enabled: false })

    if (currentHotSnippets.length === 0) {
      template.push({ label: strings.noHotSnippets, enabled: false })
    } else {
      for (const snippet of currentHotSnippets) {
        template.push({
          label: `   📋 ${truncateLabel(snippet.title, 40, language)}`,
          click: () => {
            clipboard.writeText(snippet.content)
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('tray:snippet-copied', { snippetId: snippet.id })
            }
            try {
              tray?.displayBalloon({
                title: strings.copied,
                content: snippet.title,
                iconType: 'info'
              })
            } catch {}
          }
        })
      }
    }

    template.push({ type: 'separator' })
  }

  template.push(
    { label: strings.openApp, click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: strings.quit,
      click: () => {
        isQuiting = true
        app.quit()
      }
    }
  )

  return Menu.buildFromTemplate(template)
}

function refreshTrayMenu(): void {
  if (!tray) return
  tray.setContextMenu(buildTrayMenu())
}

function createTray(): void {
  const iconPath = getIconPath()
  const trayIcon = iconPath
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(trayIcon)
  tray.setToolTip(getStrings(readAppSettings().language ?? 'en').appName)
  refreshTrayMenu()

  tray.on('click', () => showMainWindow())
  tray.on('double-click', () => showMainWindow())
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
    icon: iconPath
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

  mainWindow.on('close', (event) => {
    if (isQuiting) return
    const settings = readAppSettings()
    if (!settings.minimizeToTray) return

    event.preventDefault()
    mainWindow.hide()

    if (!settings.hasShownTrayBalloon && tray) {
      try {
        const strings = getStrings(settings.language ?? 'en')
        tray.displayBalloon({
          title: strings.trayBalloonTitle,
          content: strings.trayBalloonContent,
          iconType: 'info'
        })
        patchAppSettings({ hasShownTrayBalloon: true })
      } catch {}
    }
  })

  Menu.setApplicationMenu(null)
}

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform === 'darwin') return
  const settings = readAppSettings()
  if (!settings.minimizeToTray) app.quit()
})

app.on('before-quit', () => {
  isQuiting = true
})

ipcMain.handle('copy-to-clipboard', async (_, text: string) => {
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
  const language = readAppSettings().language ?? 'en'
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: getStrings(language).selectFolderTitle
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('settings:set-storage-path', async (_, newPath: string, data: unknown) => {
  const dataPath = path.join(newPath, 'snippets-data.json')
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
  patchAppSettings({ storagePath: newPath })
  return true
})

ipcMain.handle('settings:reset-storage-path', async () => {
  patchAppSettings({ storagePath: null })
  return true
})

ipcMain.handle('settings:open-folder', async (_, folderPath: string) => {
  shell.openPath(folderPath)
  return true
})

ipcMain.handle('settings:get-app-settings', async () => {
  const s = readAppSettings()
  return {
    storagePath: s.storagePath,
    minimizeToTray: s.minimizeToTray,
    hotSnippetsEnabled: s.hotSnippetsEnabled,
    language: s.language ?? 'en'
  }
})

ipcMain.handle('settings:set-minimize-to-tray', async (_, value: boolean) => {
  patchAppSettings({ minimizeToTray: !!value })
  return true
})

ipcMain.handle('settings:set-hot-snippets-enabled', async (_, value: boolean) => {
  patchAppSettings({ hotSnippetsEnabled: !!value })
  refreshTrayMenu()
  return true
})

ipcMain.handle('settings:set-language', async (_, value: AppLanguage) => {
  patchAppSettings({ language: value })
  refreshTrayMenu()
  if (tray) tray.setToolTip(getStrings(value).appName)
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

ipcMain.handle('tray:update-hot-snippets', async (_, items: HotSnippetTrayItem[]) => {
  currentHotSnippets = Array.isArray(items) ? items.slice(0, 10) : []
  refreshTrayMenu()
  return true
})
