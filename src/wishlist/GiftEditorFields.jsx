import { useEffect, useRef, useState } from 'react'
import { cardPhoto } from './giftPresentation.js'

const maxTitleLength = 80
const photoTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxPhotoMegabytes = 15
const maxPhotoBytes = maxPhotoMegabytes * 1024 * 1024
const priceStep = 0.01
const priceWheelStep = 100

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
      <div className="gift-editor__photo-upload" data-filled={Boolean(source)}>
        <div className="gift-editor__preview">
          {source && <img src={source} alt="Фото желания" referrerPolicy="no-referrer" />}
        </div>
        <div className="gift-editor__photo-controls">
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
        </div>
      </div>
      {error && <p className="board-error" role="alert">{error}</p>}
      {removed && <input type="hidden" name="removePhoto" value="true" />}
    </div>
  )
}

export function CompanyFields({ companies, company, gift }) {
  const [selected, setSelected] = useState(() => companies.filter(item => gift
    ? gift.visibility?.allCompanies || gift.visibility?.companyIds?.includes(item.id)
    : item.id === company?.id).map(item => item.id))
  const [allCompanies, setAllCompanies] = useState(Boolean(gift?.fromOhmywishes && gift.visibility?.allCompanies))
  const [shared, setShared] = useState(allCompanies || selected.length > 0)
  const all = gift?.fromOhmywishes ? allCompanies : selected.length === companies.length
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
      {shared && allCompanies && <input type="hidden" name="allCompanies" value="true" />}
      {shared && (companies.length ? <>
        <label className="dialog-check">
          <input type="checkbox" checked={all} onChange={event => {
            if (gift?.fromOhmywishes) setAllCompanies(event.target.checked)
            setSelected(event.target.checked ? companies.map(item => item.id) : [])
          }} />
          Все
        </label>
        <div className="gift-editor__company-options">
          {companies.map(item => <label className="dialog-check" key={item.id}>
            <input type="checkbox" name="companyIds" value={item.id} checked={selected.includes(item.id)}
              onChange={event => {
                setAllCompanies(false)
                setSelected(event.target.checked ? [...selected, item.id] : selected.filter(id => id !== item.id))
              }} />
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
  const priceInput = useRef(null)

  useEffect(() => {
    const input = priceInput.current
    function changePrice(event) {
      if (input.ownerDocument.activeElement !== input || !event.deltaY || event.ctrlKey || !event.cancelable) return
      event.preventDefault()
      const steps = priceWheelStep / priceStep
      if (event.deltaY < 0) input.stepUp(steps)
      else input.stepDown(steps)
    }
    input.addEventListener('wheel', changePrice, { passive: false })
    return () => input.removeEventListener('wheel', changePrice)
  }, [])

  return (
    <div className="gift-editor">
      <PhotoField gift={gift} pending={pending} />
      <div className="gift-editor__fields">
        <label>Название (до {maxTitleLength} символов)
          <input name="title" required maxLength={maxTitleLength} defaultValue={details?.title} />
        </label>
        <label>Ссылка<input name="url" inputMode="url" maxLength="2048" defaultValue={details?.url} /></label>
        <label>Цена, ₽<input ref={priceInput} name="price" type="number" inputMode="decimal"
          min="0" max="100000000" step={priceStep} defaultValue={details?.price} /></label>
        <label>Комментарий<textarea name="comment" rows="3" maxLength="2000" defaultValue={details?.comment} /></label>
        {!gift && <label className="dialog-check"><input type="checkbox" name="unlimited" /> Бесконечное желание</label>}
        <CompanyFields companies={companies} company={company} gift={gift} />
      </div>
    </div>
  )
}
