import { useEffect, useRef, useState } from 'react'
import { cardPhoto } from './giftPresentation.js'

const maxTitleLength = 80
const photoTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxPhotoMegabytes = 15
const maxPhotoBytes = maxPhotoMegabytes * 1024 * 1024

function PhotoField({ gift, pending }) {
  const input = useRef(null)
  const original = gift && cardPhoto(gift)
  const [preview, setPreview] = useState('')
  const [removed, setRemoved] = useState(false)
  const [error, setError] = useState('')
  const source = preview || (!removed && original)

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview)
  }, [preview])

  function selectPhoto(event) {
    const field = event.currentTarget
    const file = field.files[0]
    if (!file) return
    const supported = file.type ? photoTypes.includes(file.type) : /\.(jpe?g|png|webp)$/i.test(file.name)
    const message = !supported || !file.size ? 'Выберите фото в формате JPEG, PNG или WebP.'
      : file.size > maxPhotoBytes ? `Фото должно занимать не больше ${maxPhotoMegabytes} МБ.` : ''
    field.setCustomValidity(message)
    setError(message)
    setPreview(message ? '' : URL.createObjectURL(file))
    if (!message) setRemoved(false)
  }

  function clearPhoto() {
    input.current.value = ''
    input.current.setCustomValidity('')
    setPreview('')
    if (!error) setRemoved(Boolean(original))
    setError('')
  }

  return (
    <div className="gift-editor__photo">
      <div className="gift-editor__preview" data-filled={Boolean(source)}>
        {source ? <img src={source} alt="Фото желания" referrerPolicy="no-referrer" /> : <p>Фото желания</p>}
      </div>
      <div className="gift-editor__photo-actions">
        <label className="gift-editor__photo-picker">
          <input ref={input} name="photo" type="file" className="sr-only" accept={photoTypes.join(',')}
            onChange={selectPhoto} aria-describedby="gift-photo-formats" disabled={pending} />
          <span>{source ? 'Заменить фото' : 'Добавить фото'}</span>
        </label>
        {(source || error) && <button type="button" className="gift-action" disabled={pending}
          onClick={clearPhoto}>{error ? 'Сбросить выбор' : 'Удалить фото'}</button>}
      </div>
      <p id="gift-photo-formats" className="gift-editor__hint">JPEG, PNG или WebP, до {maxPhotoMegabytes} МБ</p>
      {error && <p className="board-error" role="alert">{error}</p>}
      {removed && <input type="hidden" name="removePhoto" value="true" />}
    </div>
  )
}

function CompanyFields({ companies, company, gift }) {
  const [selected, setSelected] = useState(() => companies.filter(item => gift
    ? gift.visibility?.allCompanies || gift.visibility?.companyIds?.includes(item.id)
    : item.id === company?.id).map(item => item.id))
  const [shared, setShared] = useState(selected.length > 0)
  const all = selected.length === companies.length
  return (
    <fieldset className="gift-editor__companies">
      <legend>Видимость</legend>
      <div className="gift-editor__visibility">
        <label className="dialog-check">
          <input type="radio" name="visibility" checked={!shared} onChange={() => setShared(false)} />
          Видно только мне
        </label>
        <label className="dialog-check">
          <input type="radio" name="visibility" checked={shared} onChange={() => setShared(true)} />
          Видно другим
        </label>
      </div>
      {shared && (companies.length ? <>
        <label className="dialog-check">
          <input type="checkbox" checked={all} onChange={event => setSelected(
            event.target.checked ? companies.map(item => item.id) : [],
          )} />
          Все
        </label>
        <div className="gift-editor__company-options">
          {companies.map(item => <label className="dialog-check" key={item.id}>
            <input type="checkbox" name="companyIds" value={item.id} checked={selected.includes(item.id)}
              onChange={event => setSelected(event.target.checked
                ? [...selected, item.id] : selected.filter(id => id !== item.id))} />
            {item.name}
          </label>)}
        </div>
        {!selected.length && <p className="gift-editor__hint">Без выбранных компаний желание видно только вам.</p>}
      </> : <p className="gift-editor__hint">У вас пока нет компаний.</p>)}
    </fieldset>
  )
}

export function GiftEditorFields({ gift, company, companies, pending }) {
  const details = gift?.details
  return (
    <div className="gift-editor">
      <PhotoField gift={gift} pending={pending} />
      <div className="gift-editor__fields">
        <label>Название (до {maxTitleLength} символов)
          <input name="title" required maxLength={maxTitleLength} defaultValue={details?.title} />
        </label>
        <label>Ссылка<input name="url" inputMode="url" maxLength="2048" defaultValue={details?.url} /></label>
        <label>Цена, ₽<input name="price" type="number" inputMode="decimal"
          min="0" max="100000000" step="0.01" defaultValue={details?.price} /></label>
        <label>Повод<input name="occasion" maxLength="80" defaultValue={details?.occasion} placeholder="Без повода" /></label>
        <label>Комментарий<textarea name="comment" rows="3" maxLength="2000" defaultValue={details?.comment} /></label>
        {!gift && <label className="dialog-check"><input type="checkbox" name="unlimited" /> Бесконечное желание</label>}
        <CompanyFields companies={companies} company={company} gift={gift} />
      </div>
    </div>
  )
}
