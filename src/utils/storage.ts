import { Snippet, Category, Project, Tag, Folder, ProjectItem, TicketLog } from '../types'

const STORAGE_KEYS = {
  SNIPPETS: 'snippets-app-snippets',
  CATEGORIES: 'snippets-app-categories',
  PROJECTS: 'snippets-app-projects',
  TAGS: 'snippets-app-tags',
  FOLDERS: 'snippets-app-folders',
  PROJECT_ITEMS: 'snippets-app-project-items',
  TICKET_LOGS: 'snippets-app-ticket-logs',
  SETTINGS: 'snippets-app-settings'
}

const WRITE_DEBOUNCE_MS = 250

export interface StorageData {
  snippets: Snippet[]
  categories: Category[]
  projects: Project[]
  tags: Tag[]
  folders: Folder[]
  projectItems: ProjectItem[]
  ticketLogs: TicketLog[]
}

class Storage {
  private supported: boolean
  private pending = new Map<string, unknown>()
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.supported = this.checkSupport()
    if (this.supported && typeof window !== 'undefined') {
      // Flush pending writes before unload so we never lose data
      window.addEventListener('beforeunload', () => this.flush())
      window.addEventListener('pagehide', () => this.flush())
    }
  }

  private checkSupport(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false
      const probe = '__snippet_probe__'
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  }

  private scheduleWrite(): void {
    if (this.timer) return
    this.timer = setTimeout(() => this.flush(), WRITE_DEBOUNCE_MS)
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (!this.supported || this.pending.size === 0) return

    for (const [key, value] of this.pending) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Error saving to localStorage: ${key}`, error)
      }
    }
    this.pending.clear()
  }

  private saveToStorage<T>(key: string, data: T): boolean {
    if (!this.supported) return false
    this.pending.set(key, data)
    this.scheduleWrite()
    return true
  }

  private loadFromStorage<T>(key: string, defaultValue: T): T {
    if (!this.supported) return defaultValue

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return defaultValue

      return JSON.parse(stored)
    } catch (error) {
      console.error(`Error loading from localStorage: ${key}`, error)
      return defaultValue
    }
  }

  // Snippets
  saveSnippets(snippets: Snippet[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.SNIPPETS, snippets)
  }

  loadSnippets(): Snippet[] {
    return this.loadFromStorage<Snippet[]>(STORAGE_KEYS.SNIPPETS, [])
  }

  // Categories
  saveCategories(categories: Category[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.CATEGORIES, categories)
  }

  loadCategories(): Category[] {
    return this.loadFromStorage<Category[]>(STORAGE_KEYS.CATEGORIES, [])
  }

  // Projects
  saveProjects(projects: Project[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.PROJECTS, projects)
  }

  loadProjects(): Project[] {
    return this.loadFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, [])
  }

  // Tags
  saveTags(tags: Tag[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.TAGS, tags)
  }

  loadTags(): Tag[] {
    return this.loadFromStorage<Tag[]>(STORAGE_KEYS.TAGS, [])
  }

  // Folders
  saveFolders(folders: Folder[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.FOLDERS, folders)
  }

  loadFolders(): Folder[] {
    return this.loadFromStorage<Folder[]>(STORAGE_KEYS.FOLDERS, [])
  }

  // Project Items
  saveProjectItems(projectItems: ProjectItem[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.PROJECT_ITEMS, projectItems)
  }

  loadProjectItems(): ProjectItem[] {
    return this.loadFromStorage<ProjectItem[]>(STORAGE_KEYS.PROJECT_ITEMS, [])
  }

  // Ticket Logs
  saveTicketLogs(ticketLogs: TicketLog[]): boolean {
    return this.saveToStorage(STORAGE_KEYS.TICKET_LOGS, ticketLogs)
  }

  loadTicketLogs(): TicketLog[] {
    return this.loadFromStorage<TicketLog[]>(STORAGE_KEYS.TICKET_LOGS, [])
  }

  // Load all data
  loadAllData(): StorageData {
    return {
      snippets: this.loadSnippets(),
      categories: this.loadCategories(),
      projects: this.loadProjects(),
      tags: this.loadTags(),
      folders: this.loadFolders(),
      projectItems: this.loadProjectItems(),
      ticketLogs: this.loadTicketLogs()
    }
  }

  // Save all data (flush immediately for explicit bulk save)
  saveAllData(data: StorageData): boolean {
    this.saveSnippets(data.snippets)
    this.saveCategories(data.categories)
    this.saveProjects(data.projects)
    this.saveTags(data.tags)
    this.saveFolders(data.folders)
    this.saveProjectItems(data.projectItems)
    this.saveTicketLogs(data.ticketLogs)
    this.flush()
    return true
  }

  // Clear all data
  clearAllData(): boolean {
    if (!this.supported) return false

    try {
      this.pending.clear()
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
      return true
    } catch (error) {
      console.error('Error clearing localStorage', error)
      return false
    }
  }

  // Check if data exists
  hasData(): boolean {
    const data = this.loadAllData()
    return data.snippets.length > 0 || data.categories.length > 0 || data.projects.length > 0 || data.tags.length > 0
  }
}

export const storage = new Storage()
