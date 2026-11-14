import { useEffect, useState } from 'react'
import { miniToken } from './miniSession.js'

export function usePrivateImage(source, shareToken) {
  const [loaded, setLoaded] = useState(null)
  const token = shareToken ?? miniToken()
  const privateSource = source?.startsWith('/api/') && token
  useEffect(() => {
    if (!privateSource) return
    const controller = new AbortController()
    let objectUrl
    fetch(source, { signal: controller.signal, credentials: 'omit',
      headers: { Authorization: `${shareToken ? 'Wishlist' : 'Bearer'} ${token}` },
    }).then(async response => {
      if (!response.ok) throw new Error('Изображение недоступно')
      const blob = await response.blob()
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setLoaded({ source, token, objectUrl })
    }).catch(() => { /* The title and other gift details remain available. */ })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [source, token, privateSource, shareToken])
  return privateSource ? loaded?.source === source && loaded.token === token ? loaded.objectUrl : undefined : source
}
