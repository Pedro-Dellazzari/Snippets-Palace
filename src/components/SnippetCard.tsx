import React, { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { ptBR, enUS } from 'date-fns/locale'
import { HeartIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartIconSolid, BoltIcon as BoltIconSolid } from '@heroicons/react/24/solid'
import { getLanguageColor, getTagColor } from '../utils/colors'
import Tooltip from './Tooltip'
import { Snippet, Folder, ProjectItem } from '../types'

interface SnippetCardProps {
  snippet: Snippet
  selected: boolean
  copied: boolean
  exiting: boolean
  clicked: boolean
  folder?: Folder
  parentProject?: ProjectItem
  onSelect: (s: Snippet) => void
  onCopy: (s: Snippet) => void
  onContextMenu: (e: React.MouseEvent, s: Snippet) => void
  onEdit: (s: Snippet) => void
  onToggleFavorite: (id: string) => void
  onDelete: (s: Snippet) => void
}

function formatDate(dateString: string, language: string, invalidDateLabel: string) {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language.startsWith('pt') ? ptBR : enUS
    })
  } catch {
    return invalidDateLabel
  }
}

const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  selected,
  copied,
  exiting,
  clicked,
  folder,
  parentProject,
  onSelect,
  onCopy,
  onContextMenu,
  onEdit,
  onToggleFavorite,
  onDelete
}) => {
  const { t, i18n } = useTranslation()
  const formattedDate = useMemo(
    () => formatDate(snippet.updatedAt, i18n.language, t('common.invalidDate')),
    [snippet.updatedAt, i18n.language, t]
  )
  const languageColor = useMemo(() => getLanguageColor(snippet.language), [snippet.language])
  const visibleTags = useMemo(() => snippet.tags.slice(0, 2), [snippet.tags])
  const tagColors = useMemo(
    () => visibleTags.map(t => getTagColor(t)),
    [visibleTags]
  )

  const transform = copied
    ? 'scale(1.03) translateZ(0)'
    : clicked
      ? 'scale(0.98) translateZ(0)'
      : 'translateZ(0)'

  return (
    <div
      onClick={() => onSelect(snippet)}
      onDoubleClick={() => onCopy(snippet)}
      onContextMenu={(e) => onContextMenu(e, snippet)}
      className={clsx(
        'px-4 py-2.5 cursor-pointer group relative snippet-card',
        'transition-[transform,box-shadow,background-color,border-color,opacity] duration-200 ease-out will-change-transform',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:scale-[1.01] hover:shadow-sm',
        selected && 'bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500',
        copied && 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 scale-[1.03] shadow-lg shadow-green-100/50 dark:shadow-green-900/20',
        clicked && 'scale-[0.98] click-pulse'
      )}
      style={{ transform }}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate pr-2 flex items-center gap-1.5 min-w-0">
          {snippet.isHot && (
            <Tooltip content={t('snippetCard.hotSnippetTooltip')}>
              <BoltIconSolid className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
            </Tooltip>
          )}
          <span className="truncate">{snippet.title}</span>
        </h3>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Tooltip content={t('snippetCard.editSnippet')}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(snippet) }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors duration-150 text-gray-400 hover:text-blue-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </button>
          </Tooltip>

          <Tooltip content={snippet.favorite ? t('snippetCard.removeFromFavorites') : t('snippetCard.addToFavorites')}>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(snippet.id) }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors duration-150 text-gray-400 hover:text-red-500"
            >
              {snippet.favorite
                ? <HeartIconSolid className="h-3.5 w-3.5 text-red-500" />
                : <HeartIcon className="h-3.5 w-3.5" />}
            </button>
          </Tooltip>

          <Tooltip content={t('snippetCard.moveToFolder')}>
            <button
              onClick={(e) => { e.stopPropagation(); onContextMenu(e, snippet) }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-md transition-colors duration-150 text-gray-400 hover:text-green-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </button>
          </Tooltip>

          <Tooltip content={t('snippetCard.deleteSnippet')}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(snippet) }}
              onDoubleClick={(e) => e.stopPropagation()}
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors duration-150 text-gray-400 hover:text-red-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {snippet.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
          {snippet.description}
        </p>
      )}

      {visibleTags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {visibleTags.map((tag, i) => {
            const c = tagColors[i]
            return (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full"
                style={{ backgroundColor: `${c}15`, color: c, border: `1px solid ${c}30` }}
              >
                {tag}
              </span>
            )
          })}
          {snippet.tags.length > 2 && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              +{snippet.tags.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: languageColor }} />
            <span className="capitalize font-medium text-gray-600 dark:text-gray-400">{snippet.language}</span>
          </div>

          {snippet.folderId && folder && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span className="text-gray-500 dark:text-gray-500 truncate max-w-20">
                  {parentProject ? `${parentProject.name}/${folder.name}` : folder.name}
                </span>
              </div>
            </>
          )}

          {snippet.category && snippet.category !== snippet.language && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-gray-500 dark:text-gray-500 truncate max-w-16">{snippet.category}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          {snippet.usage_count > 0 && (
            <>
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                <span className="font-medium">{snippet.usage_count}</span>
              </div>
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}

          {snippet.favorite && (
            <>
              <HeartIconSolid className="h-3 w-3 text-red-500" />
              <span className="text-gray-300 dark:text-gray-600">•</span>
            </>
          )}

          <span>{formattedDate}</span>
        </div>
      </div>

      {copied && (
        <div
          className={clsx(
            'absolute inset-0 flex items-center justify-center bg-white/96 dark:bg-gray-800/96 backdrop-blur-lg rounded-lg border border-green-200/40 dark:border-green-700/40',
            exiting ? 'copy-overlay-exit' : 'copy-overlay-enter'
          )}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
        >
          <div className="flex items-center gap-3 text-green-700 dark:text-green-300 font-semibold text-lg">
            <div className="relative copy-icon-zoom" style={{ willChange: 'transform' }}>
              <div className="absolute inset-0 bg-green-500/20 rounded-full copy-icon-ping" style={{ willChange: 'transform, opacity' }} />
              <svg className="h-7 w-7 relative z-10 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" style={{ transform: 'translateZ(0)' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
            <span className="drop-shadow-sm tracking-wide copy-text-slide" style={{ willChange: 'transform, opacity' }}>
              {t('snippetCard.copied')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(SnippetCard)
