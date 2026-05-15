import { contextBridge, ipcRenderer } from 'electron'

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
  },

  fileStorage: {
    load: (): Promise<unknown | null> =>
      ipcRenderer.invoke('file-storage:load'),
    save: (data: unknown): Promise<boolean> =>
      ipcRenderer.invoke('file-storage:save', data),
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
