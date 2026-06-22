import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FolderOpenIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon,
  LanguageIcon,
} from '@heroicons/react/24/outline'
import { useStore } from '../store/useStore'
import { AppSettings, AppLanguage, StorageInfo } from '../types'

interface Props {
  onClose: () => void
}

type Status = { type: 'success' | 'error'; message: string } | null

const SettingsPage: React.FC<Props> = ({ onClose }) => {
  const { t, i18n } = useTranslation()
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const store = useStore(state => ({
    snippets: state.snippets,
    categories: state.categories,
    projects: state.projects,
    tags: state.tags,
    folders: state.folders,
    projectItems: state.projectItems,
  }))

  useEffect(() => {
    loadStorageInfo()
    loadAppSettings()
  }, [])

  async function loadAppSettings() {
    if (!window.electronAPI?.settings?.getAppSettings) return
    try {
      const settings = await window.electronAPI.settings.getAppSettings()
      setAppSettings(settings)
    } catch {
      // silent — section will just not render the toggles
    }
  }

  async function handleToggleMinimizeToTray(value: boolean) {
    if (!window.electronAPI?.settings || !appSettings) return
    setAppSettings({ ...appSettings, minimizeToTray: value })
    try {
      await window.electronAPI.settings.setMinimizeToTray(value)
    } catch {
      setAppSettings(appSettings)
      setStatus({ type: 'error', message: t('settings.tray.errorMinimize') })
    }
  }

  async function handleToggleHotSnippets(value: boolean) {
    if (!window.electronAPI?.settings || !appSettings) return
    setAppSettings({ ...appSettings, hotSnippetsEnabled: value })
    try {
      await window.electronAPI.settings.setHotSnippetsEnabled(value)
      if (!value) {
        await window.electronAPI.tray.updateHotSnippets([])
      } else {
        const hot = store.snippets
          .filter(s => s.isHot)
          .slice(0, 10)
          .map(s => ({ id: s.id, title: s.title, content: s.content }))
        await window.electronAPI.tray.updateHotSnippets(hot)
      }
    } catch {
      setAppSettings(appSettings)
      setStatus({ type: 'error', message: t('settings.tray.errorHotSnippets') })
    }
  }

  async function handleChangeLanguage(value: AppLanguage) {
    if (!window.electronAPI?.settings || !appSettings) return
    setAppSettings({ ...appSettings, language: value })
    i18n.changeLanguage(value)
    await window.electronAPI.settings.setLanguage(value)
  }

  async function loadStorageInfo() {
    if (!window.electronAPI?.settings) {
      setLoading(false)
      return
    }
    try {
      const info = await window.electronAPI.settings.getStorageInfo()
      setStorageInfo(info)
    } catch {
      setStatus({ type: 'error', message: t('settings.storage.errorLoadInfo') })
    } finally {
      setLoading(false)
    }
  }

  async function handleChangeFolder() {
    if (!window.electronAPI?.settings) return
    setChanging(true)
    setStatus(null)
    try {
      const selectedPath = await window.electronAPI.settings.selectFolder()
      if (!selectedPath) {
        setChanging(false)
        return
      }

      const currentData = {
        snippets: store.snippets,
        categories: store.categories,
        projects: store.projects,
        tags: store.tags,
        folders: store.folders,
        projectItems: store.projectItems,
      }

      await window.electronAPI.settings.setStoragePath(selectedPath, currentData)
      await loadStorageInfo()
      setStatus({ type: 'success', message: t('settings.storage.successChangeFolder') })
    } catch {
      setStatus({ type: 'error', message: t('settings.storage.errorChangeFolder') })
    } finally {
      setChanging(false)
    }
  }

  async function handleResetToDefault() {
    if (!window.electronAPI?.settings) return
    setResetting(true)
    setStatus(null)
    try {
      await window.electronAPI.settings.resetStoragePath()
      await loadStorageInfo()
      setStatus({ type: 'success', message: t('settings.storage.successResetDefault') })
    } catch {
      setStatus({ type: 'error', message: t('settings.storage.errorResetDefault') })
    } finally {
      setResetting(false)
    }
  }

  async function handleOpenFolder() {
    if (!window.electronAPI?.settings || !storageInfo) return
    await window.electronAPI.settings.openFolder(storageInfo.storagePath)
  }

  function handleResetLayout() {
    try {
      localStorage.removeItem('react-resizable-panels:snippets-layout-v2')
      window.location.reload()
    } catch {
      setStatus({ type: 'error', message: t('settings.layout.errorReset') })
    }
  }

  const isElectron = !!window.electronAPI?.settings

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Cog6ToothIcon className="h-6 w-6 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('settings.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">

          {/* Storage section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              {t('settings.storage.heading')}
            </h3>

            {!isElectron && (
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
                {t('settings.storage.desktopOnly')}
              </p>
            )}

            {isElectron && loading && (
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t('common.loading')}</span>
              </div>
            )}

            {isElectron && !loading && storageInfo && (
              <div className="space-y-4">
                {/* Current path */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {storageInfo.isCustomPath ? t('settings.storage.customPath') : t('settings.storage.defaultPath')}
                    </span>
                    {storageInfo.isCustomPath && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                        {t('settings.storage.customBadge')}
                      </span>
                    )}
                  </div>
                  <p
                    className="text-sm text-gray-800 dark:text-gray-200 font-mono break-all leading-relaxed"
                    title={storageInfo.storagePath}
                  >
                    {storageInfo.storagePath}
                  </p>
                  {storageInfo.isCustomPath && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('settings.storage.fileLabel')} <span className="font-mono">snippets-data.json</span>
                    </p>
                  )}
                  {!storageInfo.isCustomPath && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('settings.storage.localStorageNote')}
                    </p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleOpenFolder}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    {t('settings.storage.openFolder')}
                  </button>

                  <button
                    onClick={handleChangeFolder}
                    disabled={changing}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                  >
                    {changing ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderOpenIcon className="h-4 w-4" />
                    )}
                    {changing ? t('settings.storage.changing') : t('settings.storage.changeFolder')}
                  </button>

                  {storageInfo.isCustomPath && (
                    <button
                      onClick={handleResetToDefault}
                      disabled={resetting}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-colors font-medium"
                    >
                      {resetting ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowPathIcon className="h-4 w-4" />
                      )}
                      {resetting ? t('settings.storage.restoring') : t('settings.storage.restoreDefault')}
                    </button>
                  )}
                </div>

                {/* Snippet count info */}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('settings.storage.snippetCountInfo', { count: store.snippets.length })}
                </p>
              </div>
            )}
          </section>

          {/* Tray section */}
          {isElectron && appSettings && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('settings.tray.heading')}
              </h3>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={appSettings.minimizeToTray}
                    onChange={(e) => handleToggleMinimizeToTray(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">
                      {t('settings.tray.minimizeLabel')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.tray.minimizeDescription')}
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={appSettings.hotSnippetsEnabled}
                    onChange={(e) => handleToggleHotSnippets(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">
                      {t('settings.tray.hotSnippetsLabel')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.tray.hotSnippetsDescription')}
                    </span>
                  </div>
                </label>
              </div>
            </section>
          )}

          {/* Language section */}
          {isElectron && appSettings && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {t('settings.language.heading')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('settings.language.description')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleChangeLanguage('pt-BR')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                    appSettings.language === 'pt-BR'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <LanguageIcon className="h-4 w-4" />
                  {t('settings.language.portuguese')}
                </button>
                <button
                  onClick={() => handleChangeLanguage('en')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                    appSettings.language === 'en'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <LanguageIcon className="h-4 w-4" />
                  {t('settings.language.english')}
                </button>
              </div>
            </section>
          )}

          {/* Layout section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              {t('settings.layout.heading')}
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.layout.description')}
              </p>
              <button
                onClick={handleResetLayout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                <ArrowPathIcon className="h-4 w-4" />
                {t('settings.layout.resetButton')}
              </button>
            </div>
          </section>

          {/* Status feedback */}
          {status && (
            <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              status.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {status.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
