import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../store/useStore'
import { Folder, ProjectItem } from '../types'
import clsx from 'clsx'

interface FolderProjectModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'folder' | 'project'
  editItem?: Folder | ProjectItem
  parentId?: string
}

const FolderProjectModal: React.FC<FolderProjectModalProps> = ({
  isOpen,
  onClose,
  type,
  editItem,
  parentId
}) => {
  const { t } = useTranslation()
  const { addFolder, updateFolder, addProjectItem, updateProjectItem, folders, projectItems } = useStore()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: parentId || ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setFormData({
          name: editItem.name,
          description: 'description' in editItem ? editItem.description || '' : '',
          parentId: editItem.parentId || ''
        })
      } else {
        setFormData({ 
          name: '', 
          description: '', 
          parentId: parentId || '' 
        })
      }
      setErrors({})
    }
  }, [isOpen, editItem, parentId])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = t('folderProjectModal.errorNameRequired')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      if (editItem) {
        // Edit mode
        if (type === 'folder') {
          updateFolder(editItem.id, { name: formData.name.trim() })
        } else {
          updateProjectItem(editItem.id, { 
            name: formData.name.trim(),
            description: formData.description.trim() || undefined
          })
        }
      } else {
        // Create mode
        if (type === 'folder') {
          addFolder(formData.name.trim(), formData.parentId || undefined)
        } else {
          // Projects are always created at root level (no parentId)
          addProjectItem(formData.name.trim(), formData.description.trim() || undefined, undefined)
        }
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving:', error)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Build hierarchical options for parent selection
  const getParentOptions = () => {
    const options: { id: string; name: string; level: number }[] = [
      { id: '', name: t('common.none'), level: 0 }
    ]

    if (type === 'folder') {
      // Folders can be created inside:
      // 1. Other folders (creating subfolders)
      // 2. Projects (projects can contain folders)
      
      // Add folders as potential parents
      const buildFolderHierarchy = (parentId: string | undefined, level: number) => {
        const children = folders.filter(folder => folder.parentId === parentId)
        children.forEach(folder => {
          // Don't allow selecting the item being edited as its own parent
          if (!editItem || folder.id !== editItem.id) {
            options.push({
              id: folder.id,
              name: `📁 ${folder.name}`,
              level
            })
            buildFolderHierarchy(folder.id, level + 1)
          }
        })
      }
      
      // Add projects as potential parents (projects can contain folders)
      const buildProjectHierarchy = (parentId: string | undefined, level: number) => {
        const children = projectItems.filter(project => project.parentId === parentId)
        children.forEach(project => {
          options.push({
            id: project.id,
            name: `🚀 ${project.name}`,
            level
          })
          buildProjectHierarchy(project.id, level + 1)
        })
      }
      
      buildFolderHierarchy(undefined, 0)
      buildProjectHierarchy(undefined, 0)
    } else {
      // Projects can ONLY be created at root level (no nesting inside folders or other projects)
      // According to the rules: no projects inside folders, no subprojects
      // So projects can only have parentId = undefined (root level)
    }

    return options
  }

  if (!isOpen) return null

  const isProject = type === 'project'
  const title = editItem
    ? (isProject ? t('folderProjectModal.editProject') : t('folderProjectModal.editFolder'))
    : (isProject ? t('folderProjectModal.newProject') : t('folderProjectModal.newFolder'))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {title}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('folderProjectModal.nameLabel')}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors',
                  'dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
                  errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-400'
                )}
                placeholder={isProject ? t('folderProjectModal.namePlaceholderProject') : t('folderProjectModal.namePlaceholderFolder')}
                autoFocus
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* Parent Selection - Only for folders */}
            {type === 'folder' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('folderProjectModal.parentFolderLabel')}
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => handleChange('parentId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:bg-gray-700 dark:text-gray-100"
                >
                  {getParentOptions().map(option => (
                    <option key={option.id} value={option.id}>
                      {'  '.repeat(option.level)}
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isProject && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('folderProjectModal.descriptionLabel')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors dark:bg-gray-700 dark:text-gray-100 resize-none"
                  placeholder={t('folderProjectModal.descriptionPlaceholder')}
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors font-medium"
              >
                {t('folderProjectModal.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {editItem ? t('folderProjectModal.save') : t('folderProjectModal.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FolderProjectModal