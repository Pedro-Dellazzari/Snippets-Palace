import React, { useRef, useEffect, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { MagnifyingGlassIcon, PlusIcon, SunIcon, MoonIcon, ClipboardDocumentListIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useStore } from '../store/useStore'
import { useDarkMode } from '../hooks/useDarkMode'
import TutorialTrigger from './TutorialTrigger'
import Tooltip from './Tooltip'

const NewSnippetModal = lazy(() => import('./NewSnippetModal'))
const SettingsPage = lazy(() => import('./SettingsPage'))

const SEARCH_DEBOUNCE_MS = 180

interface SearchBarProps {
  onOpenTicketLog: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({ onOpenTicketLog }) => {
  const { t } = useTranslation()
  const setSearchQuery = useStore(state => state.setSearchQuery)
  const storeSearchQuery = useStore(state => state.searchQuery)
  const [localValue, setLocalValue] = useState(storeSearchQuery)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showNewSnippetModal, setShowNewSnippetModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  // Push to the store after a short debounce so we don't rebuild Fuse on every keystroke
  useEffect(() => {
    if (localValue === storeSearchQuery) return
    const handle = window.setTimeout(() => setSearchQuery(localValue), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
    // intentionally exclude storeSearchQuery — we only react to the user typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue, setSearchQuery])

  // Sync local input when the store is reset elsewhere (e.g. ESC to clear)
  useEffect(() => {
    if (storeSearchQuery !== localValue && document.activeElement !== searchInputRef.current) {
      setLocalValue(storeSearchQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSearchQuery])

  useEffect(() => {
    const handleMenuSearch = () => searchInputRef.current?.focus()
    const handleMenuNewSnippet = () => setShowNewSnippetModal(true)

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
      setLocalValue('')
      setSearchQuery('')
      searchInputRef.current?.blur()
    }
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex-1 relative search-bar">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={t('searchBar.placeholder')}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <TutorialTrigger variant="icon" />

      <Tooltip content={t('searchBar.ticketHistory')}>
        <button
          onClick={onOpenTicketLog}
          className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
        >
          <ClipboardDocumentListIcon className="h-5 w-5" />
        </button>
      </Tooltip>

      <Tooltip content={isDarkMode ? t('searchBar.lightMode') : t('searchBar.darkMode')}>
        <button
          onClick={toggleDarkMode}
          className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
        >
          {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
        </button>
      </Tooltip>

      <Tooltip content={t('searchBar.createNewSnippet')}>
        <button
          className="flex items-center gap-3 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-lg hover:scale-105 font-medium btn-new-snippet"
          onClick={() => setShowNewSnippetModal(true)}
        >
          <PlusIcon className="h-5 w-5" />
          <span className="hidden sm:inline">{t('searchBar.newSnippet')}</span>
        </button>
      </Tooltip>

      <Tooltip content={t('settings.title')}>
        <button
          onClick={() => setShowSettings(true)}
          className="p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      </Tooltip>

      {showNewSnippetModal && (
        <Suspense fallback={null}>
          <NewSnippetModal
            isOpen={showNewSnippetModal}
            onClose={() => setShowNewSnippetModal(false)}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={null}>
          <SettingsPage onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
    </div>
  )
}

export default SearchBar
