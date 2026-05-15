import { StorageData } from './storage'

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.fileStorage
}

export async function loadFromFile(): Promise<StorageData | null> {
  if (!isElectron()) return null
  try {
    const data = await window.electronAPI.fileStorage.load()
    return (data as StorageData) ?? null
  } catch {
    return null
  }
}

export function saveToFile(data: StorageData): void {
  if (!isElectron()) return
  window.electronAPI.fileStorage.save(data).catch(() => {})
}
