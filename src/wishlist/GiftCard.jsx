import { useState } from 'react'
import arrow from '../assets/shop-arrow.svg'
import clip from '../assets/clip.svg'
import { backgroundFor, cardPhoto, formatPrice, giftBadge, safeLink } from './giftPresentation.js'

function GiftActions({ gift, own, canSplit, onAction, pending }) {
  const state = gift.participation
  if (gift.archived) return null

  const action = (id, label, primary = false) => (
    <button type="button" className={`gift-action ${primary ? 'gift-action--primary' : ''}`}
      disabled={pending} onClick={() => onAction(gift, id)}>
      {label}
    </button>
  )

  if (own) return <>{!gift.fromOhmywishes && action('edit', 'Редактировать', true)}{action('archive', 'В архив')}</>
  if (!state || state.bought) return null
  if (state.mode === 'free') return <>{action('reserve', 'Хочу подарить!', true)}{canSplit && !gift.unlimited && action('split', 'Распилить')}</>
  if (state.isMine) {
    return <>
      {state.isCoordinator && (state.mode !== 'split' || state.taken === state.slots) && action('buy', 'Отметить купленным', true)}
      {state.isCoordinator ? action('cancel', 'Снять бронь') : action('leave', 'Выйти из распила')}
    </>
  }
  if (state.mode === 'split') {
    return <>
      <p className="gift-card__split">Участников распила: {state.taken} из {state.slots}</p>
      {state.taken < state.slots && action('join', 'Присоединиться!', true)}
    </>
  }
  return null
}

export function GiftCard({ gift, own, canSplit, onAction, pending }) {
  const [flipped, setFlipped] = useState(false)
  const [failedPhoto, setFailedPhoto] = useState(null)
  const photo = cardPhoto(gift)
  const showPhoto = photo && photo !== failedPhoto
  const price = formatPrice(gift.details.price)
  const badge = giftBadge(gift)
  const link = safeLink(gift.details.url)
  const title = gift.details.title
  const toggle = () => setFlipped(value => !value)

  return (
    <li className="gift-slot">
      <div className="gift-pendulum" data-pendulum>
        <div className="gift-handle" aria-hidden="true"><img src={clip} width="26" height="19" alt="" /></div>
        <div className="gift-perspective">
          <article className="gift-card" data-tilt data-flipped={flipped}
            onClick={event => { if (!event.target.closest('button, a')) toggle() }}>
            <button type="button" className="gift-card__turn" aria-pressed={flipped}
              aria-label={flipped ? `Показать лицевую сторону: ${title}` : `Подробнее: ${title}`}
              onClick={toggle} />
            <div className="gift-card__inner">
              <div className={`gift-card__face gift-card__front ${showPhoto ? '' : 'gift-card__front--text'}`} aria-hidden={flipped}>
                <img className="gift-card__pattern" src={backgroundFor(gift.id)} alt="" width="320" height="450" />
                {showPhoto && <img className="gift-card__photo" src={photo} alt="" loading="lazy" referrerPolicy="no-referrer"
                  onError={() => setFailedPhoto(photo)} />}
                <div className="gift-card__summary">
                  <h3>{title}</h3>
                  {price && <p>{price}</p>}
                </div>
                {badge && <p className="gift-card__badge">{badge}</p>}
              </div>
              <div className="gift-card__face gift-card__back" data-split={gift.participation?.mode === 'split'} inert={!flipped}>
                <header>
                  <h3>{title}</h3>
                  <div className="gift-card__meta">
                    {price && <p>{price}</p>}
                    {link && <a href={link} target="_blank" rel="noreferrer">Где купить <img src={arrow} width="12" height="12" alt="" /></a>}
                  </div>
                </header>
                {gift.details.comment && <p className="gift-card__comment">{gift.details.comment}</p>}
                <div className="gift-card__actions">
                  <GiftActions gift={gift} own={own} canSplit={canSplit} pending={pending} onAction={onAction} />
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </li>
  )
}
