import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { useInlineCreation } from './useInlineCreation'
import { SidebarSection, SidebarItem } from '../types/sidebar'
import { Folder, ProjectItem } from '../types'

// Helper function to build hierarchical folder structure
function buildFolderHierarchy(folders: Folder[], counts: any, creatingInParent?: string): SidebarItem[] {
  const folderMap = new Map<string, SidebarItem>()
  
  // Create sidebar items for all folders
  folders.forEach(folder => {
    folderMap.set(folder.id, {
      id: `folder-${folder.id}`,
      label: folder.name,
      icon: 'folder',
      count: counts.folderCounts[folder.id] || 0,
      type: 'folder' as const,
      children: []
    })
  })
  
  // Build hierarchy
  const rootItems: SidebarItem[] = []
  
  folders.forEach(folder => {
    const item = folderMap.get(folder.id)!
    
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(item)
      }
    } else {
      rootItems.push(item)
    }
  })

  // Add inline creation item if needed
  if (creatingInParent === 'root') {
    rootItems.push({
      id: 'creating-folder',
      label: '',
      icon: 'folder',
      type: 'folder' as const,
      isCreating: true
    })
  } else if (creatingInParent) {
    const parent = folderMap.get(creatingInParent)
    if (parent) {
      parent.children = parent.children || []
      parent.children.push({
        id: 'creating-folder',
        label: '',
        icon: 'folder',
        type: 'folder' as const,
        isCreating: true
      })
    }
  }
  
  return rootItems
}

// Helper function to build hierarchical project structure  
function buildProjectHierarchy(projects: ProjectItem[], folders: Folder[], counts: any, creatingInParent?: string): SidebarItem[] {
  const projectMap = new Map<string, SidebarItem>()
  const folderMap = new Map<string, SidebarItem>()
  
  // Create sidebar items for all projects
  projects.forEach(project => {
    projectMap.set(project.id, {
      id: `project-${project.id}`,
      label: project.name,
      icon: 'rocket-launch',
      count: counts.projectItemCounts[project.id] || 0,
      type: 'folder' as const,
      children: []
    })
  })

  // Create sidebar items for folders that belong to projects
  folders.filter(folder => folder.parentId && projects.some(p => p.id === folder.parentId))
    .forEach(folder => {
      folderMap.set(folder.id, {
        id: `folder-${folder.id}`,
        label: folder.name,
        icon: 'folder',
        count: counts.folderCounts[folder.id] || 0,
        type: 'folder' as const,
        children: []
      })
    })

  // Build folder hierarchy within projects (support nested folders)
  folders.filter(folder => folder.parentId && projects.some(p => p.id === folder.parentId))
    .forEach(folder => {
      const folderItem = folderMap.get(folder.id)!
      
      // Check if parent is a project or another folder
      const parentProject = projectMap.get(folder.parentId!)
      if (parentProject) {
        parentProject.children = parentProject.children || []
        parentProject.children.push(folderItem)
      }
    })

  // Handle nested folders (folders within folders within projects)
  folders.filter(folder => folder.parentId && folderMap.has(folder.parentId))
    .forEach(folder => {
      const folderItem = {
        id: `folder-${folder.id}`,
        label: folder.name,
        icon: 'folder',
        count: counts.folderCounts[folder.id] || 0,
        type: 'folder' as const,
        children: []
      }
      
      const parentFolder = folderMap.get(folder.parentId!)
      if (parentFolder) {
        parentFolder.children = parentFolder.children || []
        parentFolder.children.push(folderItem)
        folderMap.set(folder.id, folderItem) // Add to map for further nesting
      }
    })
  
  // Build project hierarchy
  const rootItems: SidebarItem[] = []
  
  projects.forEach(project => {
    const item = projectMap.get(project.id)!
    
    if (project.parentId) {
      const parent = projectMap.get(project.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(item)
      }
    } else {
      rootItems.push(item)
    }
  })

  // Add inline creation items if needed
  if (creatingInParent === 'root') {
    rootItems.push({
      id: 'creating-project',
      label: '',
      icon: 'rocket-launch',
      type: 'folder' as const,
      isCreating: true
    })
  } else if (creatingInParent && projects.some(p => p.id === creatingInParent)) {
    const parentProject = projectMap.get(creatingInParent)
    if (parentProject) {
      parentProject.children = parentProject.children || []
      parentProject.children.push({
        id: 'creating-folder',
        label: '',
        icon: 'folder',
        type: 'folder' as const,
        isCreating: true
      })
    }
  } else if (creatingInParent && folderMap.has(creatingInParent)) {
    // Creating subfolder within a folder that's inside a project
    const parentFolder = folderMap.get(creatingInParent)
    if (parentFolder) {
      parentFolder.children = parentFolder.children || []
      parentFolder.children.push({
        id: 'creating-folder',
        label: '',
        icon: 'folder',
        type: 'folder' as const,
        isCreating: true
      })
    }
  }
  
  return rootItems
}

export function useDynamicSidebar(): SidebarSection[] {
  const snippets = useStore(state => state.snippets)
  const folders = useStore(state => state.folders)
  const projectItems = useStore(state => state.projectItems)
  const getSnippetCounts = useStore(state => state.getSnippetCounts)
  const creatingFolder = useInlineCreation(state => state.creatingFolder)
  const creatingProject = useInlineCreation(state => state.creatingProject)

  return useMemo(() => {
    const counts = getSnippetCounts()

    // languageCounts already contains every unique non-empty language seen in
    // the snippet list — avoid an extra O(n) pass over `snippets`.
    const uniqueLanguages = Object.keys(counts.languageCounts).sort((a, b) => {
      const countA = counts.languageCounts[a] || 0
      const countB = counts.languageCounts[b] || 0
      if (countA !== countB) return countB - countA
      return a.localeCompare(b)
    })

    const sidebarStructure = [
      {
        id: 'global-view',
        title: 'VISUALIZAÇÃO GLOBAL',
        collapsible: false,
        items: [
          {
            id: 'all-snippets',
            label: 'Todos',
            icon: 'document-text',
            count: counts.totalSnippets,
            type: 'favorite' as const
          },
          {
            id: 'favorites',
            label: 'Favoritos',
            icon: 'heart',
            count: counts.favorites,
            type: 'favorite' as const
          },
          {
            id: 'unassigned',
            label: 'Sem marcação',
            icon: 'question-mark-circle',
            count: counts.unassigned,
            type: 'favorite' as const
          }
        ]
      },
      {
        id: 'folders',
        title: 'FOLDERS',
        collapsible: true,
        items: [
          // Botão para criar nova pasta
          {
            id: 'add-folder',
            label: '+ Nova pasta',
            icon: 'plus',
            type: 'folder' as const,
            isSpecial: true
          },
          // Lista hierárquica de folders
          ...buildFolderHierarchy(folders, counts, creatingFolder || undefined)
        ]
      },
      {
        id: 'languages',
        title: 'LINGUAGENS',
        collapsible: true,
        items: uniqueLanguages.map(language => ({
          id: `language-${language.toLowerCase()}`,
          label: language,
          icon: getLanguageIcon(language),
          count: counts.languageCounts[language] || 0,
          type: 'folder' as const,
          color: getLanguageColor(language)
        }))
      },
      {
        id: 'projects',
        title: 'PROJETOS',
        collapsible: true,
        items: [
          // Botão para criar novo projeto
          {
            id: 'add-project',
            label: '+ Novo Projeto',
            icon: 'plus',
            type: 'folder' as const,
            isSpecial: true
          },
          // Lista hierárquica de projetos
          ...buildProjectHierarchy(projectItems, folders, counts, creatingProject || undefined)
        ]
      }
    ]
    
    return sidebarStructure
  }, [snippets, folders, projectItems, getSnippetCounts, creatingFolder, creatingProject])
}

// Função auxiliar para obter ícone específico por linguagem
function getLanguageIcon(language: string): string {
  const languageIcons: Record<string, string> = {
    'javascript': 'code-bracket',
    'typescript': 'code-bracket',
    'python': 'code-bracket',
    'java': 'code-bracket',
    'sql': 'circle-stack',
    'bash': 'terminal',
    'shell': 'terminal',
    'html': 'code-bracket',
    'css': 'paint-brush',
    'php': 'code-bracket',
    'go': 'code-bracket',
    'rust': 'code-bracket',
    'cpp': 'code-bracket',
    'c': 'code-bracket'
  }
  
  return languageIcons[language.toLowerCase()] || 'code-bracket'
}

// Função auxiliar para gerar cores específicas por linguagem
function getLanguageColor(language: string): string {
  const languageColors: Record<string, string> = {
    'javascript': '#F7DF1E',
    'typescript': '#3178C6',
    'python': '#3776AB',
    'java': '#ED8B00',
    'sql': '#336791',
    'bash': '#4EAA25',
    'shell': '#4EAA25',
    'html': '#E34F26',
    'css': '#1572B6',
    'php': '#777BB4',
    'go': '#00ADD8',
    'rust': '#DEA584',
    'cpp': '#00599C',
    'c': '#A8B9CC'
  }
  
  return languageColors[language.toLowerCase()] || '#6B7280'
}