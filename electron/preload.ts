import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

interface HotSnippetTrayItem {
  id: string
  title: string
  content: string
}

type AppLanguage = 'en' | 'pt-BR'

interface AppSettingsPayload {
  storagePath: string | null
  minimizeToTray: boolean
  hotSnippetsEnabled: boolean
  language: AppLanguage
}

const electronAPI = {
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),

  onMenuNewSnippet: (callback: () => void) => {
    ipcRenderer.on('menu-new-snippet', callback)
  },

  onMenuSearch: (callback: () => void) => {
    ipcRenderer.on('menu-search', callback)
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  settings: {
    getStorageInfo: (): Promise<{ storagePath: string; isCustomPath: boolean; defaultPath: string }> =>
      ipcRenderer.invoke('settings:get-storage-info'),
    selectFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('settings:select-folder'),
    setStoragePath: (newPath: string, data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('settings:set-storage-path', newPath, data),
    resetStoragePath: (): Promise<boolean> =>
      ipcRenderer.invoke('settings:reset-storage-path'),
    openFolder: (folderPath: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:open-folder', folderPath),
    getAppSettings: (): Promise<AppSettingsPayload> =>
      ipcRenderer.invoke('settings:get-app-settings'),
    setMinimizeToTray: (value: boolean): Promise<boolean> =>
      ipcRenderer.invoke('settings:set-minimize-to-tray', value),
    setHotSnippetsEnabled: (value: boolean): Promise<boolean> =>
      ipcRenderer.invoke('settings:set-hot-snippets-enabled', value),
    setLanguage: (value: AppLanguage): Promise<boolean> =>
      ipcRenderer.invoke('settings:set-language', value),
  },

  fileStorage: {
    load: (): Promise<unknown | null> =>
      ipcRenderer.invoke('file-storage:load'),
    save: (data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('file-storage:save', data),
  },

  tray: {
    updateHotSnippets: (items: HotSnippetTrayItem[]): Promise<boolean> =>
      ipcRenderer.invoke('tray:update-hot-snippets', items),
    onSnippetCopied: (callback: (payload: { snippetId: string }) => void) => {
      ipcRenderer.on('tray:snippet-copied', (_event: IpcRendererEvent, payload: { snippetId: string }) =>
        callback(payload)
      )
    },
    onFocusSnippet: (callback: (payload: { snippetId: string }) => void) => {
      ipcRenderer.on('tray:focus-snippet', (_event: IpcRendererEvent, payload: { snippetId: string }) =>
        callback(payload)
      )
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('tray:snippet-copied')
      ipcRenderer.removeAllListeners('tray:focus-snippet')
    },
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
