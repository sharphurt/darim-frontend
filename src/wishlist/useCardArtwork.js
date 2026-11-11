import { useEffect, useState } from 'react'

export function useCardArtwork(api, enabled) {
  const [result, setResult] = useState(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    let loading = false

    async function refresh() {
      if (loading || document.hidden) return
      loading = true
      try {
        const artwork = await api.cardArtwork(controller.signal)
        if (!controller.signal.aborted) setResult({ api, artwork })
      } catch {
        // Built-in assets still work with older servers or during a temporary failure.
      } finally {
        loading = false
      }
    }

    refresh()
    const timer = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [api, enabled, revision])

  return [enabled && result?.api === api ? result.artwork : undefined, () => setRevision(value => value + 1)]
}
