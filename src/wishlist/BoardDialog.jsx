import { useEffect, useRef } from 'react'

const actionLabels = {
  reserve: 'Забронировать подарок',
  split: 'Начать распил',
  join: 'Присоединиться к распилу',
  cancel: 'Снять бронь',
  leave: 'Выйти из распила',
  buy: 'Отметить купленным',
  archive: 'Отправить в архив',
}

function GiftFields({ gift, company }) {
  const details = gift?.details
  return <>
    <label>Название<input name="title" required maxLength="120" defaultValue={details?.title} /></label>
    <label>Ссылка<input name="url" type="url" defaultValue={details?.url} /></label>
    <label>Цена, ₽<input name="price" type="number" min="0" step="0.01" defaultValue={details?.price} /></label>
    <label>Повод<input name="occasion" defaultValue={details?.occasion} placeholder="Без повода" /></label>
    <label>Дата<input name="occasionDate" type="date" defaultValue={details?.occasionDate} /></label>
    <label>Комментарий<textarea name="comment" rows="3" defaultValue={details?.comment} /></label>
    {!gift && <>
      <label className="dialog-check"><input type="checkbox" name="unlimited" /> Бесконечное желание</label>
      {company && <label className="dialog-check"><input type="checkbox" name="publish" defaultChecked /> Видно в компании «{company.name}»</label>}
    </>}
  </>
}

export function BoardDialog({ dialog, me, company, pending, error, onClose, onSubmit }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    element.showModal()
    return () => element.close()
  }, [])

  const { kind, gift } = dialog
  const edit = kind === 'edit' || kind === 'create'
  const title = edit ? (gift ? 'Редактировать желание' : 'Новое желание') : kind === 'profile' ? 'Мой профиль' : actionLabels[kind]

  return (
    <dialog ref={ref} className="board-dialog" aria-labelledby="dialog-title" onCancel={event => {
      event.preventDefault()
      if (!pending) onClose()
    }}>
      <form onSubmit={event => {
        event.preventDefault()
        onSubmit(new FormData(event.currentTarget))
      }}>
        <h2 id="dialog-title">{title}</h2>
        {edit && <GiftFields gift={gift} company={company} />}
        {kind === 'profile' && <>
          <label>Имя<input name="name" required defaultValue={me.user.name} /></label>
          <label>Контакт для участников распила<input name="contact" defaultValue={me.user.contact} /></label>
        </>}
        {!edit && gift && <p>{gift.details.title}</p>}
        {kind === 'split' && <label>Число долей<input name="slots" type="number" min="2"
          max={Math.max(2, (company?.members.length ?? 3) - 1)} defaultValue="2" required /></label>}
        {error && <p className="board-error" role="alert">{error}</p>}
        <footer>
          <button type="button" className="gift-action" disabled={pending} onClick={onClose}>Отмена</button>
          <button type="submit" className="gift-action gift-action--primary" disabled={pending}>
            {pending ? 'Сохраняем…' : edit || kind === 'profile' ? 'Сохранить' : 'Подтвердить'}
          </button>
        </footer>
      </form>
    </dialog>
  )
}
