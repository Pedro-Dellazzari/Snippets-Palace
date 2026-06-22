import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Group, Panel, Separator, useDefaultLayout } from 'react-resizable-panels'
import i18n from './i18n'
import { useStore } from './store/useStore'
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext'
import Sidebar from './components/Sidebar'
import SnippetList from './components/SnippetList'
import SnippetDetail from './components/SnippetDetail'
import SearchBar from './components/SearchBar'

// Joyride is heavy (~300KB) and only needed during the tutorial. Defer its
// download until the onboarding actually starts.
const OnboardingTour = lazy(() => import('./components/OnboardingTour'))
const TicketLogModal = lazy(() => import('./components/TicketLogModal'))

function AppContent() {
  const loadPersistedData = useStore(state => state.loadPersistedData)
  const { isOnboardingActive, isShowingDoubleClickTip } = useOnboarding()
  const [showTicketLog, setShowTicketLog] = useState(false)
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'snippets-layout-v2',
    storage: localStorage,
  })

  useEffect(() => {
    loadPersistedData()
  }, [loadPersistedData])

  useEffect(() => {
    if (!window.electronAPI?.settings) return
    window.electronAPI.settings.getAppSettings().then(settings => {
      i18n.changeLanguage(settings.language)
    })
  }, [])

  useEffect(() => {
    if (!window.electronAPI?.tray) return
    window.electronAPI.tray.onSnippetCopied(({ snippetId }) => {
      useStore.getState().incrementUsageCount(snippetId)
    })
    return () => {
      window.electronAPI.tray.removeListeners()
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <SearchBar onOpenTicketLog={() => setShowTicketLog(true)} />

      <Group
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="flex-1 overflow-hidden"
      >
        <Panel id="sidebar" className="overflow-hidden" defaultSize="18%" minSize="14%" maxSize="28%">
          <Sidebar />
        </Panel>
        <Separator className="resize-handle" />
        <Panel id="list" className="overflow-hidden" defaultSize="22%" minSize="16%" maxSize="35%">
          <SnippetList />
        </Panel>
        <Separator className="resize-handle" />
        <Panel id="detail" className="overflow-hidden" defaultSize="60%" minSize="30%">
          <SnippetDetail />
        </Panel>
      </Group>

      {(isOnboardingActive || isShowingDoubleClickTip) && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}

      <AnimatePresence>
        {showTicketLog && (
          <Suspense fallback={null}>
            <TicketLogModal
              isOpen={showTicketLog}
              onClose={() => setShowTicketLog(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  )
}

function App() {
  return (
    <OnboardingProvider>
      <AppContent />
    </OnboardingProvider>
  )
}

export default App
