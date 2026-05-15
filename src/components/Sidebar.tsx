import React, { useState, useEffect } from 'react'
import { useSidebarState } from '../hooks/useSidebarState'
import { useDynamicSidebar } from '../hooks/useDynamicSidebar'
import { useStore } from '../store/useStore'
import SidebarSection from './SidebarSection'
import DeleteConfirmationModal from './DeleteConfirmationModal'

const Sidebar: React.FC = () => {
  const {
    expandedFolders,
    toggleSection,
    toggleFolder,
    isExpanded
  } = useSidebarState()

  // Granular selectors: one subscription per slice avoids re-renders when
  // unrelated state (selectedSnippet, search results, etc.) changes.
  const selectedItem = useStore(state => state.selectedItem)
  const setSelectedItem = useStore(state => state.setSelectedItem)
  const folders = useStore(state => state.folders)
  const projectItems = useStore(state => state.projectItems)
  const snippetsCount = useStore(state => state.snippets.length)

  const sidebarData = useDynamicSidebar()


  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean
    type: 'folder' | 'project' | null
    itemId: string
    itemName: string
    snippetCount: number
  }>({
    isOpen: false,
    type: null,
    itemId: '',
    itemName: '',
    snippetCount: 0
  })

  useEffect(() => {

    const handleDeleteFolder = (event: CustomEvent) => {
      const { folderId } = event.detail
      const folder = folders.find(f => f.id === folderId)

      if (!folder) return

      const store = useStore.getState()
      const descendantFolders = store.getDescendantFolders(folderId)
      const allFolderIds = new Set([folderId, ...descendantFolders.map(f => f.id)])

      const snippetCount = store.snippets.reduce(
        (acc, s) => acc + (allFolderIds.has(s.folderId || '') ? 1 : 0),
        0
      )

      if (snippetCount > 0) {
        setDeleteModalState({
          isOpen: true,
          type: 'folder',
          itemId: folderId,
          itemName: folder.name,
          snippetCount
        })
      } else {
        store.deleteFolder(folderId)
      }
    }

    const handleDeleteProject = (event: CustomEvent) => {
      const { projectId } = event.detail
      const project = projectItems.find(p => p.id === projectId)

      if (!project) return

      const store = useStore.getState()
      const descendantProjects = store.getDescendantProjects(projectId)
      const allProjectIds = new Set([projectId, ...descendantProjects.map(p => p.id)])
      const folderIdsInHierarchy = new Set(
        store.folders.filter(f => allProjectIds.has(f.parentId || '')).map(f => f.id)
      )

      const snippetCount = store.snippets.reduce((acc, s) => {
        if (allProjectIds.has(s.projectId || '')) return acc + 1
        if (folderIdsInHierarchy.has(s.folderId || '')) return acc + 1
        return acc
      }, 0)

      if (snippetCount > 0) {
        setDeleteModalState({
          isOpen: true,
          type: 'project',
          itemId: projectId,
          itemName: project.name,
          snippetCount
        })
      } else {
        store.deleteProjectItem(projectId)
      }
    }

    window.addEventListener('deleteFolderWithSnippets', handleDeleteFolder as EventListener)
    window.addEventListener('deleteProjectWithSnippets', handleDeleteProject as EventListener)

    return () => {
      window.removeEventListener('deleteFolderWithSnippets', handleDeleteFolder as EventListener)
      window.removeEventListener('deleteProjectWithSnippets', handleDeleteProject as EventListener)
    }
  }, [folders, projectItems])


  const closeDeleteModal = () => {
    setDeleteModalState({
      isOpen: false,
      type: null,
      itemId: '',
      itemName: '',
      snippetCount: 0
    })
  }

  return (
    <div className="w-80 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm border-r border-gray-200/60 dark:border-gray-700/60 flex flex-col">

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto px-2 py-6">
        <div className="space-y-2">
          {sidebarData.map((section) => (
            <SidebarSection
              key={section.id}
              section={section}
              isExpanded={isExpanded(section.id)}
              selectedItem={selectedItem}
              expandedFolders={expandedFolders}
              onToggleSection={toggleSection}
              onSelectItem={setSelectedItem}
              onToggleFolder={toggleFolder}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
          <span>{snippetsCount} snippets</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={closeDeleteModal}
        type={deleteModalState.type || 'folder'}
        itemId={deleteModalState.itemId}
        itemName={deleteModalState.itemName}
        snippetCount={deleteModalState.snippetCount}
      />
    </div>
  )
}

export default Sidebar
