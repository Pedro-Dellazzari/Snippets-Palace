import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Step } from 'react-joyride'

export interface OnboardingContextType {
  isOnboardingActive: boolean
  currentStep: number
  steps: Step[]
  startOnboarding: () => void
  stopOnboarding: () => void
  nextStep: () => void
  previousStep: () => void
  setStep: (stepIndex: number) => void
  skipOnboarding: () => void
  hasSeenOnboarding: boolean
  showDoubleClickTip: () => void
  hasSeenDoubleClickTip: boolean
  isShowingDoubleClickTip: boolean
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

const ONBOARDING_SEEN_KEY = 'snippets-app-onboarding-seen'
const DOUBLE_CLICK_TIP_SEEN_KEY = 'snippets-app-double-click-tip-seen'

interface OnboardingProviderProps {
  children: React.ReactNode
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { t } = useTranslation()
  const [isOnboardingActive, setIsOnboardingActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false)
  const [hasSeenDoubleClickTip, setHasSeenDoubleClickTip] = useState(false)
  const [isShowingDoubleClickTip, setIsShowingDoubleClickTip] = useState(false)

  // Check if user has seen onboarding on mount
  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY)
    const seenDoubleClickTip = localStorage.getItem(DOUBLE_CLICK_TIP_SEEN_KEY)
    setHasSeenOnboarding(!!seen)
    setHasSeenDoubleClickTip(!!seenDoubleClickTip)

    // Start onboarding automatically for new users
    if (!seen) {
      // Delay to ensure UI is rendered
      setTimeout(() => {
        setIsOnboardingActive(true)
      }, 1500)
    }
  }, [])

  const startOnboarding = () => {
    setCurrentStep(0)
    setIsOnboardingActive(true)
    setIsShowingDoubleClickTip(false)
  }

  const stopOnboarding = () => {
    setIsOnboardingActive(false)
    setCurrentStep(0)
    setIsShowingDoubleClickTip(false)
  }

  const nextStep = () => {
    const currentSteps = isShowingDoubleClickTip ? doubleClickTipSteps : tutorialSteps
    setCurrentStep(prev => Math.min(prev + 1, currentSteps.length - 1))
  }

  const previousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  const setStep = (stepIndex: number) => {
    const currentSteps = isShowingDoubleClickTip ? doubleClickTipSteps : tutorialSteps
    setCurrentStep(Math.max(0, Math.min(stepIndex, currentSteps.length - 1)))
  }

  const skipOnboarding = () => {
    localStorage.setItem(ONBOARDING_SEEN_KEY, 'true')
    setHasSeenOnboarding(true)
    stopOnboarding()
  }

  const showDoubleClickTip = () => {
    // Only show if not seen before
    if (!hasSeenDoubleClickTip) {
      setCurrentStep(0)
      setIsOnboardingActive(true)
      setIsShowingDoubleClickTip(true)

      // Mark as seen after showing
      localStorage.setItem(DOUBLE_CLICK_TIP_SEEN_KEY, 'true')
      setHasSeenDoubleClickTip(true)
    }
  }

  const tutorialSteps: Step[] = useMemo(() => [
    {
      target: '.sidebar-todos',
      content: t('onboarding.steps.allSnippets.content'),
      title: t('onboarding.steps.allSnippets.title'),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '.sidebar-favorites',
      content: t('onboarding.steps.favorites.content'),
      title: t('onboarding.steps.favorites.title'),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '.btn-new-snippet',
      content: t('onboarding.steps.newSnippet.content'),
      title: t('onboarding.steps.newSnippet.title'),
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '.snippet-card:first-child',
      content: t('onboarding.steps.quickCopy.content'),
      title: t('onboarding.steps.quickCopy.title'),
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '.sidebar-folders',
      content: t('onboarding.steps.folders.content'),
      title: t('onboarding.steps.folders.title'),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '.sidebar-projects',
      content: t('onboarding.steps.projects.content'),
      title: t('onboarding.steps.projects.title'),
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '.search-bar',
      content: t('onboarding.steps.search.content'),
      title: t('onboarding.steps.search.title'),
      placement: 'bottom',
      disableBeacon: true
    }
  ], [t])

  const doubleClickTipSteps: Step[] = useMemo(() => [
    {
      target: '.snippet-card:first-child',
      content: t('onboarding.doubleClickTip.copyContent'),
      title: t('onboarding.doubleClickTip.copyTitle'),
      placement: 'top',
      disableBeacon: true
    },
    {
      target: '.snippet-card:first-child',
      content: t('onboarding.doubleClickTip.organizeContent'),
      title: t('onboarding.doubleClickTip.organizeTitle'),
      placement: 'top',
      disableBeacon: true
    }
  ], [t])

  const value: OnboardingContextType = {
    isOnboardingActive,
    currentStep,
    steps: isShowingDoubleClickTip ? doubleClickTipSteps : tutorialSteps,
    startOnboarding,
    stopOnboarding,
    nextStep,
    previousStep,
    setStep,
    skipOnboarding,
    hasSeenOnboarding,
    showDoubleClickTip,
    hasSeenDoubleClickTip,
    isShowingDoubleClickTip
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}