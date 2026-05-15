import React, { useRef, useEffect, useState } from 'react'
import { MagnifyingGlassIcon, PlusIcon, SunIcon, MoonIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useStore } from '../store/useStore'
import { useDarkMode } from '../hooks/useDarkMode'
import NewSnippetModal from './NewSnippetModal'
import TutorialTrigger from './TutorialTrigger'
import Tooltip from './Tooltip'

interface SearchBarProps {
  onOpenSettings: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({ onOpenSettings }) => {
  const searchQuery = useStore(state => state.searchQuery)
  const setSearchQuery = useStore(state => state.setSearchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showNewSnippetModal, setShowNewSnippetModal] = useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  useEffect(() => {
    const handleMenuSearch = () => {
      searchInputRef.current?.focus()
    }
    
    const handleMenuNewSnippet = () => {
      setShowNewSnippetModal(true)
    }

    if (window.electronAPI) {
      window.electronAPI.onMenuSearch(handleMenuSearch)
      window.electronAPI.onMenuNewSnippet(handleMenuNewSnippet)
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-search')
        window.electronAPI.removeAllListeners('menu-new-snippet')
      }
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchQuery('')
      searchInputRef.current?.blur()
    }
  }

  return (
    <div className="flex items-center gap-4 px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex-1 relative search-bar">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Pesquisar snippets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>
      
      <TutorialTrigger variant="icon" />

      <Tooltip content="Configurações">
        <button
          onClick={onOpenSettings}
          className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      </Tooltip>

      <Tooltip content={isDarkMode ? "Modo claro" : "Modo escuro"}>
        <button
          onClick={toggleDarkMode}
          className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
        >
          {isDarkMode ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </button>
      </Tooltip>
      
      <Tooltip content="Criar novo snippet">
        <button
          className="flex items-center gap-3 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-lg hover:scale-105 font-medium btn-new-snippet"
          onClick={() => setShowNewSnippetModal(true)}
        >
          <PlusIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Novo Snippet</span>
        </button>
      </Tooltip>
      
      <NewSnippetModal
        isOpen={showNewSnippetModal}
        onClose={() => setShowNewSnippetModal(false)}
      />
    </div>
  )
}

export default SearchBar