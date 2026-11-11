import { useState } from 'react'
import { formatPrice, safeLink } from './giftPresentation.js'

export function SplitProgress({ state }) {
  const { taken, slots } = state
  return (
    <div className="split-progress">
      <p>Занято {taken} из {slots}</p>
      <div className="split-progress__track" aria-hidden="true"
        style={{ '--split-slots': slots }}>
        {Array.from({ length: slots }, (_, index) => {
          const filled = index < taken
          return <span key={index} data-filled={filled} />
        })}
      </div>
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

export function SplitFields({ gift, maxSlots }) {
  const [slots, setSlots] = useState('2')
  const count = Number(slots)
  const price = gift.details.price
  const share = price != null && Number.isInteger(count) && count >= 2 && count <= maxSlots
    ? formatPrice(price / count) : ''

  return (
    <>
      <p>Разделим «{gift.details.title}» на равные доли. Вы займёте первую, друзья смогут присоединиться.</p>
      <label>Количество участников
        <input name="slots" type="number" min="2" max={maxSlots} value={slots} required
          onChange={event => setSlots(event.target.value)} />
      </label>
      <output className="split-share" aria-live="polite">
        {share && <><strong>≈ {share}</strong> <span>с человека</span></>}
      </output>
      <p className="split-hint">Количество долей фиксируется при создании. У каждого участника одна доля.</p>
    </>
  )
}

export function SplitDetails({ gift }) {
  const state = gift.participation
  const participants = state.participants ?? []
  const price = gift.details.price
  return (
    <div className="split-details">
      <div>
        <h3>{gift.details.title}</h3>
        <p className="split-hint">Получатель: {gift.owner.name}</p>
      </div>
      <SplitProgress state={state} />
      {price != null && state.slots > 0 && <p>≈ {formatPrice(price / state.slots)} с человека</p>}
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
      {gift.archived ? <p className="split-hint">Желание в архиве.</p>
        : state.bought ? <p className="split-hint">Подарок уже куплен.</p>
          : <p className="split-hint">Координатор связывается с участниками и организует покупку.</p>}
    </div>
  )
}
