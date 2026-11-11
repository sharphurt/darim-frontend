import { useEffect, useRef, useState } from 'react'
import { GiftEditorFields } from './GiftEditorFields.jsx'
import { SplitDetails, SplitFields } from './GiftSplit.jsx'
import { cardArtworkImage, cardArtworkSlots } from './giftPresentation.js'

const actionLabels = {
  'create-company': 'Создать компанию',
  'join-company': 'Вступить по приглашению',
  'invite-company': 'Пригласить участника',
  'invite-result': 'Ссылка для приглашения',
  'card-artwork': 'Фоны и узоры',
  reserve: 'Забронировать подарок',
  split: 'Дарить вместе',
  'split-details': 'Участники распила',
  join: 'Присоединиться к распилу',
  cancel: 'Снять бронь',
  leave: 'Выйти из распила',
  buy: 'Отметить купленным',
  archive: 'Отправить в архив',
}

function CardArtworkFields({ versions, pending }) {
  const [slotId, setSlotId] = useState(cardArtworkSlots[0].id)
  const slot = cardArtworkSlots.find(item => item.id === slotId)
  return <>
    <label>Что заменить
      <select name="slot" value={slotId} onChange={event => setSlotId(event.target.value)} disabled={pending}>
        {cardArtworkSlots.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <img className="card-artwork-preview" src={cardArtworkImage(slot, versions)} width="80" height="113" alt="Текущее изображение" />
    <label>Новый PNG
      <input key={slotId} name="artwork" type="file" accept="image/png,.png" required disabled={pending}
        aria-describedby="card-artwork-format" />
    </label>
    <p id="card-artwork-format" className="gift-editor__hint">До 5 МБ. Рекомендуемый размер — 640 × 900 пикселей.</p>
  </>
}

export function BoardDialog({ dialog, me, company, companies, pending, error, onClose, onSubmit, onGiftAction, artworkVersions }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    element.showModal()
    return () => element.close()
  }, [])

  const { kind, gift, link } = dialog
  const edit = kind === 'edit' || kind === 'create'
  const splitDetails = kind === 'split-details'
  const editArtwork = kind === 'card-artwork'
  const splitCancel = kind === 'cancel' && gift?.participation?.mode === 'split'
  const title = edit ? (gift ? 'Редактировать желание' : 'Новое желание')
    : kind === 'profile' ? 'Мой профиль' : splitCancel ? 'Отменить весь распил' : actionLabels[kind]
  const confirm = kind === 'split' ? 'Распилить и занять долю'
    : kind === 'join' ? 'Занять долю' : editArtwork ? 'Заменить'
    : edit || kind === 'profile' ? 'Сохранить' : 'Подтвердить'
  const state = gift?.participation
  const canManageSplit = splitDetails && gift && !gift.archived && !state.bought
  const dialogStyle = edit ? ' board-dialog--gift' : editArtwork ? ' board-dialog--artwork'
    : kind === 'split' || splitDetails ? ' board-dialog--split' : ''

  return (
    <dialog ref={ref} className={`board-dialog${dialogStyle}`} aria-labelledby="dialog-title" onCancel={event => {
      event.preventDefault()
      if (!pending) onClose()
    }}>
      <form onSubmit={event => {
        event.preventDefault()
        if (!link && !splitDetails) onSubmit(new FormData(event.currentTarget))
      }}>
        <h2 id="dialog-title">{title}</h2>
        {edit && <GiftEditorFields gift={gift} company={company} companies={companies} pending={pending} />}
        {editArtwork && <CardArtworkFields versions={artworkVersions} pending={pending} />}
        {kind === 'create-company' && <label>Название компании<input name="name" required maxLength="100" /></label>}
        {kind === 'join-company' && <label>Ссылка или код приглашения
          <input name="token" defaultValue={dialog.token} autoComplete="off" required />
        </label>}
        {kind === 'invite-company' && <p>Новая ссылка действует для одного вступления и заменит предыдущее приглашение.</p>}
        {link && <label>Одноразовая ссылка<input value={link} readOnly onFocus={event => event.currentTarget.select()} /></label>}
        {kind === 'profile' && <>
          <label>Имя<input name="name" required defaultValue={me.user.name} /></label>
          <label>Контакт для участников распила<input name="contact" defaultValue={me.user.contact} /></label>
        </>}
        {!edit && !splitDetails && kind !== 'split' && gift && <p>{gift.details.title}</p>}
        {kind === 'split' && <SplitFields gift={gift} maxSlots={(company?.members.length ?? 0) - 1} />}
        {splitDetails && (gift ? <SplitDetails gift={gift} /> : <p>Этот распил больше недоступен.</p>)}
        {error && <p className="board-error" role="alert">{error}</p>}
        <footer>
          {splitDetails ? <>
            {canManageSplit && <button type="button" className="gift-action" disabled={pending}
              onClick={() => onGiftAction(state.isCoordinator ? 'cancel' : 'leave', gift)}>
              {state.isCoordinator ? 'Отменить распил' : 'Выйти из распила'}
            </button>}
            {canManageSplit && state.isCoordinator && state.taken === state.slots && <button type="button"
              className="gift-action gift-action--primary" disabled={pending} onClick={() => onGiftAction('buy', gift)}>
              Отметить купленным
            </button>}
            <button type="button" className="gift-action" onClick={onClose}>Закрыть</button>
          </> : link ? <button type="button" className="gift-action gift-action--primary" onClick={onClose}>Готово</button> : <>
            {kind === 'edit' && !gift.fromOhmywishes && <button type="button" className="gift-action board-dialog__archive" disabled={pending}
              onClick={() => onGiftAction('archive', gift)}>В архив</button>}
            <button type="button" className="gift-action" disabled={pending} onClick={onClose}>Отмена</button>
            <button type="submit" className="gift-action gift-action--primary" disabled={pending}>
              {pending ? 'Сохраняем…' : confirm}
            </button>
          </>}
        </footer>
      </form>
    </dialog>
  )
}
