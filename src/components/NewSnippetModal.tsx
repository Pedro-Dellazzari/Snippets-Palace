import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { XMarkIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { useStore } from '../store/useStore'
import { Snippet } from '../types'
import Editor from '@monaco-editor/react'
import LanguageAutocomplete from './LanguageAutocomplete'
import Toast from './Toast'
import { useToast } from '../hooks/useToast'
import { getTagColor, getLightColor } from '../utils/colors'
import clsx from 'clsx'
import { useOnboarding } from '../contexts/OnboardingContext'

interface NewSnippetModalProps {
  isOpen: boolean
  onClose: () => void
  editSnippet?: Snippet | null
}

const NewSnippetModal: React.FC<NewSnippetModalProps> = ({ isOpen, onClose, editSnippet }) => {
  const { t } = useTranslation()
  const addSnippet = useStore(state => state.addSnippet)
  const updateSnippet = useStore(state => state.updateSnippet)
  const snippets = useStore(state => state.snippets)
  const { toast, success, error, hideToast } = useToast()
  const { showDoubleClickTip, hasSeenDoubleClickTip } = useOnboarding()

  const [formData, setFormData] = useState({
    title: '',
    language: '',
    tags: '',
    content: ''
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parsedTags, setParsedTags] = useState<string[]>([])
  
  const titleInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Parse tags when tags field changes
  useEffect(() => {
    if (formData.tags) {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
      setParsedTags(tags)
    } else {
      setParsedTags([])
    }
  }, [formData.tags])

  // Reset form when modal opens or populate for editing
  useEffect(() => {
    if (isOpen) {
      if (editSnippet) {
        // Populate form with existing snippet data
        setFormData({
          title: editSnippet.title,
          language: editSnippet.language,
          tags: editSnippet.tags.join(', '),
          content: editSnippet.content
        })
      } else {
        // Reset for new snippet
        setFormData({
          title: '',
          language: '',
          tags: '',
          content: ''
        })
      }
      setErrors({})
      setIsSubmitting(false)
      // Focus title input after animation
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 300)
    }
  }, [isOpen, editSnippet])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, formData])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = t('newSnippetModal.errorTitleRequired')
    }

    if (!formData.content.trim()) {
      newErrors.content = t('newSnippetModal.errorContentRequired')
    }

    if (!formData.language.trim()) {
      newErrors.language = t('newSnippetModal.errorLanguageRequired')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (isSubmitting) return
    
    if (!validateForm()) {
      error(t('newSnippetModal.errorFillRequired'))
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Clean and process tags
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates
      
      if (editSnippet) {
        // Update existing snippet (keep existing folder/project assignments and description)
        updateSnippet(editSnippet.id, {
          title: formData.title.trim(),
          description: editSnippet.description, // Keep existing description
          content: formData.content.trim(),
          language: formData.language.trim().toLowerCase(),
          tags: tagsArray,
          category: formData.language.trim(),
          folderId: editSnippet.folderId,
          projectId: editSnippet.projectId
        })
        success(t('newSnippetModal.successUpdated'))
      } else {
        // Create new snippet without folder/project or description
        const newSnippet: Snippet = {
          id: `snippet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: formData.title.trim(),
          description: '', // Empty description for new snippets
          content: formData.content.trim(),
          language: formData.language.trim().toLowerCase(),
          tags: tagsArray,
          category: formData.language.trim(),
          favorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usage_count: 0
        }
        
        addSnippet(newSnippet)

        // Show success message
        success(t('newSnippetModal.successCreated'))

        // If this is the first snippet and user hasn't seen the double-click tip, show it
        if (snippets.length === 0 && !hasSeenDoubleClickTip) {
          setTimeout(() => {
            showDoubleClickTip()
          }, 1500)
        }
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose()
      }, 500)
      
    } catch (err) {
      error(t('newSnippetModal.errorGeneric'))
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, isSubmitting, validateForm, addSnippet, updateSnippet, editSnippet, success, error, onClose, snippets.length, hasSeenDoubleClickTip, showDoubleClickTip])

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    onClose()
  }, [isSubmitting, onClose])

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  const getMonacoLanguage = useCallback((language: string) => {
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'typescript': 'typescript',
      'python': 'python',
      'java': 'java',
      'c#': 'csharp',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rust': 'rust',
      'php': 'php',
      'ruby': 'ruby',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'scala': 'scala',
      'sql': 'sql',
      'bash': 'shell',
      'shell': 'shell',
      'powershell': 'powershell',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'markdown': 'markdown',
      'dockerfile': 'dockerfile'
    }
    return languageMap[language.toLowerCase()] || 'plaintext'
  }, [])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div 
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editSnippet ? t('newSnippetModal.editTitle') : t('newSnippetModal.createTitle')}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {editSnippet ? t('newSnippetModal.editSubtitle') : t('newSnippetModal.createSubtitle')}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-600/50 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col h-[calc(95vh-100px)]">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('newSnippetModal.titleLabel')}
                </label>
                <input
                  ref={titleInputRef}
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={clsx(
                    'w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 text-base font-medium',
                    errors.title ? 'border-red-500 ring-red-200' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                  placeholder={t('newSnippetModal.titlePlaceholder')}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    <span>⚠️</span>
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Language and Tags Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="language" className="block text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
                    {t('newSnippetModal.languageLabel')}
                  </label>
                  <LanguageAutocomplete
                    value={formData.language}
                    onChange={(value) => handleInputChange('language', value)}
                    error={errors.language}
                    placeholder={t('newSnippetModal.languagePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    {t('newSnippetModal.tagsLabel')}
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={formData.tags}
                    onChange={(e) => handleInputChange('tags', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 text-sm"
                    placeholder={t('newSnippetModal.tagsPlaceholder')}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Tag Preview - only if tags exist */}
              {parsedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 -mt-2">
                  {parsedTags.map((tag, index) => {
                    const tagColor = getTagColor(tag)
                    return (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-xs font-medium rounded-full border"
                        style={{
                          backgroundColor: getLightColor(tagColor, 0.1),
                          borderColor: getLightColor(tagColor, 0.3),
                          color: tagColor
                        }}
                      >
                        {tag}
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Code Editor */}
              <div className="flex-1 flex flex-col">
                <label htmlFor="content" className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t('newSnippetModal.contentLabel')}
                </label>
                <div
                  className={clsx(
                    'border-2 rounded-lg overflow-hidden transition-all duration-200 shadow-sm flex-1',
                    errors.content
                      ? 'border-red-500 ring-2 ring-red-200 dark:ring-red-800'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <Editor
                    height="100%"
                    language={getMonacoLanguage(formData.language)}
                    value={formData.content}
                    onChange={(value) => handleInputChange('content', value || '')}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      lineNumbers: 'on',
                      folding: true,
                      glyphMargin: false,
                      lineDecorationsWidth: 10,
                      lineNumbersMinChars: 3,
                      fontSize: 14,
                      fontFamily: '"Fira Code", "SF Mono", Monaco, Inconsolata, "Roboto Mono", Consolas, "Courier New", monospace',
                      padding: { top: 16, bottom: 16 },
                      smoothScrolling: true,
                      cursorBlinking: 'smooth',
                      renderLineHighlight: 'none',
                      tabSize: 2,
                      insertSpaces: true,
                      automaticLayout: true,
                      contextmenu: true,
                      selectOnLineNumbers: true,
                      roundedSelection: false,
                      readOnly: isSubmitting,
                      cursorStyle: 'line',
                      mouseWheelZoom: true,
                      quickSuggestions: {
                        other: true,
                        comments: true,
                        strings: true
                      }
                    }}
                    loading={
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                          <p>{t('common.loadingEditor')}</p>
                        </div>
                      </div>
                    }
                  />
                </div>
                {errors.content && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1 flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                    <span>⚠️</span>
                    {errors.content}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <span className="hidden sm:inline">{t('newSnippetModal.shortcutHintPrefix')}</span>
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl + Enter</kbd>
                <span className="hidden sm:inline">{t('newSnippetModal.shortcutHintSuffix')}</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <XMarkIcon className="h-4 w-4" />
                  {t('newSnippetModal.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-lg disabled:cursor-not-allowed text-sm',
                    isSubmitting
                      ? 'bg-blue-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {editSnippet ? t('newSnippetModal.saving') : t('newSnippetModal.creating')}
                    </>
                  ) : (
                    <>
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      {editSnippet ? t('newSnippetModal.saveChanges') : t('newSnippetModal.createSnippet')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  )
}

export default NewSnippetModal