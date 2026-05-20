import React, { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [history, setHistory]       = useState([])   // past analysis results
  const [settings, setSettings]     = useState({
    autoPlay:          true,
    beepAlert:         true,
    showDepthOverlay:  false,
    frameSkip:         2,
    confidenceMin:     0.45,
    language:          'vi',
    dangerThreshold:   'MEDIUM',  // minimum level to show warning
  })
  const [activePage, setActivePage] = useState('main') // main | history | settings | api

  const addToHistory = useCallback((result, filename, fileType) => {
    setHistory(prev => [
      {
        id:        Date.now(),
        timestamp: new Date().toISOString(),
        filename,
        fileType,
        level:     result?.summary?.overall_level || 'LOW',
        score:     result?.objects?.[0]?.danger_score || 0,
        objects:   result?.objects?.length || 0,
        summary:   result?.summary?.primary_warning || '',
        result,
      },
      ...prev.slice(0, 49),  // keep last 50
    ])
  }, [])

  const clearHistory = useCallback(() => setHistory([]), [])

  const updateSettings = useCallback((patch) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  return (
    <AppContext.Provider value={{
      history, addToHistory, clearHistory,
      settings, updateSettings,
      activePage, setActivePage,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
