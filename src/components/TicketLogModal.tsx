import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { useStore } from '../store/useStore'
import { TicketLog } from '../types'
import { backdropVariants, modalVariants } from '../utils/motionVariants'
import { formatDistanceToNow } from 'date-fns'
import { ptBR, enUS } from 'date-fns/locale'

interface TicketLogModalProps {
  isOpen: boolean
  onClose: () => void
}

type View = 'list' | 'create' | 'edit'

interface FormState {
  ticketNumber: string
  problemDescription: string
  ticketUrl: string
  snippetId: string
}

const emptyForm: FormState = {
  ticketNumber: '',
  problemDescription: '',
  ticketUrl: '',
  snippetId: ''
}

const TicketLogModal: React.FC<TicketLogModalProps> = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation()
  const ticketLogs = useStore(state => state.ticketLogs)
  const snippets = useStore(state => state.snippets)
  const addTicketLog = useStore(state => state.addTicketLog)
  const updateTicketLog = useStore(state => state.updateTicketLog)
  const deleteTicketLog = useStore(state => state.deleteTicketLog)

  const [view, setView] = useState<View>('list')
  const [filterQuery, setFilterQuery] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Partial<FormState>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const ticketNumberRef = useRef<HTMLInputElement>(null)
  const filterRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view !== 'list') {
          setView('list')
          setErrors({})
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, view, onClose])

  useEffect(() => {
    if (isOpen && view === 'list') {
      setTimeout(() => filterRef.current?.focus(), 50)
    }
    if (isOpen && (view === 'create' || view === 'edit')) {
      setTimeout(() => ticketNumberRef.current?.focus(), 50)
    }
  }, [isOpen, view])

  const filtered = ticketLogs.filter(log => {
    if (!filterQuery.trim()) return true
    const q = filterQuery.toLowerCase()
    return (
      log.ticketNumber.toLowerCase().includes(q) ||
      log.problemDescription.toLowerCase().includes(q)
    )
  })

  const handleOpenCreate = () => {
    setForm(emptyForm)
    setErrors({})
    setEditingId(null)
    setView('create')
  }

  const handleOpenEdit = (log: TicketLog) => {
    setForm({
      ticketNumber: log.ticketNumber,
      problemDescription: log.problemDescription,
      ticketUrl: log.ticketUrl ?? '',
      snippetId: log.snippetId ?? ''
    })
    setErrors({})
    setEditingId(log.id)
    setView('edit')
  }

  const validate = (): boolean => {
    const newErrors: Partial<FormState> = {}
    if (!form.ticketNumber.trim()) newErrors.ticketNumber = t('ticketLogModal.errorTicketNumberRequired')
    if (!form.problemDescription.trim()) newErrors.problemDescription = t('ticketLogModal.errorProblemDescriptionRequired')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    const linkedSnippet = snippets.find(s => s.id === form.snippetId)
    const now = new Date().toISOString()

    if (view === 'create') {
      const newLog: TicketLog = {
        id: crypto.randomUUID(),
        ticketNumber: form.ticketNumber.trim(),
        problemDescription: form.problemDescription.trim(),
        ticketUrl: form.ticketUrl.trim() || undefined,
        snippetId: form.snippetId || undefined,
        snippetTitle: linkedSnippet?.title,
        createdAt: now,
        updatedAt: now
      }
      addTicketLog(newLog)
    } else if (view === 'edit' && editingId) {
      updateTicketLog(editingId, {
        ticketNumber: form.ticketNumber.trim(),
        problemDescription: form.problemDescription.trim(),
        ticketUrl: form.ticketUrl.trim() || undefined,
        snippetId: form.snippetId || undefined,
        snippetTitle: linkedSnippet?.title
      })
    }

    setView('list')
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    deleteTicketLog(id)
    setConfirmDeleteId(null)
  }

  const handleOpenUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button
                onClick={() => { setView('list'); setErrors({}) }}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {view === 'list' ? t('ticketLogModal.title') : view === 'create' ? t('ticketLogModal.newRecord') : t('ticketLogModal.editRecord')}
              </h2>
              {view === 'list' && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('ticketLogModal.recordsCount', { count: ticketLogs.length })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === 'list' && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                {t('ticketLogModal.newRecord')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              className="p-6 flex flex-col gap-4"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              {/* Filter */}
              <input
                ref={filterRef}
                type="text"
                placeholder={t('ticketLogModal.filterPlaceholder')}
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />

              {/* List */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <svg className="h-12 w-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium">
                    {ticketLogs.length === 0 ? t('ticketLogModal.noRecordsYet') : t('ticketLogModal.noFilterResults')}
                  </p>
                  {ticketLogs.length === 0 && (
                    <p className="text-xs mt-1 text-center max-w-xs">
                      {t('ticketLogModal.noRecordsHint')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filtered.map(log => (
                    <div
                      key={log.id}
                      className="group flex items-start gap-4 px-4 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                    >
                      {/* Ticket badge */}
                      <span className="shrink-0 mt-0.5 inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-mono font-semibold">
                        {log.ticketNumber}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug">
                          {log.problemDescription}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {log.snippetTitle && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {t('ticketLogModal.snippetLabel')} <span className="font-medium text-gray-700 dark:text-gray-300">{log.snippetTitle}</span>
                            </span>
                          )}
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: i18n.language.startsWith('pt') ? ptBR : enUS })}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {log.ticketUrl && (
                          <button
                            onClick={() => handleOpenUrl(log.ticketUrl!)}
                            title={t('ticketLogModal.openTicket')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(log)}
                          title={t('ticketLogModal.edit')}
                          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        {confirmDeleteId === log.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                              {t('ticketLogModal.confirm')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              {t('ticketLogModal.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(log.id)}
                            title={t('ticketLogModal.delete')}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {(view === 'create' || view === 'edit') && (
            <motion.div
              key={view}
              className="p-6 flex flex-col gap-5"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              {/* Ticket Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('ticketLogModal.ticketNumberLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  ref={ticketNumberRef}
                  type="text"
                  placeholder={t('ticketLogModal.ticketNumberPlaceholder')}
                  value={form.ticketNumber}
                  onChange={e => setForm(f => ({ ...f, ticketNumber: e.target.value }))}
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.ticketNumber ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                />
                {errors.ticketNumber && (
                  <p className="mt-1 text-xs text-red-500">{errors.ticketNumber}</p>
                )}
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('ticketLogModal.ticketUrlLabel')} <span className="text-gray-400 font-normal">{t('ticketLogModal.optional')}</span>
                </label>
                <input
                  type="url"
                  placeholder={t('ticketLogModal.ticketUrlPlaceholder')}
                  value={form.ticketUrl}
                  onChange={e => setForm(f => ({ ...f, ticketUrl: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('ticketLogModal.problemDescriptionLabel')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder={t('ticketLogModal.problemDescriptionPlaceholder')}
                  value={form.problemDescription}
                  onChange={e => setForm(f => ({ ...f, problemDescription: e.target.value }))}
                  rows={4}
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${errors.problemDescription ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'}`}
                />
                {errors.problemDescription && (
                  <p className="mt-1 text-xs text-red-500">{errors.problemDescription}</p>
                )}
              </div>

              {/* Snippet Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('ticketLogModal.linkedSnippetLabel')} <span className="text-gray-400 font-normal">{t('ticketLogModal.optional')}</span>
                </label>
                <select
                  value={form.snippetId}
                  onChange={e => setForm(f => ({ ...f, snippetId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">{t('ticketLogModal.noLinkedSnippet')}</option>
                  {snippets.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Footer for form views */}
        {(view === 'create' || view === 'edit') && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <button
              onClick={() => { setView('list'); setErrors({}) }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              {t('ticketLogModal.cancel')}
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {view === 'create' ? t('ticketLogModal.createRecord') : t('ticketLogModal.saveChanges')}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default TicketLogModal
