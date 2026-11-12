import { useEffect, useState } from 'react'
import { createDarimApi } from '../api/darim.js'

export function useCardArtwork(userId) {
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    const { signal } = controller
    createDarimApi().cardArtwork(signal).then(artwork => {
      if (!signal.aborted) setResult({ userId, artwork })
    }).catch(() => {
      // Built-in assets still work with older servers or during a temporary failure.
    })
    return () => controller.abort()
  }, [userId])

  function updateImages(update) {
    setResult(previous => {
      if (previous?.userId !== userId || !Array.isArray(previous?.artwork?.images)) return previous
      return { userId, artwork: { ...previous.artwork, images: update(previous.artwork.images) } }
    })
  }

  return [result?.userId === userId ? result?.artwork : undefined, updateImages]
}
