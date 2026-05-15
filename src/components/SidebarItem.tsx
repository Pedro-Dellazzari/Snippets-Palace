import React, { memo, useState, useRef, useEffect } from 'react'
import { SidebarItem as SidebarItemType } from '../types/sidebar'
import { useStore } from '../store/useStore'
import { useInlineCreation } from '../hooks/useInlineCreation'
import SidebarIcon from './SidebarIcon'
import FolderProjectContextMenu, { FolderProjectContextMenuPosition } from './FolderProjectContextMenu'
import clsx from 'clsx'

interface SidebarItemProps {
  item: SidebarItemType
  level: number
  selectedItem: string | null
  expandedFolders: Set<string>
  onSelect: (itemId: string) => void
  onToggle: (itemId: string) => void
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  item,
  level,
  selectedItem,
  expandedFolders,
  onSelect,
  onToggle
}) => {
  // Granular selectors — these are all stable action references, so a single
  // subscription per slice avoids re-renders on unrelated state changes.
  const setSelectedFolder = useStore(state => state.setSelectedFolder)
  const setSelectedProject = useStore(state => state.setSelectedProject)
  const setSelectedItem = useStore(state => state.setSelectedItem)
  const updateFolder = useStore(state => state.updateFolder)
  const updateProjectItem = useStore(state => state.updateProjectItem)
  const addFolder = useStore(state => state.addFolder)
  const addProjectItem = useStore(state => state.addProjectItem)
  const startCreatingFolder = useInlineCreation(state => state.startCreatingFolder)
  const startCreatingProject = useInlineCreation(state => state.startCreatingProject)
  const cancelCreation = useInlineCreation(state => state.cancelCreation)
  const finishCreation = useInlineCreation(state => state.finishCreation)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.label)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: FolderProjectContextMenuPosition
  }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  
  const hasChildren = item.children && item.children.length > 0
  const paddingLeft = 16 + (level * 20)
  const canEdit = (item.id.startsWith('folder-') || item.id.startsWith('project-')) && !item.isSpecial
  const isCreating = item.isCreating || false

  const handleClick = () => {
    if (item.isSpecial) {
      // Lidar com botões especiais como "+ Nova pasta" e "+ Novo Projeto"
      if (item.id === 'add-folder') {
        // Start inline folder creation
        startCreatingFolder()
      } else if (item.id === 'add-project') {
        // Start inline project creation
        startCreatingProject()
      }
      return
    }
    
    // Always handle navigation - regardless of having children
    if (item.id.startsWith('folder-')) {
      const folderId = item.id.replace('folder-', '')
      setSelectedFolder(folderId)
      setSelectedItem(item.id)
    } else if (item.id.startsWith('project-')) {
      const projectId = item.id.replace('project-', '')
      setSelectedProject(projectId)
      setSelectedItem(item.id)
    } else {
      // Clear any folder/project filters for special views
      setSelectedFolder(null)
      setSelectedProject(null)
      setSelectedItem(item.id)
    }
  }

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(item.id)
  }

  const handleDoubleClick = () => {
    if (canEdit && !isEditing) {
      setIsEditing(true)
      setEditValue(item.label)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!canEdit) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }

  const handleCreateSubfolder = (parentId: string) => {
    const realParentId = parentId.startsWith('folder-') ? parentId.replace('folder-', '') : parentId.replace('project-', '')
    startCreatingFolder(realParentId)
  }

  const handleCreateSubproject = () => {
    // This should never be called due to hierarchy rules, but kept for interface compatibility
    console.warn('Creating subprojects is not allowed according to hierarchy rules')
  }

  const handleRename = () => {
    setIsEditing(true)
  }

  const handleDelete = (itemId: string) => {
    if (itemId.startsWith('folder-')) {
      const folderId = itemId.replace('folder-', '')
      window.dispatchEvent(new CustomEvent('deleteFolderWithSnippets', { 
        detail: { folderId } 
      }))
    } else if (itemId.startsWith('project-')) {
      const projectId = itemId.replace('project-', '')
      window.dispatchEvent(new CustomEvent('deleteProjectWithSnippets', { 
        detail: { projectId } 
      }))
    }
  }

  const handleEditSubmit = () => {
    const trimmedValue = editValue.trim()
    if (trimmedValue && trimmedValue !== item.label) {
      if (item.id.startsWith('folder-')) {
        const folderId = item.id.replace('folder-', '')
        updateFolder(folderId, { name: trimmedValue })
      } else if (item.id.startsWith('project-')) {
        const projectId = item.id.replace('project-', '')
        updateProjectItem(projectId, { name: trimmedValue })
      }
    }
    setIsEditing(false)
  }

  const handleEditCancel = () => {
    setEditValue(item.label)
    setIsEditing(false)
  }

  const handleInlineCreateSubmit = () => {
    const trimmedValue = editValue.trim()
    console.log('🔍 handleInlineCreateSubmit:', { trimmedValue, itemId: item.id })
    if (trimmedValue) {
      if (item.id === 'creating-folder') {
        // Create new folder - check if we're creating in a parent
        const creatingFolderState = useInlineCreation.getState().creatingFolder
        console.log('🔍 creatingFolderState:', creatingFolderState)
        const parentId = creatingFolderState === 'root' ? undefined : creatingFolderState
        console.log('🔍 calling addFolder with:', { name: trimmedValue, parentId })
        addFolder(trimmedValue, parentId || undefined)
      } else if (item.id === 'creating-project') {
        // Create new project - always at root level for now
        console.log('🔍 calling addProjectItem with:', trimmedValue)
        addProjectItem(trimmedValue)
      }
      finishCreation()
    } else {
      cancelCreation()
    }
    setEditValue('')
  }

  const handleInlineCreateCancel = () => {
    cancelCreation()
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isCreating) {
        handleInlineCreateSubmit()
      } else {
        handleEditSubmit()
      }
    } else if (e.key === 'Escape') {
      if (isCreating) {
        handleInlineCreateCancel()
      } else {
        handleEditCancel()
      }
    }
  }

  useEffect(() => {
    if ((isEditing || isCreating) && inputRef.current) {
      inputRef.current.focus()
      if (isEditing) {
        inputRef.current.select()
      }
    }
  }, [isEditing, isCreating])

  useEffect(() => {
    setEditValue(item.label)
  }, [item.label])

  const isSelected = selectedItem === item.id
  const isExpanded = expandedFolders.has(item.id)

  const getItemStyles = () => {
    if (isSelected) {
      return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-2 border-l-blue-500 shadow-sm'
    }
    
    if (item.isSpecial) {
      return 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-600 dark:hover:text-gray-300'
    }

    return 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-gray-100'
  }

  const getCountBadge = () => {
    if (!item.count && item.count !== 0) return null

    return (
      <span className={clsx(
        'text-xs font-medium px-2 py-0.5 rounded-full ml-auto transition-colors duration-200',
        isSelected 
          ? 'bg-blue-100 dark:bg-blue-800/60 text-blue-700 dark:text-blue-300'
          : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400'
      )}>
        {item.count}
      </span>
    )
  }

  const getItemColor = () => {
    if (!item.color) return {}
    
    if (item.type === 'tag') {
      return {
        '--tag-color': item.color,
        backgroundColor: `${item.color}15`,
        borderLeft: `3px solid ${item.color}`
      } as React.CSSProperties
    }
    
    // Para linguagens, usar apenas uma borda colorida sutil
    if (item.id?.startsWith('language-')) {
      return {
        '--language-color': item.color,
        borderLeft: `3px solid ${item.color}`
      } as React.CSSProperties
    }
    
    return {}
  }

  // Add tutorial targeting classes
  const getTutorialClass = () => {
    if (item.id === 'favorites') return 'sidebar-favorites'
    return ''
  }

  return (
    <div>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={clsx(
          'flex items-center gap-3 py-2 pr-3 cursor-pointer transition-all duration-200 group relative rounded-md mx-1',
          getItemStyles(),
          hasChildren && 'pr-10',
          'hover:scale-[1.02] active:scale-[0.98]',
          getTutorialClass()
        )}
        style={{ 
          paddingLeft: `${paddingLeft}px`,
          ...getItemColor()
        }}
      >
        {/* Expand/Collapse Button for folders */}
        {hasChildren && (
          <button
            onClick={handleToggleClick}
            className={clsx(
              'absolute right-2 p-1.5 rounded-md hover:bg-gray-200/70 dark:hover:bg-gray-600/40 transition-all duration-200',
              'flex items-center justify-center opacity-70 hover:opacity-100',
              isExpanded && 'opacity-100'
            )}
          >
            <SidebarIcon 
              name="chevron" 
              isExpanded={isExpanded}
              className="h-3 w-3 text-gray-400 dark:text-gray-500 transition-transform duration-200"
            />
          </button>
        )}

        {/* Icon */}
        <div className="flex-shrink-0">
          {item.type === 'tag' && item.color ? (
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: item.color }}
              />
              <SidebarIcon 
                name={item.icon} 
                className="h-4 w-4"
                isExpanded={hasChildren ? isExpanded : undefined}
              />
            </div>
          ) : item.id?.startsWith('language-') && item.color ? (
            <div className="flex items-center">
              <div
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: item.color }}
              />
              <SidebarIcon 
                name={item.icon} 
                className="h-4 w-4 text-gray-500 dark:text-gray-400"
                isExpanded={hasChildren ? isExpanded : undefined}
              />
            </div>
          ) : (
            <SidebarIcon 
              name={item.icon} 
              className={clsx(
                'h-4 w-4',
                item.isSpecial 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-500 dark:text-gray-400'
              )}
              isExpanded={hasChildren ? isExpanded : undefined}
            />
          )}
        </div>

        {/* Label */}
        {(isEditing || isCreating) ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={isCreating ? handleInlineCreateSubmit : handleEditSubmit}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm font-medium bg-white dark:bg-gray-700 border border-blue-500 rounded px-1 py-0.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
            placeholder={isCreating ? (item.id === 'creating-folder' ? 'Nome da pasta...' : 'Nome do projeto...') : ''}
          />
        ) : (
          <span className={clsx(
            'flex-1 text-sm font-medium truncate',
            isSelected && 'font-semibold'
          )}>
            {item.label}
          </span>
        )}

        {/* Count Badge */}
        {getCountBadge()}
      </div>

      {/* Children */}
      {hasChildren && (
        <div 
          className={clsx(
            'transition-all duration-300 ease-in-out overflow-hidden border-l border-gray-200/40 dark:border-gray-600/40',
            isExpanded ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'
          )}
          style={{ marginLeft: `${paddingLeft + 8}px` }}
        >
          {item.children!.map(child => (
            <SidebarItem
              key={child.id}
              item={child}
              level={level + 1}
              selectedItem={selectedItem}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}

      {/* Context Menu */}
      <FolderProjectContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        itemType={item.id.startsWith('folder-') ? 'folder' : 'project'}
        itemId={item.id}
        itemName={item.label}
        onClose={handleCloseContextMenu}
        onCreateSubfolder={handleCreateSubfolder}
        onCreateSubproject={handleCreateSubproject}
        onRename={handleRename}
        onDelete={handleDelete}
      />
    </div>
  )
}

export default memo(SidebarItem)