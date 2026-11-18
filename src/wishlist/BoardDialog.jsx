import { useEffect, useRef, useState } from 'react'
import { GiftEditorFields } from './GiftEditorFields.jsx'
import { GiftActions, GiftBackContent } from './GiftCard.jsx'
import { SplitDetails, SplitFields } from './GiftSplit.jsx'
import { artworkCategoryNames } from './cardArtwork.js'
import { OhmywishesSettings } from './OhmywishesSettings.jsx'

const actionLabels = {
  'create-company': 'Создать компанию',
  'join-company': 'Вступить по приглашению',
  'invite-company': 'Пригласить участника',
  'invite-result': 'Ссылка для приглашения',
  'card-artwork': 'Фоны и узоры',
  reserve: 'Забронировать подарок',
  split: 'Дарить вместе',
  'split-details': 'Участники распила',
  cancel: 'Снять бронь',
  leave: 'Выйти из распила',
  'close-split': 'Завершить сбор участников',
  transfer: 'Передать координацию',
  buy: 'Отметить купленным',
  archive: 'Отправить в архив',
}

function CardArtworkFields({ catalog, pending, uploaded, onRemove }) {
  const [category, setCategory] = useState('dark')
  const images = catalog.filter(image => image.category === category)
  return <>
    <label>Тип изображения
      <select name="category" value={category} onChange={event => setCategory(event.target.value)} disabled={pending}>
        {Object.entries(artworkCategoryNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
    </label>
    <label>Файл PNG
      <input key={uploaded} name="artwork" type="file" accept="image/png,.png" required disabled={pending}
        aria-describedby="card-artwork-format" />
    </label>
    <p id="card-artwork-format" className="gift-editor__hint">До 5 МБ. Рекомендуемый размер — 640 × 900 пикселей.</p>
    {images.length > 0 && <ul className="card-artwork-list" aria-label="Изображения этой категории">
      {images.map((image, index) => <li key={image.id}>
        <img src={image.src} width="64" height="90" alt="" loading="lazy" />
        <button type="button" className="gift-action" disabled={pending}
          aria-label={`Удалить изображение ${index + 1}`} onClick={() => onRemove(image.id)}>Удалить</button>
      </li>)}
    </ul>}
  </>
}

export function BoardDialog({ dialog, me, company, companies, pending, error, onClose, onClosed, onSubmit, onGiftAction, onCardAction, canSplit, artworkCatalog, onRemoveArtwork, ohmywishesApi, importCompany, onGiftsChanged }) {
  const ref = useRef(null)
  const { kind, gift, link, closing } = dialog
  useEffect(() => {
    const element = ref.current
    element.showModal()
    return () => element.close()
  }, [])

  useEffect(() => {
    if (!closing) return
    const element = ref.current
    const transition = element.getAnimations().find(animation => animation.transitionProperty === 'opacity')
    let active = true
    function finish() {
      if (!active) return
      element.close()
      onClosed()
    }
    if (transition) transition.finished.then(finish, finish)
    else finish()
    return () => { active = false }
  }, [closing, onClosed])

  const edit = kind === 'edit' || kind === 'create'
  const giftDetails = kind === 'gift-details'
  const own = gift?.owner.id === me.user.id
  const splitDetails = kind === 'split-details'
  const editArtwork = kind === 'card-artwork'
  const splitCancel = kind === 'cancel' && gift?.participation?.mode === 'split'
  const title = edit ? (gift ? 'Редактировать желание' : 'Новое желание')
    : kind === 'profile' ? 'Мой профиль' : splitCancel ? 'Выйти из распила' : actionLabels[kind]
  const confirm = kind === 'split' ? 'Распилить и занять долю'
    : editArtwork ? 'Загрузить'
    : edit || kind === 'profile' ? 'Сохранить' : 'Подтвердить'
  const state = gift?.participation
  const canManageSplit = splitDetails && gift && !gift.archived && !state.bought
  const archiveButton = own && !gift.archived && !gift.fromOhmywishes &&
    <button type="button" className="gift-action board-dialog__archive" disabled={pending}
      onClick={() => onGiftAction('archive', gift)}>В архив</button>
  const dialogStyle = kind === 'create' ? ' board-dialog--gift board-dialog--create'
    : edit ? ' board-dialog--gift' : editArtwork ? ' board-dialog--artwork'
    : kind === 'archive' ? ' board-dialog--archive'
    : kind === 'transfer' ? ' board-dialog--transfer'
    : splitDetails ? ' board-dialog--split board-dialog--split-details'
    : kind === 'split' ? ' board-dialog--split' : giftDetails ? ' board-dialog--gift-details' : ''

  return (
    <dialog ref={ref} className={`board-dialog${dialogStyle}`} data-closing={closing}
      aria-labelledby="dialog-title" onClick={event => {
      if (giftDetails && !pending && event.target === event.currentTarget) onClose()
    }} onCancel={event => {
      event.preventDefault()
      if (!pending && !closing) onClose()
    }}>
      {giftDetails ? (
        <section className="gift-details__panel">
          <div className="gift-details__content" tabIndex={0}>
            <GiftBackContent gift={gift} modal />
            {error && <p className="board-error" role="alert">{error}</p>}
          </div>
          <footer>
            {archiveButton}
            {own ? <button type="button" className="gift-action gift-action--primary" disabled={pending}
              onClick={() => onCardAction(gift, gift.archived ? 'restore' : 'edit')}>
              {gift.archived ? 'Вернуть' : 'Редактировать'}
            </button> : <GiftActions gift={gift} canSplit={canSplit} pending={pending} onAction={onCardAction} />}
          </footer>
        </section>
      ) : <div className="board-dialog__body"><form inert={closing} onSubmit={event => {
        event.preventDefault()
        if (!closing && !link && !splitDetails) onSubmit(new FormData(event.currentTarget))
      }}>
        <h2 id="dialog-title">{title}</h2>
        {edit && <GiftEditorFields gift={gift} company={company} companies={companies} pending={pending} />}
        {editArtwork && <CardArtworkFields catalog={artworkCatalog} pending={pending}
          uploaded={dialog.uploaded} onRemove={onRemoveArtwork} />}
        {editArtwork && dialog.artworkStatus && !pending && !error && <p role="status">{dialog.artworkStatus}</p>}
        {kind === 'create-company' && <label>Название компании<input name="name" required maxLength="100" /></label>}
        {kind === 'join-company' && <label>Ссылка или код приглашения
          <input name="token" defaultValue={dialog.token} autoComplete="off" required />
        </label>}
        {kind === 'invite-company' && <label>Сколько человек могут вступить
          <select name="inviteLimit" defaultValue="1"><option value="1">Один человек</option><option value="5">До пяти человек</option><option value="unlimited">Без ограничения</option></select>
          Новая ссылка заменит предыдущее приглашение.
        </label>}
        {link && <label>Ссылка для приглашения<input value={link} readOnly onFocus={event => event.currentTarget.select()} /></label>}
        {kind === 'profile' && <>
          <label>Имя<input name="name" required defaultValue={me.user.name} /></label>
          <label>Контакт для участников распила<input name="contact" defaultValue={me.user.contact} /></label>
        </>}
        {!edit && !splitDetails && kind !== 'split' && gift && <p>{gift.details.title}</p>}
        {kind === 'split' && <SplitFields gift={gift} maxSlots={(company?.members.length ?? 0) - 1} />}
        {(kind === 'leave' || splitCancel) && <p>Остальные участники сохранят свои доли. Если вы координатор, роль перейдёт первому вступившему из оставшихся. При выходе последнего участника бронь снимется.</p>}
        {kind === 'close-split' && <p>Новые участники больше не смогут вступить. Доли будут рассчитаны на {state.taken} человек. Если кто-то выйдет до покупки, сбор откроется снова.</p>}
        {kind === 'transfer' && <label>Новый координатор<select name="userId" required>
          {state.participants.filter(person => person.id !== me.user.id).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select></label>}
        {splitDetails && (gift ? <SplitDetails gift={gift} /> : <p>Этот распил больше недоступен.</p>)}
        {error && <p className="board-error" role="alert">{error}</p>}
        <footer>
          {splitDetails ? <>
            {canManageSplit && <button type="button" className="gift-action" disabled={pending}
              onClick={() => onGiftAction('leave', gift)}>
              Выйти из распила
            </button>}
            {canManageSplit && state.isCoordinator && state.taken >= 2 && <button type="button" className="gift-action" disabled={pending}
              onClick={() => onGiftAction('transfer', gift)}>Передать координацию</button>}
            {canManageSplit && state.isCoordinator && state.open && state.taken >= 2 && <button type="button" className="gift-action gift-action--primary" disabled={pending}
              onClick={() => onGiftAction('close-split', gift)}>Завершить сбор</button>}
            {canManageSplit && state.isCoordinator && !state.open && state.taken >= 2 && <button type="button"
              className="gift-action gift-action--primary" disabled={pending} onClick={() => onGiftAction('buy', gift)}>
              Отметить купленным
            </button>}
          </> : link ? <button type="button" className="gift-action gift-action--primary board-dialog__dismiss" onClick={onClose}>Готово</button> : <>
            {kind === 'edit' && archiveButton}
            {kind !== 'split' && kind !== 'profile' && <button type="button" className="gift-action board-dialog__dismiss" disabled={pending}
              onClick={onClose}>{editArtwork ? 'Закрыть' : 'Отмена'}</button>}
            <button type="submit" className="gift-action gift-action--primary" disabled={pending}>
              {pending ? 'Сохраняем…' : confirm}
            </button>
          </>}
        </footer>
      </form>
      {kind === 'profile' && <OhmywishesSettings api={ohmywishesApi} company={importCompany}
        outcome={dialog.outcome} profilePending={pending} onGiftsChanged={onGiftsChanged} />}
      </div>}
      {kind !== 'transfer' && <button type="button" className="board-dialog__close" aria-label="Закрыть" disabled={pending || closing} onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>}
    </dialog>
  )
}
