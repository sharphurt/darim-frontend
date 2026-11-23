import { useEffect, useRef, useState } from 'react'
import clip from '../assets/clip.svg'
import { cardPhoto, formatGiftPrice, formatPrice, giftBadge, safeLink } from './giftPresentation.js'
import { backgroundFor } from './cardArtwork.js'
import { GiftVariants, VariantDetails } from './GiftVariants.jsx'
import { SplitProgress } from './GiftSplit.jsx'
import { GiftPhoto } from './GiftPhoto.jsx'
import { usePrivateImage } from '../api/usePrivateImage.js'

export function GiftActions({ gift, canSplit, onAction, pending }) {
  const state = gift.participation

  const action = (id, label, primary = false) => (
    <button type="button" className={`gift-action ${primary ? 'gift-action--primary' : ''}`}
      disabled={pending} onClick={() => onAction(gift, id)}>
      {label}
    </button>
  )

  if (state?.mode === 'split' && state.isMine) return action('split-details', 'Участники и детали', true)
  if (!state || state.bought || gift.archived) return null
  if (state.mode === 'free') return <>{canSplit && !gift.unlimited && action('split', 'Распилить')}{action('reserve', 'Хочу подарить!', true)}</>
  if (state.isMine) {
    return <>
      {state.isCoordinator && action('cancel', 'Снять бронь', true)}
    </>
  }
  if (state.mode === 'split' && (state.open ?? state.taken < state.slots)) return action('join', 'Присоединиться!', true)
  return null
}

export function OwnerGiftActions({ gift, pending, onAction }) {
  return <>
    {gift.archived ? <button type="button" className="gift-action gift-action--primary" disabled={pending}
      onClick={() => onAction(gift, 'restore')}>Вернуть</button>
      : <button type="button" className="gift-action" disabled={pending}
        onClick={() => onAction(gift, 'edit')}>Редактировать</button>}
    {!gift.archived && !gift.fromOhmywishes && <button type="button" className="gift-action gift-action--primary" disabled={pending}
      onClick={() => onAction(gift, 'archive')}>Исполнено</button>}
  </>
}

export function GiftBackContent({ gift, own, canSplit, pending, onAction, onCommentClick, modal = false }) {
  const { title, comment, url } = gift.details
  const formattedPrice = formatGiftPrice(gift)
  const link = safeLink(url)
  const Heading = modal ? 'h2' : 'h3'
  const canDelete = own && !gift.fromOhmywishes
  return <>
    {modal && <GiftPhoto gift={gift} className="gift-details__photo" />}
    <header>
      <Heading id={modal ? 'dialog-title' : undefined} className={canDelete ? 'gift-title--deletable' : undefined}>{title}</Heading>
      {canDelete && <button type="button" className="gift-delete" aria-label="Удалить желание"
        title="Удалить желание" aria-haspopup="dialog" disabled={pending} onClick={() => onAction(gift, 'delete-gift')}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6" />
        </svg>
      </button>}
      <div className="gift-card__meta">
        {formattedPrice && <p>{formattedPrice}</p>}
        {link && <a href={link} target="_blank" rel="noreferrer">
          Где купить <span className="gift-card__shop-arrow" aria-hidden="true" />
        </a>}
      </div>
    </header>
    {(gift.participation?.mode === 'external' ||
      gift.participation?.mode === 'split' && gift.participation.bought) && <p>{giftBadge(gift)}</p>}
    <div className={modal ? undefined : 'gift-card__body'}>
      {comment && <p className="gift-card__comment" tabIndex={modal ? undefined : 0} onClick={onCommentClick}>{comment}</p>}
    </div>
    {gift.selectedVariant && <VariantDetails variant={gift.selectedVariant} selected />}
    {modal && (own || !gift.selectedVariant) && <GiftVariants gift={gift} />}
    {own && !modal && <div className="gift-card__actions">
      <OwnerGiftActions gift={gift} pending={pending} onAction={onAction} />
    </div>}
    {!own && !modal && <div className="gift-card__actions">
      <GiftActions gift={gift} canSplit={canSplit} pending={pending} onAction={onAction} />
    </div>}
  </>
}

export function GiftCard({ gift, viewerId, openDetails, canSplit, onAction, pending, artwork }) {
  const [flipped, setFlipped] = useState(false)
  const [closing, setClosing] = useState(false)
  const [controlPressed, setControlPressed] = useState(false)
  const [failedPhoto, setFailedPhoto] = useState(null)
  const back = useRef(null)
  const cleanUpPress = useRef(null)
  const background = backgroundFor(gift.id, artwork)
  const photo = usePrivateImage(cardPhoto(gift))
  const backgroundImage = usePrivateImage(background.image)
  const overlayImage = usePrivateImage(background.overlay)
  const showPhoto = photo && photo !== failedPhoto
  const price = formatGiftPrice(gift)
  const split = gift.participation?.mode === 'split' ? gift.participation : null
  const badge = giftBadge(gift)
  const title = gift.details.title
  const own = gift.owner.id === viewerId
  const backActive = flipped || closing || controlPressed
  const returnLabel = `Показать лицевую сторону: ${title}`
  const activate = () => {
    if (openDetails) onAction(gift, 'gift-details')
    else {
      setClosing(flipped)
      setFlipped(!flipped)
    }
  }

  function activateFromComment(event) {
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && selection.containsNode(event.currentTarget, true)) return
    activate()
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
    <li className="gift-slot" id={`wishlist-gift-${gift.id}`} tabIndex={-1}>
      <div className="gift-pendulum" data-pendulum>
        <div className="gift-handle" aria-hidden="true"><img src={clip} width="26" height="19" alt="" /></div>
        <div className="gift-perspective">
          <article className="gift-card" data-tilt data-flipped={flipped} data-back-active={backActive}>
            <button type="button" className="gift-card__turn" aria-pressed={openDetails ? undefined : flipped}
              aria-haspopup={openDetails ? 'dialog' : undefined}
              aria-label={flipped && !openDetails ? returnLabel : `Подробнее: ${title}`}
              onClick={activate} />
            <div className="gift-card__inner">
              <div className={`gift-card__face gift-card__front ${showPhoto ? '' : 'gift-card__front--text'}`}
                data-tone={background.tone} data-has-overlay={Boolean(background.overlay)}
                inert={flipped}
                style={{
                  '--gift-background': backgroundImage ? `url("${backgroundImage}")` : 'none',
                  '--gift-overlay': overlayImage ? `url("${overlayImage}")` : 'none',
                }}>
                {showPhoto && <img className="gift-card__photo" src={photo} alt="" loading="lazy" referrerPolicy="no-referrer"
                  onError={() => setFailedPhoto(photo)} />}
                <div className="gift-card__summary">
                  <h3>{title}</h3>
                  {own && gift.fromOhmywishes && <span className="gift-card__source">Из Ohmywishes</span>}
                  {price && <p>{price}</p>}
                </div>
                {split && <SplitProgress state={split}
                  share={gift.selectedVariant?.price != null && split.taken > 0
                    ? formatPrice(gift.selectedVariant.price / split.taken) : ''} />}
                {!split && badge && <p className="gift-card__badge">{badge}</p>}
              </div>
              <div className="gift-card__face gift-card__back" inert={!backActive}
                onPointerDown={captureControlPress} ref={back}>
                <GiftBackContent gift={gift} own={own} canSplit={canSplit} pending={pending}
                  onAction={onAction} onCommentClick={activateFromComment} />
              </div>
            </div>
          </article>
        </div>
      </div>
    </li>
  )
}
