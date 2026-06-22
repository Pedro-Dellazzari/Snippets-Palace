import React from 'react'
import { useTranslation } from 'react-i18next'
import { useOnboarding } from '../contexts/OnboardingContext'
import Tooltip from './Tooltip'

interface TutorialTriggerProps {
  variant?: 'button' | 'text' | 'icon'
  className?: string
}

const TutorialTrigger: React.FC<TutorialTriggerProps> = ({ 
  variant = 'button', 
  className = '' 
}) => {
  const { t } = useTranslation()
  const { startOnboarding } = useOnboarding()

  const handleStartTutorial = () => {
    startOnboarding()
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleStartTutorial}
        className={`text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors ${className}`}
      >
        {t('tutorialTrigger.reviewTutorial')}
      </button>
    )
  }

  if (variant === 'icon') {
    return (
      <Tooltip content={t('tutorialTrigger.reviewTutorialPlain')}>
        <button
          onClick={handleStartTutorial}
          className={`p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all duration-200 ${className}`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={handleStartTutorial}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-all duration-200 hover:shadow-sm ${className}`}
    >
      <span>📘</span>
      {t('tutorialTrigger.reviewTutorialPlain')}
    </button>
  )
}

export default TutorialTrigger