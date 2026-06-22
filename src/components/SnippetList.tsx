import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { backdropVariants, modalVariants } from '../utils/motionVariants'
import { useStore } from '../store/useStore'
import clsx from 'clsx'
import ContextMenu, { ContextMenuFolder, ContextMenuProject } from './ContextMenu'
import { useContextMenu } from '../hooks/useContextMenu'
import EmptyState from './EmptyState'
import SnippetCard from './SnippetCard'
import { Snippet } from '../types'

const NewSnippetModal = lazy(() => import('./NewSnippetModal'))

type SortOption = 'newest' | 'oldest' | 'favorites' | 'language' | 'mostUsed'

const SnippetList: React.FC = () => {
  const { t } = useTranslation()
  // Granular selectors — each subscribes only to the slice it needs
  const snippets = useStore(state => state.snippets)
  const selectedSnippet = useStore(state => state.selectedSnippet)
  const setSelectedSnippet = useStore(state => state.setSelectedSnippet)
  const searchQuery = useStore(state => state.searchQuery)
  const searchResults = useStore(state => state.searchResults)
  const toggleFavorite = useStore(state => state.toggleFavorite)
  const deleteSnippet = useStore(state => state.deleteSnippet)
  const selectedFolderId = useStore(state => state.selectedFolderId)
  const selectedProjectId = useStore(state => state.selectedProjectId)
  const selectedItem = useStore(state => state.selectedItem)
  const folders = useStore(state => state.folders)
  const projectItems = useStore(state => state.projectItems)
  const getDescendantFolders = useStore(state => state.getDescendantFolders)
  const getDescendantProjects = useStore(state => state.getDescendantProjects)
  const moveSnippetToFolder = useStore(state => state.moveSnippetToFolder)
  const moveSnippetToProject = useStore(state => state.moveSnippetToProject)

  const { isOpen, position, targetSnippet, openContextMenu, closeContextMenu } = useContextMenu()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null)
  const [snippetToDelete, setSnippetToDelete] = useState<Snippet | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null)
  const [clickedSnippetId, setClickedSnippetId] = useState<string | null>(null)
  const [exitingSnippetId, setExitingSnippetId] = useState<string | null>(null)

  // Index folders/projects by id once so each card can resolve its label in O(1)
  const folderById = useMemo(() => {
    const m = new Map<string, typeof folders[number]>()
    for (const f of folders) m.set(f.id, f)
    return m
  }, [folders])

  const projectById = useMemo(() => {
    const m = new Map<string, typeof projectItems[number]>()
    for (const p of projectItems) m.set(p.id, p)
    return m
  }, [projectItems])

  const clearCopiedState = useCallback(() => {
    setCopiedSnippetId(null)
    setExitingSnippetId(null)
  }, [])

  const clearClickedState = useCallback(() => setClickedSnippetId(null), [])

  const startExitAnimation = useCallback((snippetId: string) => {
    setExitingSnippetId(snippetId)
    setTimeout(clearCopiedState, 400)
  }, [clearCopiedState])

  // Filtering and sorting
  const sortedSnippets = useMemo(() => {
    let base = searchQuery ? searchResults.map(r => r.snippet) : snippets

    if (selectedItem === 'all-snippets') {
      // no-op
    } else if (selectedItem === 'favorites') {
      base = base.filter(s => s.favorite)
    } else if (selectedItem === 'unassigned') {
      base = base.filter(s => !s.folderId && !s.projectId)
    } else if (selectedItem?.startsWith('language-')) {
      const language = selectedItem.replace('language-', '').toLowerCase()
      base = base.filter(s => s.language?.toLowerCase() === language)
    } else if (selectedFolderId) {
      if (folderById.has(selectedFolderId)) {
        const descendantFolders = getDescendantFolders(selectedFolderId)
        const all = new Set([selectedFolderId, ...descendantFolders.map(f => f.id)])
        base = base.filter(s => all.has(s.folderId || ''))
      }
    } else if (selectedProjectId) {
      if (projectById.has(selectedProjectId)) {
        const descendantProjects = getDescendantProjects(selectedProjectId)
        const allProjectIds = new Set([selectedProjectId, ...descendantProjects.map(p => p.id)])
        const projectFolderIds = new Set(
          folders.filter(f => allProjectIds.has(f.parentId || '')).map(f => f.id)
        )
        base = base.filter(s => projectFolderIds.has(s.folderId || ''))
      }
    }

    const sorted = base.slice()
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      case 'oldest':
        sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        break
      case 'favorites':
        sorted.sort((a, b) => {
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        })
        break
      case 'language':
        sorted.sort((a, b) => a.language.localeCompare(b.language))
        break
      case 'mostUsed':
        sorted.sort((a, b) => b.usage_count - a.usage_count)
        break
    }
    return sorted
  }, [snippets, searchResults, searchQuery, sortBy, selectedFolderId, selectedProjectId, selectedItem, folderById, projectById, folders, getDescendantFolders, getDescendantProjects])

  const displaySnippets = sortedSnippets

  const currentContextName = useMemo(() => {
    if (selectedFolderId) {
      const folder = folderById.get(selectedFolderId)
      return folder ? `📁 ${folder.name}` : t('snippetList.folder')
    }
    if (selectedProjectId) {
      const project = projectById.get(selectedProjectId)
      return project ? `🚀 ${project.name}` : t('snippetList.project')
    }
    if (selectedItem === 'favorites') return t('snippetList.favoritesContext')
    if (selectedItem === 'all-snippets') return t('snippetList.allSnippets')
    if (selectedItem === 'unassigned') return t('snippetList.unassignedContext')
    if (selectedItem?.startsWith('language-')) {
      const language = selectedItem.replace('language-', '')
      return `💻 ${language.charAt(0).toUpperCase() + language.slice(1)}`
    }
    if (searchQuery) return t('snippetList.searchResults', { count: displaySnippets.length })
    return t('snippetList.snippetsLabel')
  }, [selectedFolderId, selectedProjectId, selectedItem, searchQuery, displaySnippets.length, folderById, projectById, t])

  const contextMenuFolders = useMemo<ContextMenuFolder[]>(
    () => folders
      .filter(folder => !folder.parentId || !projectById.has(folder.parentId))
      .map(folder => ({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId && !projectById.has(folder.parentId) ? folder.parentId : undefined
      })),
    [folders, projectById]
  )

  const contextMenuProjects = useMemo<ContextMenuProject[]>(
    () => projectItems.map(p => ({ id: p.id, name: p.name, parentId: p.parentId })),
    [projectItems]
  )

  const handleMoveToFolder = useCallback((folderId: string) => {
    if (!targetSnippet) return
    moveSnippetToFolder(targetSnippet.id, folderId === '' ? null : folderId)
  }, [targetSnippet, moveSnippetToFolder])

  const handleMoveToProject = useCallback((projectId: string) => {
    if (!targetSnippet) return
    moveSnippetToProject(targetSnippet.id, projectId === '' ? null : projectId)
  }, [targetSnippet, moveSnippetToProject])

  const handleCopySnippet = useCallback(async (snippet: Snippet) => {
    if (!snippet.content || typeof snippet.content !== 'string') return

    setClickedSnippetId(snippet.id)
    setTimeout(clearClickedState, 150)

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(snippet.content)
      } else {
        const ta = document.createElement('textarea')
        ta.value = snippet.content
        ta.style.position = 'fixed'
        ta.style.left = '-999999px'
        ta.style.top = '-999999px'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) return
      }
      setCopiedSnippetId(snippet.id)
      setTimeout(() => startExitAnimation(snippet.id), 1600)
    } catch (error) {
      console.error('Failed to copy snippet content:', error)
    }
  }, [clearClickedState, startExitAnimation])

  const handleDirectDelete = useCallback((snippet: Snippet) => {
    setSnippetToDelete(snippet)
    setShowDeleteModal(true)
  }, [])

  const handleEdit = useCallback((snippet: Snippet) => {
    setEditingSnippet(snippet)
    setShowEditModal(true)
  }, [])

  const confirmDirectDelete = useCallback(() => {
    if (snippetToDelete) {
      deleteSnippet(snippetToDelete.id)
      setShowDeleteModal(false)
      setSnippetToDelete(null)
    }
  }, [snippetToDelete, deleteSnippet])

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {currentContextName}
          </h2>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {displaySnippets.length}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all duration-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
              </svg>
              <span>
                {sortBy === 'newest' && t('snippetList.sort.newest')}
                {sortBy === 'oldest' && t('snippetList.sort.oldest')}
                {sortBy === 'favorites' && t('snippetList.sort.favorites')}
                {sortBy === 'language' && t('snippetList.sort.language')}
                {sortBy === 'mostUsed' && t('snippetList.sort.mostUsed')}
              </span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showSortDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 dropdown-enter">
                {[
                  { value: 'newest', label: t('snippetList.sort.newest') },
                  { value: 'oldest', label: t('snippetList.sort.oldest') },
                  { value: 'favorites', label: t('snippetList.sort.favorites') },
                  { value: 'language', label: t('snippetList.sort.language') },
                  { value: 'mostUsed', label: t('snippetList.sort.mostUsed') }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value as SortOption)
                      setShowSortDropdown(false)
                    }}
                    className={clsx(
                      'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                      sortBy === option.value
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {displaySnippets.length === 0 ? (
          searchQuery ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              {t('snippetList.noResults')}
            </div>
          ) : snippets.length === 0 ? (
            <EmptyState onCreateNew={() => setShowNewModal(true)} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              {t('snippetList.noSnippetsInCategory')}
            </div>
          )
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {displaySnippets.map(snippet => {
              const folder = snippet.folderId ? folderById.get(snippet.folderId) : undefined
              const parentProject = folder?.parentId ? projectById.get(folder.parentId) : undefined
              return (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  selected={selectedSnippet?.id === snippet.id}
                  copied={copiedSnippetId === snippet.id}
                  exiting={exitingSnippetId === snippet.id}
                  clicked={clickedSnippetId === snippet.id}
                  folder={folder}
                  parentProject={parentProject}
                  onSelect={setSelectedSnippet}
                  onCopy={handleCopySnippet}
                  onContextMenu={openContextMenu}
                  onEdit={handleEdit}
                  onToggleFavorite={toggleFavorite}
                  onDelete={handleDirectDelete}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        isOpen={isOpen}
        position={position}
        folders={contextMenuFolders}
        projects={contextMenuProjects}
        currentFolder={targetSnippet?.folderId}
        currentProject={targetSnippet?.projectId}
        onClose={closeContextMenu}
        onMoveToFolder={handleMoveToFolder}
        onMoveToProject={handleMoveToProject}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('snippetList.deleteSnippet')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {t('snippetList.deleteConfirmMessage', { title: snippetToDelete?.title })}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSnippetToDelete(null)
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {t('snippetList.cancel')}
                </button>
                <button
                  onClick={confirmDirectDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t('snippetList.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {(showEditModal || showNewModal) && (
        <Suspense fallback={null}>
          <NewSnippetModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setEditingSnippet(null)
            }}
            editSnippet={editingSnippet}
          />
          <NewSnippetModal
            isOpen={showNewModal}
            onClose={() => setShowNewModal(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

export default SnippetList
