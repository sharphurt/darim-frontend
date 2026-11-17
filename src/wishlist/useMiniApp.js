import { useEffect } from 'react'
import { miniApp } from '../api/miniSession.js'

export function useMiniApp(canGoBack, onBack) {
  useEffect(() => {
    const app = miniApp()
    if (!app?.initData) return
    const updateInsets = () => {
      const safe = app.safeAreaInset ?? {}
      const content = app.contentSafeAreaInset ?? {}
      for (const side of ['top', 'bottom', 'left', 'right']) {
        document.documentElement.style.setProperty(`--darim-safe-${side}`, `${(safe[side] ?? 0) + (content[side] ?? 0)}px`)
      }
    }
    updateInsets()
    app.onEvent?.('safeAreaChanged', updateInsets)
    app.onEvent?.('contentSafeAreaChanged', updateInsets)
    return () => {
      app.offEvent?.('safeAreaChanged', updateInsets)
      app.offEvent?.('contentSafeAreaChanged', updateInsets)
    }
  }, [])
  useEffect(() => {
    const back = miniApp()?.BackButton
    if (!back) return
    if (canGoBack) back.show()
    else back.hide()
    back.onClick(onBack)
    return () => { back.offClick(onBack); back.hide() }
  }, [canGoBack, onBack])
}
