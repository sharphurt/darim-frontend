import { useState } from 'react'
import arrow from '../assets/shop-arrow.svg'
import clip from '../assets/clip.svg'
import { backgroundFor, cardPhoto, formatPrice, giftBadge, safeLink } from './giftPresentation.js'
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

export function GiftCard({ gift, viewerId, canSplit, onAction, pending }) {
  const [flipped, setFlipped] = useState(false)
  const [failedPhoto, setFailedPhoto] = useState(null)
  const photo = cardPhoto(gift)
  const showPhoto = photo && photo !== failedPhoto
  const price = formatPrice(gift.details.price)
  const split = gift.participation?.mode === 'split' ? gift.participation : null
  const badge = !split && giftBadge(gift)
  const link = safeLink(gift.details.url)
  const title = gift.details.title
  const own = gift.owner.id === viewerId
  const editable = own && !gift.archived
  const activate = () => {
    if (editable) onAction(gift, 'edit')
    else setFlipped(value => !value)
  }

  return (
    <li className="gift-slot">
      <div className="gift-pendulum" data-pendulum>
        <div className="gift-handle" aria-hidden="true"><img src={clip} width="26" height="19" alt="" /></div>
        <div className="gift-perspective">
          <article className="gift-card" data-tilt data-flipped={flipped}
            onClick={event => { if (!event.target.closest('button, a')) activate() }}>
            <button type="button" className="gift-card__turn" aria-pressed={editable ? undefined : flipped}
              aria-haspopup={editable ? 'dialog' : undefined}
              aria-label={editable ? `Редактировать: ${title}` : flipped ? `Показать лицевую сторону: ${title}` : `Подробнее: ${title}`}
              onClick={activate} />
            <div className="gift-card__inner">
              <div className={`gift-card__face gift-card__front ${showPhoto ? '' : 'gift-card__front--text'}`}
                data-split={Boolean(split)} aria-hidden={flipped}>
                <img className="gift-card__pattern" src={backgroundFor(gift.id)} alt="" width="320" height="450" />
                {showPhoto && <img className="gift-card__photo" src={photo} alt="" loading="lazy" referrerPolicy="no-referrer"
                  onError={() => setFailedPhoto(photo)} />}
                <div className="gift-card__summary">
                  <h3>{title}</h3>
                  {price && <p>{price}</p>}
                </div>
                {split && <SplitProgress state={split} viewerId={viewerId} />}
                {badge && <p className="gift-card__badge">{badge}</p>}
              </div>
              <div className="gift-card__face gift-card__back" data-split={Boolean(split)} inert={!flipped}>
                <header>
                  <h3>{title}</h3>
                  <div className="gift-card__meta">
                    {price && <p>{price}</p>}
                    {link && <a href={link} target="_blank" rel="noreferrer">Где купить <img src={arrow} width="12" height="12" alt="" /></a>}
                  </div>
                </header>
                {split && (gift.archived || split.bought) && <p>{giftBadge(gift)}</p>}
                {gift.details.comment && <p className="gift-card__comment">{gift.details.comment}</p>}
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
