import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { OnboardingProvider } from './contexts/OnboardingContext'
import Sidebar from './components/Sidebar'
import SnippetList from './components/SnippetList'
import SnippetDetail from './components/SnippetDetail'
import SearchBar from './components/SearchBar'
import OnboardingTour from './components/OnboardingTour'
import SettingsPage from './components/SettingsPage'

function AppContent() {
  const loadPersistedData = useStore(state => state.loadPersistedData)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    loadPersistedData()
  }, [loadPersistedData])

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <SearchBar onOpenSettings={() => setShowSettings(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <SnippetList />
        <SnippetDetail />
      </div>

      <OnboardingTour />

      {showSettings && <SettingsPage onClose={() => setShowSettings(false)} />}
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