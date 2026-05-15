import React, { memo } from 'react'
import { SidebarSection as SidebarSectionType } from '../types/sidebar'
import SidebarItem from './SidebarItem'
import SidebarIcon from './SidebarIcon'
import clsx from 'clsx'

interface SidebarSectionProps {
  section: SidebarSectionType
  isExpanded: boolean
  selectedItem: string | null
  expandedFolders: Set<string>
  onToggleSection: (sectionId: string) => void
  onSelectItem: (itemId: string) => void
  onToggleFolder: (folderId: string) => void
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  section,
  isExpanded,
  selectedItem,
  expandedFolders,
  onToggleSection,
  onSelectItem,
  onToggleFolder
}) => {
  const handleToggleSection = () => {
    if (section.collapsible) {
      onToggleSection(section.id)
    }
  }

  // Add CSS class for tutorial targeting
  const getSectionClass = () => {
    switch (section.id) {
      case 'global-view': return 'sidebar-todos'
      case 'folders': return 'sidebar-folders'
      case 'languages': return 'sidebar-languages'
      case 'projects': return 'sidebar-projects'
      default: return ''
    }
  }

  return (
    <div className={clsx("mb-8", getSectionClass())}>
      {/* Section Header */}
      <div 
        className={clsx(
          'flex items-center gap-2 px-4 py-2.5 mb-3',
          section.collapsible && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 rounded-lg transition-colors'
        )}
        onClick={handleToggleSection}
      >
        {section.collapsible && (
          <SidebarIcon 
            name="chevron"
            isExpanded={isExpanded}
            className="h-3 w-3 text-gray-400 dark:text-gray-500"
          />
        )}
        <h3 className={clsx(
          'text-xs font-semibold tracking-wider uppercase select-none',
          'text-gray-600 dark:text-gray-400',
          !section.collapsible && 'ml-2'
        )}>
          {section.title}
        </h3>
      </div>

      {/* Section Items */}
      {isExpanded && (
        <div className="space-y-0.5">
          {section.items.map(item => (
            <SidebarItem
              key={item.id}
              item={item}
              level={0}
              selectedItem={selectedItem}
              expandedFolders={expandedFolders}
              onSelect={onSelectItem}
              onToggle={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default memo(SidebarSection)