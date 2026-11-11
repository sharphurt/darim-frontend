import { useEffect, useRef } from 'react'
import { GiftEditorFields } from './GiftEditorFields.jsx'
import { SplitDetails, SplitFields } from './GiftSplit.jsx'

const actionLabels = {
  'create-company': 'Создать компанию',
  'join-company': 'Вступить по приглашению',
  'invite-company': 'Пригласить участника',
  'invite-result': 'Ссылка для приглашения',
  reserve: 'Забронировать подарок',
  split: 'Дарить вместе',
  'split-details': 'Участники распила',
  join: 'Присоединиться к распилу',
  cancel: 'Снять бронь',
  leave: 'Выйти из распила',
  buy: 'Отметить купленным',
  archive: 'Отправить в архив',
}

export function BoardDialog({ dialog, me, company, companies, pending, error, onClose, onSubmit, onGiftAction }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    element.showModal()
    return () => element.close()
  }, [])

  const { kind, gift, link } = dialog
  const edit = kind === 'edit' || kind === 'create'
  const splitDetails = kind === 'split-details'
  const splitCancel = kind === 'cancel' && gift?.participation?.mode === 'split'
  const title = edit ? (gift ? 'Редактировать желание' : 'Новое желание')
    : kind === 'profile' ? 'Мой профиль' : splitCancel ? 'Отменить весь распил' : actionLabels[kind]
  const confirm = kind === 'split' ? 'Распилить и занять долю'
    : kind === 'join' ? 'Занять долю' : edit || kind === 'profile' ? 'Сохранить' : 'Подтвердить'
  const state = gift?.participation
  const canManageSplit = splitDetails && gift && !gift.archived && !state.bought
  const dialogStyle = edit ? ' board-dialog--gift' : kind === 'split' || splitDetails ? ' board-dialog--split' : ''

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
            {kind === 'edit' && !gift.fromOhmywishes && <button type="button" className="gift-action" disabled={pending}
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
