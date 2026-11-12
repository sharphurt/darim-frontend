import { useEffect, useRef, useState } from 'react'
import clip from '../assets/clip.svg'
import { cardPhoto, formatPrice, giftBadge, safeLink } from './giftPresentation.js'
import { backgroundFor } from './cardArtwork.js'
import { SplitProgress } from './GiftSplit.jsx'

function GiftActions({ gift, canSplit, onAction, pending }) {
  const state = gift.participation

  const action = (id, label, primary = false) => (
    <button type="button" className={`gift-action ${primary ? 'gift-action--primary' : ''}`}
      disabled={pending} onClick={() => onAction(gift, id)}>
      {label}
    </button>
  )

  if (state?.mode === 'split' && state.isMine) return action('split-details', 'Участники и детали', true)
  if (!state || state.bought || gift.archived) return null
  if (state.mode === 'free') return <>{action('reserve', 'Хочу подарить!', true)}{canSplit && !gift.unlimited && action('split', 'Распилить')}</>
  if (state.isMine) {
    return <>
      {state.isCoordinator && action('buy', 'Отметить купленным', true)}
      {state.isCoordinator && action('cancel', 'Снять бронь')}
    </>
  }
  if (state.mode === 'split' && state.taken < state.slots) return action('join', 'Присоединиться!', true)
  return null
}

export function GiftCard({ gift, viewerId, canSplit, onAction, pending, artwork }) {
  const [flipped, setFlipped] = useState(false)
  const [closing, setClosing] = useState(false)
  const [controlPressed, setControlPressed] = useState(false)
  const [failedPhoto, setFailedPhoto] = useState(null)
  const back = useRef(null)
  const cleanUpPress = useRef(null)
  const background = backgroundFor(gift.id, artwork)
  const photo = cardPhoto(gift)
  const showPhoto = photo && photo !== failedPhoto
  const price = formatPrice(gift.details.price)
  const split = gift.participation?.mode === 'split' ? gift.participation : null
  const badge = !split && giftBadge(gift)
  const link = safeLink(gift.details.url)
  const title = gift.details.title
  const own = gift.owner.id === viewerId
  const editable = own && !gift.archived
  const backActive = flipped || closing || controlPressed
  const returnLabel = `Показать лицевую сторону: ${title}`
  const activate = () => {
    if (editable) onAction(gift, 'edit')
    else {
      setClosing(flipped)
      setFlipped(!flipped)
    }
  }

  useEffect(() => {
    if (!closing) return
    const [animation] = back.current.getAnimations()
    let current = true
    const finish = () => { if (current) setClosing(false) }
    if (animation) animation.finished.then(finish, finish)
    else finish()
    return () => { current = false }
  }, [closing])

  useEffect(() => () => cleanUpPress.current?.(), [])

  function captureControlPress(event) {
    const control = event.target.closest('button:enabled, a[href]')
    if (!control || !event.isPrimary || event.button > 1 || !back.current.getAnimations().some(
      animation => animation.transitionProperty === 'transform',
    )) return

    cleanUpPress.current?.()
    const { pointerId, clientX: startX, clientY: startY } = event
    const controller = new AbortController()
    const options = { capture: true, signal: controller.signal }
    let frame = 0

    control.setPointerCapture(pointerId)
    setControlPressed(true)

    function cleanup() {
      controller.abort()
      cancelAnimationFrame(frame)
      if (control.hasPointerCapture(pointerId)) control.releasePointerCapture(pointerId)
    }
    function finish() {
      controller.abort()
      // Keep the back interactive until the browser dispatches the native click.
      frame = requestAnimationFrame(() => {
        cleanUpPress.current = null
        setControlPressed(false)
      })
    }
    function release(event) {
      if (event.pointerId === pointerId) finish()
    }
    function cancel() {
      cleanup()
      finish()
    }
    function cancelDrag(event) {
      if (event.pointerId !== pointerId || event.pointerType === 'touch') return
      const { clientX, clientY } = event
      if (Math.hypot(clientX - startX, clientY - startY) > 8 &&
        !control.contains(document.elementFromPoint(clientX, clientY))) cancel()
    }

    cleanUpPress.current = cleanup
    window.addEventListener('pointerup', release, options)
    window.addEventListener('pointercancel', release, options)
    window.addEventListener('pointermove', cancelDrag, options)
    window.addEventListener('blur', cancel, { signal: controller.signal })
  }

  return (
    <li className="gift-slot">
      <div className="gift-pendulum" data-pendulum>
        <div className="gift-handle" aria-hidden="true"><img src={clip} width="26" height="19" alt="" /></div>
        <div className="gift-perspective">
          <article className="gift-card" data-tilt data-flipped={flipped} data-back-active={backActive}>
            <button type="button" className="gift-card__turn" aria-pressed={editable ? undefined : flipped}
              aria-haspopup={editable ? 'dialog' : undefined}
              aria-label={editable ? `Редактировать: ${title}` : flipped ? returnLabel : `Подробнее: ${title}`}
              onClick={activate} />
            <div className="gift-card__inner">
              <div className={`gift-card__face gift-card__front ${showPhoto ? '' : 'gift-card__front--text'}`}
                data-tone={background.tone} data-has-overlay={Boolean(background.overlay)}
                data-split={Boolean(split)} aria-hidden={flipped}
                style={{
                  '--gift-background': background.image ? `url("${background.image}")` : 'none',
                  '--gift-overlay': background.overlay ? `url("${background.overlay}")` : 'none',
                }}>
                {showPhoto && <img className="gift-card__photo" src={photo} alt="" loading="lazy" referrerPolicy="no-referrer"
                  onError={() => setFailedPhoto(photo)} />}
                <div className="gift-card__summary">
                  <h3>{title}</h3>
                  {price && <p>{price}</p>}
                </div>
                {split && <SplitProgress state={split} />}
                {badge && <p className="gift-card__badge">{badge}</p>}
              </div>
              <div className="gift-card__face gift-card__back" data-split={Boolean(split)}
                inert={!backActive} onPointerDown={captureControlPress} ref={back}>
                <header>
                  <h3>{title}</h3>
                  <div className="gift-card__meta">
                    {price && <p>{price}</p>}
                    {link && <a href={link} target="_blank" rel="noreferrer">
                      Где купить <span className="gift-card__shop-arrow" aria-hidden="true" />
                    </a>}
                  </div>
                </header>
                {split && (gift.archived || split.bought) && <p>{giftBadge(gift)}</p>}
                {gift.details.comment && <p className="gift-card__comment">{gift.details.comment}</p>}
                <button type="button" className="gift-card__return" tabIndex={-1}
                  aria-label={returnLabel} onClick={activate} />
                <div className="gift-card__actions">
                  {!own && <GiftActions gift={gift} canSplit={canSplit} pending={pending} onAction={onAction} />}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </li>
  )
}
