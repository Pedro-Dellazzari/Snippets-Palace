import { lazy, Suspense, useEffect } from 'react'
import { useStore } from './store/useStore'
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext'
import Sidebar from './components/Sidebar'
import SnippetList from './components/SnippetList'
import SnippetDetail from './components/SnippetDetail'
import SearchBar from './components/SearchBar'

// Joyride is heavy (~300KB) and only needed during the tutorial. Defer its
// download until the onboarding actually starts.
const OnboardingTour = lazy(() => import('./components/OnboardingTour'))

function AppContent() {
  const loadPersistedData = useStore(state => state.loadPersistedData)
  const { isOnboardingActive, isShowingDoubleClickTip } = useOnboarding()

  useEffect(() => {
    loadPersistedData()
  }, [loadPersistedData])

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <SearchBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <SnippetList />
        <SnippetDetail />
      </div>

      {(isOnboardingActive || isShowingDoubleClickTip) && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}
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
