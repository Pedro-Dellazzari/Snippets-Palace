import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import {
  FolderIcon,
  RocketLaunchIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import {
  FolderIcon as FolderSolidIcon
} from '@heroicons/react/24/solid'

export interface ContextMenuPosition {
  x: number
  y: number
}

export interface ContextMenuFolder {
  id: string
  name: string
  parentId?: string
  children?: ContextMenuFolder[]
}

export interface ContextMenuProject {
  id: string
  name: string
  parentId?: string
  children?: ContextMenuProject[]
}

export interface ContextMenuProps {
  isOpen: boolean
  position: ContextMenuPosition
  folders: ContextMenuFolder[]
  projects: ContextMenuProject[]
  currentFolder?: string
  currentProject?: string
  onClose: () => void
  onMoveToFolder: (folderId: string) => void
  onMoveToProject: (projectId: string) => void
}

// Helper function to build hierarchical structure
const buildHierarchy = <T extends { id: string; parentId?: string }>(items: T[]): (T & { children: T[] })[] => {
  const itemMap = new Map<string, T & { children: T[] }>()
  const rootItems: (T & { children: T[] })[] = []

  // Create map with children arrays
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] })
  })

  // Build hierarchy
  items.forEach(item => {
    const itemWithChildren = itemMap.get(item.id)!
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children.push(itemWithChildren)
    } else {
      rootItems.push(itemWithChildren)
    }
  })

  return rootItems
}

interface CascadingSubmenuProps {
  items: (ContextMenuFolder | ContextMenuProject)[]
  type: 'folder' | 'project'
  currentId?: string
  onSelect: (id: string) => void
  position: { x: number; y: number }
  level?: number
}

const CascadingSubmenu: React.FC<CascadingSubmenuProps> = ({
  items,
  type,
  currentId,
  onSelect,
  position,
  level = 0
}) => {
  const { t } = useTranslation()
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [childSubmenuPosition, setChildSubmenuPosition] = useState<{ x: number; y: number } | null>(null)
  const submenuRef = useRef<HTMLDivElement>(null)

  const getIcon = (item: ContextMenuFolder | ContextMenuProject) => {
    if (type === 'folder') {
      return item.children && item.children.length > 0 ? FolderSolidIcon : FolderIcon
    }
    return RocketLaunchIcon
  }

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleItemHover = (item: ContextMenuFolder | ContextMenuProject, event: React.MouseEvent) => {
    // Clear any existing timeouts
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }

    if (item.children && item.children.length > 0) {
      setHoveredItemId(item.id)
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const submenuWidth = 200
      
      let x = rect.right + 8
      let y = rect.top

      // Adjust horizontal position if submenu would go off screen
      if (x + submenuWidth > window.innerWidth) {
        x = rect.left - submenuWidth - 8
      }

      // Adjust vertical position if submenu would go off screen
      const maxSubmenuHeight = 400
      if (y + maxSubmenuHeight > window.innerHeight) {
        y = Math.max(10, window.innerHeight - maxSubmenuHeight - 10)
      }

      setChildSubmenuPosition({ x, y })
    } else {
      // Don't hide submenu immediately - let the mouse leave handler deal with it
      // This prevents the submenu from closing when hovering over leaf items
      setHoveredItemId(item.id) // Still set the hovered item for visual feedback
    }
  }

  const handleMouseLeave = () => {
    // Very short timeout - just to handle quick mouse movements
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredItemId(null)
      setChildSubmenuPosition(null)
    }, 100) // Much shorter timeout for better UX
  }

  const handleMouseEnterSubmenu = () => {
    // Cancel hiding when mouse enters submenu area
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <div
        ref={submenuRef}
        className="fixed z-[60] min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
        onMouseEnter={handleMouseEnterSubmenu}
        onMouseLeave={(e) => {
          // Only hide if mouse is actually leaving the entire submenu area
          const relatedTarget = e.relatedTarget as Element
          if (relatedTarget && (
            submenuRef.current?.contains(relatedTarget) ||
            relatedTarget.closest('[class*="z-[60]"]')
          )) {
            return
          }
          handleMouseLeave()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* "None" option only for root level */}
        {level === 0 && (
          <button
            className={clsx(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
              'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onSelect('')
            }}
          >
            <div className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1">{type === 'folder' ? t('contextMenu.noFolder') : t('contextMenu.noProject')}</span>
            {!currentId && (
              <CheckIcon className="h-4 w-4 text-blue-500" />
            )}
          </button>
        )}

        {items.map((item) => {
          const Icon = getIcon(item)
          return (
            <div
              key={item.id}
              data-folder-id={item.id}
              data-item-name={item.name}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors relative',
                'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
                'group cursor-pointer',
                hoveredItemId === item.id && 'bg-blue-50 dark:bg-blue-900/20'
              )}
              onMouseEnter={(e) => handleItemHover(item, e)}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(item.id)
              }}
            >
              <Icon className={clsx(
                'h-4 w-4 flex-shrink-0',
                item.children && item.children.length > 0 
                  ? 'text-blue-500 dark:text-blue-400' 
                  : 'text-gray-400'
              )} />
              <span className="flex-1">{item.name}</span>
              {item.children && item.children.length > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              )}
              {currentId === item.id && (
                <CheckIcon className="h-4 w-4 text-blue-500" />
              )}
            </div>
          )
        })}
      </div>

      {/* Child submenu */}
      {hoveredItemId && childSubmenuPosition && (
        <CascadingSubmenu
          items={items.find(item => item.id === hoveredItemId)?.children || []}
          type={type}
          currentId={currentId}
          onSelect={onSelect}
          position={childSubmenuPosition}
          level={level + 1}
        />
      )}
    </>
  )
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  folders,
  projects,
  currentFolder,
  currentProject,
  onClose,
  onMoveToFolder,
  onMoveToProject
}) => {
  const { t } = useTranslation()
  const [showSubmenu, setShowSubmenu] = useState(false)
  const [submenuType, setSubmenuType] = useState<'folder' | 'project' | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems = [
    { id: 'move-folder', label: t('contextMenu.moveToFolder'), icon: FolderIcon, hasSubmenu: true },
    { id: 'move-project', label: t('contextMenu.moveToProject'), icon: RocketLaunchIcon, hasSubmenu: true }
  ]

  // Build hierarchical structures
  const hierarchicalFolders = buildHierarchy(folders)
  const hierarchicalProjects = buildHierarchy(projects)

  useEffect(() => {
    if (!isOpen) {
      setShowSubmenu(false)
      setSubmenuType(null)
      setFocusedIndex(-1)
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Check if click is inside main menu
      if (menuRef.current && menuRef.current.contains(target)) {
        return
      }
      
      // Check if click is inside any context menu related element
      const contextMenuElement = target.closest('[class*="z-[60]"], [class*="z-50"]')
      if (contextMenuElement) {
        return
      }
      
      onClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setFocusedIndex(prev => prev < menuItems.length - 1 ? prev + 1 : 0)
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setFocusedIndex(prev => prev > 0 ? prev - 1 : menuItems.length - 1)
      }

      if (event.key === 'ArrowRight' && focusedIndex >= 0) {
        event.preventDefault()
        setShowSubmenu(true)
        setSubmenuType(focusedIndex === 0 ? 'folder' : 'project')
      }

      if (event.key === 'ArrowLeft' && showSubmenu) {
        event.preventDefault()
        setShowSubmenu(false)
        setSubmenuType(null)
      }

      if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault()
        handleItemClick(menuItems[focusedIndex].id)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, focusedIndex, showSubmenu])

  const handleItemClick = (itemId: string) => {
    if (itemId === 'move-folder') {
      setShowSubmenu(true)
      setSubmenuType('folder')
    } else if (itemId === 'move-project') {
      setShowSubmenu(true)
      setSubmenuType('project')
    }
  }

  const handleFolderSelect = (folderId: string) => {
    onMoveToFolder(folderId)
    setTimeout(() => onClose(), 0)
  }

  const handleProjectSelect = (projectId: string) => {
    onMoveToProject(projectId)
    setTimeout(() => onClose(), 0)
  }

  const getMenuPosition = () => {
    if (!isOpen) return {}

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const menuWidth = 220
    const menuHeight = 60

    let x = position.x
    let y = position.y

    // Adjust horizontal position if menu would go off screen
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10
    }

    // Adjust vertical position if menu would go off screen
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10
    }

    return {
      left: `${x}px`,
      top: `${y}px`
    }
  }

  const getSubmenuPosition = () => {
    if (!menuRef.current) return { x: 0, y: 0 }

    const menuRect = menuRef.current.getBoundingClientRect()
    let x = menuRect.right + 8
    let y = menuRect.top

    // Adjust horizontal position if submenu would go off screen
    const submenuWidth = 200
    if (x + submenuWidth > window.innerWidth) {
      x = menuRect.left - submenuWidth - 8
    }

    // Adjust vertical position if submenu would go off screen
    const maxSubmenuHeight = 400 // Estimate max height
    if (y + maxSubmenuHeight > window.innerHeight) {
      y = Math.max(10, window.innerHeight - maxSubmenuHeight - 10)
    }

    return { x, y }
  }

  if (!isOpen) return null

  return createPortal(
    <>
      {/* Main Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2"
        style={getMenuPosition()}
      >
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                focusedIndex === index && 'bg-gray-50 dark:bg-gray-700',
                'text-gray-700 dark:text-gray-300'
              )}
              onClick={() => handleItemClick(item.id)}
              onMouseEnter={() => {
                setFocusedIndex(index)
                if (item.hasSubmenu) {
                  setShowSubmenu(true)
                  setSubmenuType(item.id === 'move-folder' ? 'folder' : 'project')
                } else {
                  setShowSubmenu(false)
                  setSubmenuType(null)
                }
              }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.hasSubmenu && (
                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Cascading Submenu */}
      {showSubmenu && submenuType && (
        <CascadingSubmenu
          items={submenuType === 'folder' ? hierarchicalFolders : hierarchicalProjects}
          type={submenuType}
          currentId={submenuType === 'folder' ? currentFolder : currentProject}
          onSelect={submenuType === 'folder' ? handleFolderSelect : handleProjectSelect}
          position={getSubmenuPosition()}
        />
      )}
    </>,
    document.body
  )
}

export default ContextMenu