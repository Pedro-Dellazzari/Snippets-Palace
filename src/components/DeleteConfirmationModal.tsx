import React from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/useStore'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'folder' | 'project'
  itemId: string
  itemName: string
  snippetCount: number
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  type,
  itemId,
  itemName,
  snippetCount
}) => {
  const { t } = useTranslation()
  const {
    forceDeleteFolder, 
    forceDeleteProjectItem, 
    updateSnippet, 
    snippets, 
    getDescendantFolders,
    getDescendantProjects,
    folders
  } = useStore()

  if (!isOpen) return null

  const handleDeleteAll = () => {
    if (type === 'folder') {
      forceDeleteFolder(itemId)
    } else {
      forceDeleteProjectItem(itemId)
    }
    onClose()
  }

  const handleKeepSnippets = () => {
    let affectedSnippets: any[] = []
    
    if (type === 'folder') {
      // Get all descendant folders
      const descendantFolders = getDescendantFolders(itemId)
      const allFolderIds = [itemId, ...descendantFolders.map(f => f.id)]
      
      // Find all snippets in this folder hierarchy
      affectedSnippets = snippets.filter(snippet => 
        allFolderIds.includes(snippet.folderId || '')
      )
    } else {
      // Get all descendant projects
      const descendantProjects = getDescendantProjects(itemId)
      const allProjectIds = [itemId, ...descendantProjects.map(p => p.id)]
      
      // Also get folders that are children of this project hierarchy
      const foldersInProjectHierarchy = folders.filter(folder => 
        allProjectIds.includes(folder.parentId || '')
      )
      
      // Find all snippets in this project hierarchy (including child folders)
      affectedSnippets = snippets.filter(snippet => 
        allProjectIds.includes(snippet.projectId || '') ||
        foldersInProjectHierarchy.some(f => f.id === snippet.folderId)
      )
    }

    // Move all affected snippets to "Sem marcação"
    affectedSnippets.forEach(snippet => {
      if (type === 'folder') {
        updateSnippet(snippet.id, { folderId: undefined })
      } else {
        updateSnippet(snippet.id, { projectId: undefined, folderId: undefined })
      }
    })

    if (type === 'folder') {
      forceDeleteFolder(itemId)
    } else {
      forceDeleteProjectItem(itemId)
    }
    
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {type === 'folder' ? t('deleteConfirmationModal.deleteFolder') : t('deleteConfirmationModal.deleteProject')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('deleteConfirmationModal.irreversible')}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            {t('deleteConfirmationModal.containsSnippets', {
              type: type === 'folder' ? t('deleteConfirmationModal.folder') : t('deleteConfirmationModal.project'),
              name: itemName,
              count: snippetCount
            })}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {snippetCount === 1 ? t('deleteConfirmationModal.whatToDoSingular') : t('deleteConfirmationModal.whatToDoPlural')}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleKeepSnippets}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {type === 'folder' ? t('deleteConfirmationModal.keepWithoutFolder') : t('deleteConfirmationModal.keepWithoutProject')}
          </button>

          <button
            onClick={handleDeleteAll}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('deleteConfirmationModal.deleteAll')}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('deleteConfirmationModal.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmationModal