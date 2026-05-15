import { create } from 'zustand'
import { Snippet, AppState, Folder, ProjectItem } from '../types'
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
  }
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
  getSnippetCounts: () => {
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
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)
    saveToFile({ ...getCurrentStorageData(get), snippets: newSnippets })

    const updatedSnippet = newSnippets.find(s => s.id === id)
    if (updatedSnippet && state.selectedSnippet?.id === id) {
      set({ selectedSnippet: updatedSnippet })
    }
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
    saveToFile({ ...getCurrentStorageData(get), snippets: newSnippets })

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
        ? { ...snippet, usage_count: snippet.usage_count + 1, lastUsed: new Date().toISOString() }
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
    const fuse = new Fuse(snippets, {
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
  
  loadPersistedData: async () => {
    const fileData = await loadFromFile()
    const data = fileData ?? storage.loadAllData()
    set({
      snippets: data.snippets,
      categories: data.categories,
      projects: data.projects,
      tags: data.tags,
      folders: data.folders,
      projectItems: data.projectItems,
      selectedSnippet: data.snippets.length > 0 ? data.snippets[0] : null
    })

    setTimeout(() => {
      get().cleanupOrphanedData()
    }, 100)
  },

  exportData: () => {
    const { snippets, categories, projects, tags, folders, projectItems } = get()
    return JSON.stringify({ snippets, categories, projects, tags, folders, projectItems }, null, 2)
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
        projectItems: data.projectItems || []
      }
      
      storage.saveAllData(validData)
      set({
        snippets: validData.snippets,
        categories: validData.categories,
        projects: validData.projects,
        tags: validData.tags,
        folders: validData.folders,
        projectItems: validData.projectItems
      })
      
      return true
    } catch (error) {
      console.error('Error importing data:', error)
      return false
    }
  },

  getSnippetCounts: () => {
    const { snippets } = get()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    // Contadores de categorias
    const categoryCounts: Record<string, number> = {}
    snippets.forEach(snippet => {
      if (snippet.category) {
        categoryCounts[snippet.category] = (categoryCounts[snippet.category] || 0) + 1
      }
    })
    
    // Contadores de projetos (legacy - mantido por compatibilidade)
    const projectCounts: Record<string, number> = {}
    
    // Contadores de folders
    const folderCounts: Record<string, number> = {}
    snippets.forEach(snippet => {
      if (snippet.folderId) {
        folderCounts[snippet.folderId] = (folderCounts[snippet.folderId] || 0) + 1
      }
    })
    
    // Contadores de project items
    const projectItemCounts: Record<string, number> = {}
    snippets.forEach(snippet => {
      if (snippet.projectId) {
        projectItemCounts[snippet.projectId] = (projectItemCounts[snippet.projectId] || 0) + 1
      }
    })
    
    // Contadores de tags
    const tagCounts: Record<string, number> = {}
    snippets.forEach(snippet => {
      snippet.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    // Contadores de linguagens (baseado no campo language)
    const languageCounts: Record<string, number> = {}
    snippets.forEach(snippet => {
      if (snippet.language) {
        languageCounts[snippet.language] = (languageCounts[snippet.language] || 0) + 1
      }
    })
    
    // Snippets sem tags
    const untagged = snippets.filter(snippet => !snippet.tags || snippet.tags.length === 0).length
    
    // Snippets não categorizados
    const uncategorized = snippets.filter(snippet => !snippet.category || snippet.category.trim() === '').length
    
    // Modificados recentemente (últimos 7 dias)
    const recentlyModified = snippets.filter(snippet => 
      new Date(snippet.updatedAt) >= sevenDaysAgo
    ).length
    
    // Favoritos
    const favorites = snippets.filter(snippet => snippet.favorite).length
    
    // Sem marcação (sem pasta e sem projeto)
    const unassigned = snippets.filter(snippet => 
      !snippet.folderId && !snippet.projectId
    ).length
    
    // Mais usados (com mais de 0 uso)
    const mostUsed = snippets.filter(snippet => snippet.usage_count > 0).length
    
    return {
      totalSnippets: snippets.length,
      categoryCounts,
      projectCounts,
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
      folder.id === id ? { ...folder, ...updates, updatedAt: new Date().toISOString() } : folder
    )
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    saveToFile({ ...getCurrentStorageData(get), folders: newFolders })
  },

  deleteFolder: (id) => {
    const state = get()
    const descendantFolders = get().getDescendantFolders(id)
    const allFolderIds = [id, ...descendantFolders.map(f => f.id)]
    const newFolders = state.folders.filter(folder => !allFolderIds.includes(folder.id))
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    saveToFile({ ...getCurrentStorageData(get), folders: newFolders })

    if (state.selectedFolderId === id) {
      set({ selectedFolderId: null })
    }
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
      project.id === id ? { ...project, ...updates, updatedAt: new Date().toISOString() } : project
    )
    set({ projectItems: newProjectItems })
    storage.saveProjectItems(newProjectItems)
    saveToFile({ ...getCurrentStorageData(get), projectItems: newProjectItems })
  },

  deleteProjectItem: (id) => {
    const state = get()
    const descendantProjects = get().getDescendantProjects(id)
    const allProjectIds = [id, ...descendantProjects.map(p => p.id)]

    const foldersInProjectHierarchy = state.folders.filter(folder =>
      allProjectIds.includes(folder.parentId || '')
    )

    const newProjectItems = state.projectItems.filter(project => !allProjectIds.includes(project.id))
    set({ projectItems: newProjectItems })
    storage.saveProjectItems(newProjectItems)

    const newFolders = state.folders.filter(folder =>
      !foldersInProjectHierarchy.some(f => f.id === folder.id)
    )
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    saveToFile({ ...getCurrentStorageData(get), projectItems: newProjectItems, folders: newFolders })

    if (state.selectedProjectId === id) {
      set({ selectedProjectId: null })
    }
  },

  // Navigation
  setSelectedFolder: (folderId) => set({ 
    selectedFolderId: folderId,
    selectedProjectId: null // Clear project selection when selecting folder
  }),

  setSelectedProject: (projectId) => set({ 
    selectedProjectId: projectId,
    selectedFolderId: null // Clear folder selection when selecting project
  }),

  setSelectedItem: (itemId) => set({ 
    selectedItem: itemId 
  }),

  // Force delete methods (used by confirmation modal)
  forceDeleteFolder: (id) => {
    const state = get()
    
    // Get all descendant folders
    const descendantFolders = get().getDescendantFolders(id)
    const allFolderIds = [id, ...descendantFolders.map(f => f.id)]
    
    // Remove folder and all descendants
    const newFolders = state.folders.filter(folder => !allFolderIds.includes(folder.id))
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    
    // Remove folderId from snippets that were in any of these folders
    const newSnippets = state.snippets.map(snippet =>
      allFolderIds.includes(snippet.folderId || '')
        ? { ...snippet, folderId: undefined, updatedAt: new Date().toISOString() }
        : snippet
    )
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)
    
    // Clear selection if this folder was selected
    if (state.selectedFolderId === id) {
      set({ selectedFolderId: null })
    }
  },

  forceDeleteProjectItem: (id) => {
    const state = get()
    
    // Get all descendant projects  
    const descendantProjects = get().getDescendantProjects(id)
    const allProjectIds = [id, ...descendantProjects.map(p => p.id)]
    
    // Also get folders that are children of this project hierarchy
    const foldersInProjectHierarchy = state.folders.filter(folder => 
      allProjectIds.includes(folder.parentId || '')
    )
    const allFolderIds = foldersInProjectHierarchy.map(f => f.id)
    
    // Remove project and descendants
    const newProjectItems = state.projectItems.filter(project => !allProjectIds.includes(project.id))
    set({ projectItems: newProjectItems })
    storage.saveProjectItems(newProjectItems)
    
    // Remove child folders  
    const newFolders = state.folders.filter(folder => !allFolderIds.includes(folder.id))
    set({ folders: newFolders })
    storage.saveFolders(newFolders)
    
    // Remove projectId/folderId from snippets that were in this hierarchy
    const newSnippets = state.snippets.map(snippet => {
      let updatedSnippet = { ...snippet }
      
      if (allProjectIds.includes(snippet.projectId || '')) {
        updatedSnippet.projectId = undefined
        updatedSnippet.updatedAt = new Date().toISOString()
      }
      
      if (allFolderIds.includes(snippet.folderId || '')) {
        updatedSnippet.folderId = undefined
        updatedSnippet.updatedAt = new Date().toISOString()
      }
      
      return updatedSnippet
    })
    set({ snippets: newSnippets })
    storage.saveSnippets(newSnippets)
    
    // Clear selection if this project was selected
    if (state.selectedProjectId === id) {
      set({ selectedProjectId: null })
    }
  },

  // Snippet Movement Methods
  moveSnippetToFolder: (snippetId, folderId) => {
    const state = get()
    const snippet = state.snippets.find(s => s.id === snippetId)
    if (!snippet) return

    // Clear updates
    const updates: Partial<Snippet> = {}

    if (!folderId) {
      // Moving to "no folder" - clear both folderId and projectId
      updates.folderId = undefined
      updates.projectId = undefined
    } else {
      // Moving to a specific folder
      const targetFolder = state.folders.find(f => f.id === folderId)
      if (!targetFolder) return

      updates.folderId = folderId
      // If the folder belongs to a project, clear the direct projectId
      // (the project relationship is now through the folder)
      updates.projectId = undefined
    }

    get().updateSnippet(snippetId, updates)
  },

  moveSnippetToProject: (snippetId, projectId) => {
    const state = get()
    const snippet = state.snippets.find(s => s.id === snippetId)
    if (!snippet) return

    if (!projectId) {
      // Remove from project, keep current folder if it's not a project folder
      const currentFolder = snippet.folderId ? state.folders.find(f => f.id === snippet.folderId) : null
      const updates: Partial<Snippet> = {
        projectId: undefined
      }
      
      // If current folder belongs to a project, also clear the folder
      if (currentFolder && currentFolder.parentId) {
        updates.folderId = undefined
      }
      
      get().updateSnippet(snippetId, updates)
      return
    }

    // Moving to a project - find or create a default folder within the project
    const projectFolders = state.folders.filter(folder => folder.parentId === projectId)
    
    if (projectFolders.length === 0) {
      // No folders in project - create a default one
      const defaultFolderName = 'Snippets'
      const newFolder: Folder = {
        id: crypto.randomUUID(),
        name: defaultFolderName,
        parentId: projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const newFolders = [...state.folders, newFolder]
      set({ folders: newFolders })
      storage.saveFolders(newFolders)
      
      // Move snippet to the new folder
      const updates: Partial<Snippet> = {
        folderId: newFolder.id,
        projectId: undefined // Clear direct project assignment since it's now through folder
      }
      get().updateSnippet(snippetId, updates)
    } else {
      // Move to the first available folder in the project
      const updates: Partial<Snippet> = {
        folderId: projectFolders[0].id,
        projectId: undefined // Clear direct project assignment since it's now through folder
      }
      get().updateSnippet(snippetId, updates)
    }
  },

  // Helper methods for hierarchical operations
  getDescendantFolders: (folderId) => {
    const state = get()
    const descendants: Folder[] = []
    
    const findDescendants = (parentId: string) => {
      const children = state.folders.filter(folder => folder.parentId === parentId)
      for (const child of children) {
        descendants.push(child)
        findDescendants(child.id)
      }
    }
    
    findDescendants(folderId)
    return descendants
  },

  getDescendantProjects: (projectId) => {
    const state = get()
    const descendants: ProjectItem[] = []
    
    const findDescendants = (parentId: string) => {
      const children = state.projectItems.filter(project => project.parentId === parentId)
      for (const child of children) {
        descendants.push(child)
        findDescendants(child.id)
      }
    }
    
    findDescendants(projectId)
    return descendants
  },

  // Data cleanup function
  cleanupOrphanedData: () => {
    const state = get()
    console.log('🧹 Limpando dados órfãos...')
    
    // Log current data for debugging
    console.log('📊 Estado atual:')
    console.log('- Snippets:', state.snippets.length)
    console.log('- Pastas:', state.folders.length)
    console.log('- Projetos:', state.projectItems.length)
    console.log('- Categorias:', state.categories.length)
    console.log('- Tags:', state.tags.length)
    
    // List all projects for debugging
    console.log('📋 Projetos encontrados:')
    state.projectItems.forEach(project => {
      console.log(`  - ID: ${project.id}, Nome: ${project.name}, ParentId: ${project.parentId}`)
    })
    
    // Clean up orphaned folders (folders with invalid parentId)
    const validProjectIds = new Set(state.projectItems.map(p => p.id))
    const validFolderIds = new Set(state.folders.map(f => f.id))
    
    const cleanFolders = state.folders.filter(folder => {
      if (!folder.parentId) return true // Root folders are valid
      return validProjectIds.has(folder.parentId) || validFolderIds.has(folder.parentId)
    })
    
    // Clean up orphaned snippets (snippets with invalid folderId or projectId)
    const cleanSnippets = state.snippets.map(snippet => {
      const updatedSnippet = { ...snippet }
      
      // Clean invalid folder references
      if (snippet.folderId && !validFolderIds.has(snippet.folderId)) {
        console.log(`🧹 Removendo folderId inválido '${snippet.folderId}' do snippet '${snippet.title}'`)
        updatedSnippet.folderId = undefined
      }
      
      // Clean invalid project references
      if (snippet.projectId && !validProjectIds.has(snippet.projectId)) {
        console.log(`🧹 Removendo projectId inválido '${snippet.projectId}' do snippet '${snippet.title}'`)
        updatedSnippet.projectId = undefined
      }
      
      return updatedSnippet
    })
    
    // Update state if changes were made
    const hasChanges = 
      cleanFolders.length !== state.folders.length ||
      cleanSnippets.some((snippet, index) => 
        snippet.folderId !== state.snippets[index].folderId ||
        snippet.projectId !== state.snippets[index].projectId
      )
    
    if (hasChanges) {
      console.log('✅ Aplicando limpeza dos dados...')
      set({ 
        folders: cleanFolders,
        snippets: cleanSnippets
      })
      
      // Save cleaned data
      storage.saveFolders(cleanFolders)
      storage.saveSnippets(cleanSnippets)
      console.log('✅ Dados limpos e salvos!')
    } else {
      console.log('✅ Nenhuma limpeza necessária.')
    }
  }
}))