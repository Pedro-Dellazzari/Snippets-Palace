export type AppLanguage = 'en' | 'pt-BR'

const strings = {
  en: {
    appName: 'Snippet Palace',
    untitled: '(untitled)',
    hotSnippets: '⚡ Hot Snippets',
    noHotSnippets: '   (no pinned snippets)',
    copied: 'Copied!',
    openApp: 'Open Snippet Palace',
    quit: 'Quit',
    selectFolderTitle: 'Select folder to save snippets',
    trayBalloonTitle: 'Snippet Palace is still running in the tray',
    trayBalloonContent: 'Click the icon to open it again.'
  },
  'pt-BR': {
    appName: 'Snippet Palace',
    untitled: '(sem título)',
    hotSnippets: '⚡ Hot Snippets',
    noHotSnippets: '   (nenhum snippet marcado)',
    copied: 'Copiado!',
    openApp: 'Abrir Snippet Palace',
    quit: 'Sair',
    selectFolderTitle: 'Selecionar pasta para salvar snippets',
    trayBalloonTitle: 'Snippet Palace continua na bandeja',
    trayBalloonContent: 'Clique no ícone para abrir novamente.'
  }
}

export function getStrings(language: AppLanguage) {
  return strings[language] ?? strings.en
}
