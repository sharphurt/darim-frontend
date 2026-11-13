import { useState } from 'react'
import { cardPhoto } from './giftPresentation.js'

export function GiftPhoto({ gift, className, thumbnail = false }) {
  const [failedSource, setFailedSource] = useState(null)
  const src = cardPhoto(gift)
  if (!src || src === failedSource) return null

  return <img className={className} src={src} alt={thumbnail ? '' : gift.details.title}
    loading={thumbnail ? 'lazy' : 'eager'} decoding="async" referrerPolicy="no-referrer"
    onError={() => setFailedSource(src)} />
}
