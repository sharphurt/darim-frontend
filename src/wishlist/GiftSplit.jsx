import { useState } from 'react'
import { formatPrice, safeLink } from './giftPresentation.js'

export function SplitProgress({ state, share, showOpenStatus = true }) {
  const { taken, slots } = state
  const status = state.open ? (showOpenStatus ? '. Сбор открыт' : '') : '. Сбор завершён'
  return (
    <div className="split-progress">
      <div className="split-progress__labels">
        <p>Участников: {taken}{status}</p>
        {share && <p className="split-progress__share">≈ {share} с человека</p>}
      </div>
      {!state.open && <div className="split-progress__track" aria-hidden="true"
        style={{ '--split-slots': slots }}>
        {Array.from({ length: slots }, (_, index) => {
          const filled = index < taken
          return <span key={index} data-filled={filled} />
        })}
      </div>}
    </div>
  )
}

function ParticipantAvatar({ person }) {
  const [failed, setFailed] = useState(null)
  const url = safeLink(person.avatarUrl)
  return (
    <span className="split-participants__avatar" aria-hidden="true">
      {url?.startsWith('https:') && url !== failed
        ? <img src={url} alt="" width="36" height="36" referrerPolicy="no-referrer" onError={() => setFailed(url)} />
        : person.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function SplitFields({ gift }) {
  return (
    <>
      <p>Разделим «{gift.details.title}» на равные доли. Вы станете координатором, друзья смогут присоединиться.</p>
      <p className="split-hint">Доля пересчитывается по числу участников. Когда все соберутся, завершите сбор. После этого можно отметить покупку.</p>
    </>
  )
}

export function SplitDetails({ gift }) {
  const state = gift.participation
  const participants = state.participants ?? []
  const price = gift.details.price
  const share = price != null && state.taken > 0 ? formatPrice(price / state.taken) : ''
  const status = gift.archived ? 'Желание в архиве.' : state.bought ? 'Подарок уже куплен.' : null
  return (
    <div className="split-details">
      <h3>{gift.details.title}</h3>
      <SplitProgress state={state} share={share} showOpenStatus={false} />
      {participants.length > 0 && <ul className="split-participants" aria-label="Участники распила">
        {participants.map(person => <li key={person.id}>
          <ParticipantAvatar person={person} />
          <div className="split-participants__person">
            <strong>{person.name}</strong>
            <span className="split-hint">{person.contact || 'Контакт не указан'}</span>
          </div>
          {person.id === state.coordinatorId && <span className="split-participants__role">Координатор</span>}
        </li>)}
      </ul>}
      {status && <p className="split-hint">{status}</p>}
    </div>
  )
}
