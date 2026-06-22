export interface Snippet {
  id: string
  title: string
  description: string
  content: string
  language: string
  tags: string[]
  category: string
  folderId?: string
  projectId?: string
  favorite: boolean
  isHot?: boolean
  createdAt: string
  updatedAt: string
  usage_count: number
  lastUsed?: string
}

export interface Category {
  id: string
  name: string
  color: string
  snippetCount: number
}

export interface Project {
  id: string
  name: string
  description: string
  snippetCount: number
}

export interface Tag {
  id: string
  name: string
  color: string
  snippetCount: number
}

export interface Folder {
  id: string
  name: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface ProjectItem {
  id: string
  name: string
  description?: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface SearchResult {
  snippet: Snippet
  score: number
  matches: {
    field: string
    indices: number[][]
  }[]
}

export interface TicketLog {
  id: string
  ticketNumber: string
  problemDescription: string
  ticketUrl?: string
  snippetId?: string
  snippetTitle?: string
  createdAt: string
  updatedAt: string
}

export interface AppState {
  snippets: Snippet[]
  categories: Category[]
  projects: Project[]
  tags: Tag[]
  folders: Folder[]
  projectItems: ProjectItem[]
  ticketLogs: TicketLog[]
  selectedSnippet: Snippet | null
  searchQuery: string
  searchResults: SearchResult[]
  sidebarTab: 'categories' | 'projects' | 'tags'
  selectedFolderId: string | null
  selectedProjectId: string | null
  selectedItem: string | null
  isLoading: boolean
  error: string | null
}

export interface StorageInfo {
  storagePath: string
  isCustomPath: boolean
  defaultPath: string
}

export type AppLanguage = 'en' | 'pt-BR'

export interface AppSettings {
  storagePath: string | null
  minimizeToTray: boolean
  hotSnippetsEnabled: boolean
  language: AppLanguage
}

export interface HotSnippetTrayItem {
  id: string
  title: string
  content: string
}

export const HOT_SNIPPETS_LIMIT = 10

declare global {
  interface Window {
    electronAPI: {
      copyToClipboard: (text: string) => Promise<boolean>
      onMenuNewSnippet: (callback: () => void) => void
      onMenuSearch: (callback: () => void) => void
      removeAllListeners: (channel: string) => void
      settings: {
        getStorageInfo: () => Promise<StorageInfo>
        selectFolder: () => Promise<string | null>
        setStoragePath: (newPath: string, data: unknown) => Promise<boolean>
        resetStoragePath: () => Promise<boolean>
        openFolder: (folderPath: string) => Promise<boolean>
        getAppSettings: () => Promise<AppSettings>
        setMinimizeToTray: (value: boolean) => Promise<boolean>
        setHotSnippetsEnabled: (value: boolean) => Promise<boolean>
        setLanguage: (value: AppLanguage) => Promise<boolean>
      }
      fileStorage: {
        load: () => Promise<unknown | null>
        save: (data: unknown) => Promise<boolean>
      }
      tray: {
        updateHotSnippets: (items: HotSnippetTrayItem[]) => Promise<boolean>
        onSnippetCopied: (callback: (payload: { snippetId: string }) => void) => void
        onFocusSnippet: (callback: (payload: { snippetId: string }) => void) => void
        removeListeners: () => void
      }
    }
  }
}