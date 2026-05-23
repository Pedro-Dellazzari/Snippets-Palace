import { create } from 'zustand'
import { Snippet, AppState, Folder, ProjectItem, TicketLog } from '../types'
import Fuse from 'fuse.js'
import { storage, StorageData } from '../utils/storage'
import { loadFromFile, saveToFile } from '../utils/fileStorage'

function getCurrentStorageData(get: () => AppState): StorageData {
  const state = get()
  return {
    snippets: state.snippets,
    categories: state.categories,
    projects: state.projects,
    tags: state.tags,
    folders: state.folders,
    projectItems: state.projectItems,
    ticketLogs: state.ticketLogs,
  }
}

interface SnippetCounts {
  totalSnippets: number
  categoryCounts: Record<string, number>
  projectCounts: Record<string, number>
  tagCounts: Record<string, number>
  languageCounts: Record<string, number>
  folderCounts: Record<string, number>
  projectItemCounts: Record<string, number>
  untagged: number
  uncategorized: number
  recentlyModified: number
  favorites: number
  unassigned: number
  mostUsed: number
}

interface StoreActions {
  setSnippets: (snippets: Snippet[]) => void
  addSnippet: (snippet: Snippet) => void
  updateSnippet: (id: string, updates: Partial<Snippet>) => void
  deleteSnippet: (id: string) => void
  duplicateSnippet: (id: string) => Snippet | null
  setSelectedSnippet: (snippet: Snippet | null) => void
  setSearchQuery: (query: string) => void
  setSidebarTab: (tab: 'categories' | 'projects' | 'tags') => void
  incrementUsageCount: (id: string) => void
  toggleFavorite: (id: string) => void
  searchSnippets: (query: string) => void
  loadPersistedData: () => Promise<void>
  exportData: () => string
  importData: (jsonData: string) => boolean
  moveSnippetToFolder: (snippetId: string, folderId: string | null) => void
  moveSnippetToProject: (snippetId: string, projectId: string | null) => void
  getSnippetCounts: () => SnippetCounts
  // Folders
  addFolder: (name: string, parentId?: string) => void
  updateFolder: (id: string, updates: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  forceDeleteFolder: (id: string) => void
  getDescendantFolders: (folderId: string) => Folder[]
  // Project Items
  addProjectItem: (name: string, description?: string, parentId?: string) => void
  updateProjectItem: (id: string, updates: Partial<ProjectItem>) => void
  deleteProjectItem: (id: string) => void
  forceDeleteProjectItem: (id: string) => void
  getDescendantProjects: (projectId: string) => ProjectItem[]
  // Ticket Logs
  addTicketLog: (log: TicketLog) => void
  updateTicketLog: (id: string, updates: Partial<TicketLog>) => void
  deleteTicketLog: (id: string) => void
  getTicketLogsForSnippet: (snippetId: string) => TicketLog[]
  // Data cleanup
  cleanupOrphanedData: () => void
  // Navigation
  setSelectedFolder: (folderId: string | null) => void
  setSelectedProject: (projectId: string | null) => void
  setSelectedItem: (itemId: string | null) => void
}

const initialState: AppState = {
  snippets: [],
  categories: [],
  projects: [],
  tags: [],
  folders: [],
  projectItems: [],
  ticketLogs: [],
  selectedSnippet: null,
  searchQuery: '',
  searchResults: [],
  sidebarTab: 'categories',
  selectedFolderId: null,
  selectedProjectId: null,
  selectedItem: 'all-snippets',
  isLoading: false,
  error: null
}

// ---- Fuse index cache (rebuild only when snippets array reference changes) ----
let cachedFuse: Fuse<Snippet> | null = null
let cachedFuseRef: Snippet[] | null = null
function getFuse(snippets: Snippet[]): Fuse<Snippet> {
  if (cachedFuse && cachedFuseRef === snippets) return cachedFuse
  cachedFuse = new Fuse(snippets, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.3 },
      { name: 'content', weight: 0.2 },
      { name: 'tags', weight: 0.1 }
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.4
  })
  cachedFuseRef = snippets
  return cachedFuse
}

// ---- SnippetCounts cache (rebuild only when source arrays change) ----
let cachedCounts: SnippetCounts | null = null
let cachedCountsSnippetsRef: Snippet[] | null = null
function computeCounts(snippets: Snippet[]): SnippetCounts {
  if (cachedCounts && cachedCountsSnippetsRef === snippets) return cachedCounts

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const categoryCounts: Record<string, number> = {}
  const folderCounts: Record<string, number> = {}
  const projectItemCounts: Record<string, number> = {}
  const tagCounts: Record<string, number> = {}
  const languageCounts: Record<string, number> = {}

  let untagged = 0
  let uncategorized = 0
  let recentlyModified = 0
  let favorites = 0
  let unassigned = 0
  let mostUsed = 0

  for (const s of snippets) {
    if (s.category) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1
    else uncategorized++

    if (s.folderId) folderCounts[s.folderId] = (folderCounts[s.folderId] || 0) + 1
    if (s.projectId) projectItemCounts[s.projectId] = (projectItemCounts[s.projectId] || 0) + 1

    if (s.tags && s.tags.length > 0) {
      for (const t of s.tags) tagCounts[t] = (tagCounts[t] || 0) + 1
    } else {
      untagged++
    }

    if (s.language) languageCounts[s.language] = (languageCounts[s.language] || 0) + 1
    if (s.favorite) favorites++
    if (!s.folderId && !s.projectId) unassigned++
    if (s.usage_count > 0) mostUsed++
    if (s.updatedAt && new Date(s.updatedAt).getTime() >= sevenDaysAgo) recentlyModified++
  }

  cachedCounts = {
    totalSnippets: snippets.length,
    categoryCounts,
    projectCounts: {},
    tagCounts,
    languageCounts,
    folderCounts,
    projectItemCounts,
    untagged,
    uncategorized,
    recentlyModified,
    favorites,
    unassigned,
    mostUsed
  }
  cachedCountsSnippetsRef = snippets
  return cachedCounts
}


export const useStore = create<AppState & StoreActions>((set, get) => ({
  ...initialState,

  setSnippets: (snippets) => {
    set({ snippets })
    storage.saveSnippets(snippets)
    saveToFile({ ...getCurrentStorageData(get), snippets })
  },

  addSnippet: (snippet) => {
    const newSnippets = [...get().snippets, snippet]
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)
    saveToFile({ ...getCurrentStorageData(get), snippets: newSnippets })
  },

  updateSnippet: (id, updates) => {
    const state = get()
    const newSnippets = state.snippets.map(snippet =>
      snippet.id === id ? { ...snippet, ...updates, updatedAt: new Date().toISOString() } : snippet
    )
    const patch: Partial<AppState> = { snippets: newSnippets }
    if (state.selectedSnippet?.id === id) {
      const updated = newSnippets.find(s => s.id === id)
      if (updated) patch.selectedSnippet = updated
    }
    set(patch)
    storage.saveSnippets(newSnippets)
  },

  deleteSnippet: (id) => {
    const state = get()
    const newSnippets = state.snippets.filter(snippet => snippet.id !== id)
    set({
      snippets: newSnippets,
      selectedSnippet: state.selectedSnippet?.id === id ? null : state.selectedSnippet
    })
    storage.saveSnippets(newSnippets)
    saveToFile({ ...getCurrentStorageData(get), snippets: newSnippets })
  },

  duplicateSnippet: (id) => {
    const state = get()
    const originalSnippet = state.snippets.find(snippet => snippet.id === id)

    if (!originalSnippet) return null

    const duplicatedSnippet: Snippet = {
      ...originalSnippet,
      id: crypto.randomUUID(),
      title: `Cópia de ${originalSnippet.title}`,
      favorite: false,
      usage_count: 0,
      lastUsed: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const newSnippets = [...state.snippets, duplicatedSnippet]
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)

    return duplicatedSnippet
  },

  setSelectedSnippet: (snippet) => set({ selectedSnippet: snippet }),

  setSearchQuery: (query) => {
    set({ searchQuery: query })
    if (query.trim()) {
      get().searchSnippets(query)
    } else {
      set({ searchResults: [] })
    }
  },

  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  incrementUsageCount: (id) => {
    const newSnippets = get().snippets.map(snippet =>
      snippet.id === id
        ? {
            ...snippet,
            usage_count: snippet.usage_count + 1,
            lastUsed: new Date().toISOString()
          }
        : snippet
    )
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)
    saveToFile({ ...getCurrentStorageData(get), snippets: newSnippets })
  },

  toggleFavorite: (id) => {
    const newSnippets = get().snippets.map(snippet =>
      snippet.id === id ? { ...snippet, favorite: !snippet.favorite } : snippet
    )
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)
    saveToFile({ ...getCurrentStorageData(get), snippets: newSnippets })
  },

  searchSnippets: (query) => {
    const { snippets } = get()
    const fuse = getFuse(snippets)

    const results = fuse.search(query).map(result => ({
      snippet: result.item,
      score: result.score || 0,
      matches: (result.matches || []).map(match => ({
        field: match.key || '',
        indices: Array.from(match.indices || []) as number[][]
      }))
    }))

    set({ searchResults: results })
  },

  loadPersistedData: () => {
    const data = storage.loadAllData()
    set({
      snippets: data.snippets,
      categories: data.categories,
      projects: data.projects,
      tags: data.tags,
      folders: data.folders,
      projectItems: data.projectItems,
      ticketLogs: data.ticketLogs,
      selectedSnippet: data.snippets.length > 0 ? data.snippets[0] : null
    })

    // Defer cleanup so initial paint isn't blocked
    setTimeout(() => {
      get().cleanupOrphanedData()
    }, 250)
  },

  exportData: () => {
    const { snippets, categories, projects, tags, folders, projectItems, ticketLogs } = get()
    return JSON.stringify({ snippets, categories, projects, tags, folders, projectItems, ticketLogs }, null, 2)
  },

  importData: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData)
      if (!data.snippets || !Array.isArray(data.snippets)) return false

      const validData = {
        snippets: data.snippets || [],
        categories: data.categories || [],
        projects: data.projects || [],
        tags: data.tags || [],
        folders: data.folders || [],
        projectItems: data.projectItems || [],
        ticketLogs: data.ticketLogs || []
      }

      storage.saveAllData(validData)
      set({
        snippets: validData.snippets,
        categories: validData.categories,
        projects: validData.projects,
        tags: validData.tags,
        folders: validData.folders,
        projectItems: validData.projectItems,
        ticketLogs: validData.ticketLogs
      })

      return true
    } catch (error) {
      console.error('Error importing data:', error)
      return false
    }
  },

  getSnippetCounts: () => computeCounts(get().snippets),

  // Ticket Logs CRUD
  addTicketLog: (log) => {
    const newLogs = [...get().ticketLogs, log]
    set({ ticketLogs: newLogs })
    storage.saveTicketLogs(newLogs)
    saveToFile({ ...getCurrentStorageData(get), ticketLogs: newLogs })
  },

  updateTicketLog: (id, updates) => {
    const newLogs = get().ticketLogs.map(log =>
      log.id === id ? { ...log, ...updates, updatedAt: new Date().toISOString() } : log
    )
    set({ ticketLogs: newLogs })
    storage.saveTicketLogs(newLogs)
    saveToFile({ ...getCurrentStorageData(get), ticketLogs: newLogs })
  },

  deleteTicketLog: (id) => {
    const newLogs = get().ticketLogs.filter(log => log.id !== id)
    set({ ticketLogs: newLogs })
    storage.saveTicketLogs(newLogs)
    saveToFile({ ...getCurrentStorageData(get), ticketLogs: newLogs })
  },

  getTicketLogsForSnippet: (snippetId) => {
    return get().ticketLogs.filter(log => log.snippetId === snippetId)
  },

  // Folders CRUD
  addFolder: (name, parentId) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: name.trim(),
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const newFolders = [...get().folders, newFolder]
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    saveToFile({ ...getCurrentStorageData(get), folders: newFolders })
  },

  updateFolder: (id, updates) => {
    const newFolders = get().folders.map(folder =>
      folder.id === id
        ? { ...folder, ...updates, updatedAt: new Date().toISOString() }
        : folder
    )
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    saveToFile({ ...getCurrentStorageData(get), folders: newFolders })
  },

  deleteFolder: (id) => {
    const state = get()
    const descendantFolders = get().getDescendantFolders(id)
    const allFolderIds = new Set([id, ...descendantFolders.map(f => f.id)])

    const newFolders = state.folders.filter(folder => !allFolderIds.has(folder.id))
    const patch: Partial<AppState> = { folders: newFolders }
    if (state.selectedFolderId === id) patch.selectedFolderId = null
    set(patch)
    storage.saveFolders(newFolders)
  },

  // Project Items CRUD
  addProjectItem: (name, description, parentId) => {
    const newProjectItem: ProjectItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description?.trim(),
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const newProjectItems = [...get().projectItems, newProjectItem]
    set({ projectItems: newProjectItems })
    storage.saveProjectItems(newProjectItems)
    saveToFile({ ...getCurrentStorageData(get), projectItems: newProjectItems })
  },

  updateProjectItem: (id, updates) => {
    const newProjectItems = get().projectItems.map(project =>
      project.id === id
        ? { ...project, ...updates, updatedAt: new Date().toISOString() }
        : project
    )
    set({ projectItems: newProjectItems })
    storage.saveProjectItems(newProjectItems)
    saveToFile({ ...getCurrentStorageData(get), projectItems: newProjectItems })
  },

  deleteProjectItem: (id) => {
    const state = get()
    const descendantProjects = get().getDescendantProjects(id)
    const allProjectIds = new Set([id, ...descendantProjects.map(p => p.id)])

    const foldersInProjectHierarchy = state.folders.filter(folder =>
      allProjectIds.has(folder.parentId || '')
    )
    const folderIdsToRemove = new Set(foldersInProjectHierarchy.map(f => f.id))

    const newProjectItems = state.projectItems.filter(project => !allProjectIds.has(project.id))
    const newFolders = state.folders.filter(folder => !folderIdsToRemove.has(folder.id))

    const patch: Partial<AppState> = {
      projectItems: newProjectItems,
      folders: newFolders
    }
    if (state.selectedProjectId === id) patch.selectedProjectId = null
    set(patch)

    storage.saveProjectItems(newProjectItems)
    storage.saveFolders(newFolders)
  },

  // Navigation
  setSelectedFolder: (folderId) => set({
    selectedFolderId: folderId,
    selectedProjectId: null
  }),

  setSelectedProject: (projectId) => set({
    selectedProjectId: projectId,
    selectedFolderId: null
  }),

  setSelectedItem: (itemId) => set({
    selectedItem: itemId
  }),

  // Force delete methods (used by confirmation modal)
  forceDeleteFolder: (id) => {
    const state = get()
    const descendantFolders = get().getDescendantFolders(id)
    const allFolderIds = new Set([id, ...descendantFolders.map(f => f.id)])

    const newFolders = state.folders.filter(folder => !allFolderIds.has(folder.id))
    const newSnippets = state.snippets.map(snippet =>
      allFolderIds.has(snippet.folderId || '')
        ? { ...snippet, folderId: undefined, updatedAt: new Date().toISOString() }
        : snippet
    )

    const patch: Partial<AppState> = { folders: newFolders, snippets: newSnippets }
    if (state.selectedFolderId === id) patch.selectedFolderId = null
    set(patch)

    storage.saveFolders(newFolders)
    storage.saveSnippets(newSnippets)
  },

  forceDeleteProjectItem: (id) => {
    const state = get()
    const descendantProjects = get().getDescendantProjects(id)
    const allProjectIds = new Set([id, ...descendantProjects.map(p => p.id)])

    const foldersInProjectHierarchy = state.folders.filter(folder =>
      allProjectIds.has(folder.parentId || '')
    )
    const allFolderIds = new Set(foldersInProjectHierarchy.map(f => f.id))

    const newProjectItems = state.projectItems.filter(project => !allProjectIds.has(project.id))
    const newFolders = state.folders.filter(folder => !allFolderIds.has(folder.id))

    const newSnippets = state.snippets.map(snippet => {
      const inProject = allProjectIds.has(snippet.projectId || '')
      const inFolder = allFolderIds.has(snippet.folderId || '')
      if (!inProject && !inFolder) return snippet
      return {
        ...snippet,
        projectId: inProject ? undefined : snippet.projectId,
        folderId: inFolder ? undefined : snippet.folderId,
        updatedAt: new Date().toISOString()
      }
    })

    const patch: Partial<AppState> = {
      projectItems: newProjectItems,
      folders: newFolders,
      snippets: newSnippets
    }
    if (state.selectedProjectId === id) patch.selectedProjectId = null
    set(patch)

    storage.saveProjectItems(newProjectItems)
    storage.saveFolders(newFolders)
    storage.saveSnippets(newSnippets)
  },

  // Snippet Movement Methods
  moveSnippetToFolder: (snippetId, folderId) => {
    const state = get()
    const snippet = state.snippets.find(s => s.id === snippetId)
    if (!snippet) return

    const updates: Partial<Snippet> = {}

    if (!folderId) {
      updates.folderId = undefined
      updates.projectId = undefined
    } else {
      const targetFolder = state.folders.find(f => f.id === folderId)
      if (!targetFolder) return

      updates.folderId = folderId
      updates.projectId = undefined
    }

    get().updateSnippet(snippetId, updates)
  },

  moveSnippetToProject: (snippetId, projectId) => {
    const state = get()
    const snippet = state.snippets.find(s => s.id === snippetId)
    if (!snippet) return

    if (!projectId) {
      const currentFolder = snippet.folderId ? state.folders.find(f => f.id === snippet.folderId) : null
      const updates: Partial<Snippet> = { projectId: undefined }
      if (currentFolder && currentFolder.parentId) {
        updates.folderId = undefined
      }
      get().updateSnippet(snippetId, updates)
      return
    }

    const projectFolders = state.folders.filter(folder => folder.parentId === projectId)

    if (projectFolders.length === 0) {
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name: 'Snippets',
        parentId: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const newFolders = [...state.folders, newFolder]
      set({ folders: newFolders })
      storage.saveFolders(newFolders)

      get().updateSnippet(snippetId, {
        folderId: newFolder.id,
        projectId: undefined
      })
    } else {
      get().updateSnippet(snippetId, {
        folderId: projectFolders[0].id,
        projectId: undefined
      })
    }
  },

  // Helper methods for hierarchical operations
  getDescendantFolders: (folderId) => {
    const folders = get().folders
    const descendants: Folder[] = []
    const stack = [folderId]
    while (stack.length) {
      const parentId = stack.pop()!
      for (const folder of folders) {
        if (folder.parentId === parentId) {
          descendants.push(folder)
          stack.push(folder.id)
        }
      }
    }
    return descendants
  },

  getDescendantProjects: (projectId) => {
    const projectItems = get().projectItems
    const descendants: ProjectItem[] = []
    const stack = [projectId]
    while (stack.length) {
      const parentId = stack.pop()!
      for (const project of projectItems) {
        if (project.parentId === parentId) {
          descendants.push(project)
          stack.push(project.id)
        }
      }
    }
    return descendants
  },

  // Data cleanup function (silent in production — esbuild drops console)
  cleanupOrphanedData: () => {
    const state = get()

    const validProjectIds = new Set(state.projectItems.map(p => p.id))
    const validFolderIds = new Set(state.folders.map(f => f.id))

    const cleanFolders = state.folders.filter(folder => {
      if (!folder.parentId) return true
      return validProjectIds.has(folder.parentId) || validFolderIds.has(folder.parentId)
    })

    let snippetsChanged = false
    const cleanSnippets = state.snippets.map(snippet => {
      const folderInvalid = snippet.folderId && !validFolderIds.has(snippet.folderId)
      const projectInvalid = snippet.projectId && !validProjectIds.has(snippet.projectId)
      if (!folderInvalid && !projectInvalid) return snippet
      snippetsChanged = true
      return {
        ...snippet,
        folderId: folderInvalid ? undefined : snippet.folderId,
        projectId: projectInvalid ? undefined : snippet.projectId
      }
    })

    const foldersChanged = cleanFolders.length !== state.folders.length

    if (foldersChanged || snippetsChanged) {
      set({
        folders: foldersChanged ? cleanFolders : state.folders,
        snippets: snippetsChanged ? cleanSnippets : state.snippets
      })

      if (foldersChanged) storage.saveFolders(cleanFolders)
      if (snippetsChanged) storage.saveSnippets(cleanSnippets)
    }
  }
}))
