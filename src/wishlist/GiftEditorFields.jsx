import { useEffect, useRef, useState } from 'react'
import { cardPhoto } from './giftPresentation.js'

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
  const [all, setAll] = useState(gift?.visibility?.allCompanies ?? false)
  const selected = gift ? gift.visibility?.companyIds ?? [] : [company?.id]
  return (
    <fieldset className="gift-editor__companies">
      <legend>Видно компаниям</legend>
      <label className="dialog-check">
        <input type="checkbox" name="allCompanies" checked={all} onChange={event => setAll(event.target.checked)} />
        Все мои компании, включая будущие
      </label>
      {companies.length > 0 &&
        <div className="gift-editor__company-options">
          {companies.map(item => <label className="dialog-check" key={item.id}>
            <input type="checkbox" name="companyIds" value={item.id} defaultChecked={selected.includes(item.id)} disabled={all} />
            {item.name}
          </label>)}
        </div>
      }
      {!all && <p className="gift-editor__hint">Без выбранных компаний желание видно только вам.</p>}
    </fieldset>
  )
}

export function GiftEditorFields({ gift, company, companies, pending }) {
  const details = gift?.details
  return (
    <div className="gift-editor">
      <PhotoField gift={gift} pending={pending} />
      <div className="gift-editor__fields">
        <label>Название<input name="title" required maxLength="160" defaultValue={details?.title} /></label>
        <label>Ссылка<input name="url" type="url" maxLength="2048" defaultValue={details?.url} /></label>
        <div className="gift-editor__field-row">
          <label>Цена, ₽<input name="price" type="number" min="0" max="100000000" step="0.01" defaultValue={details?.price} /></label>
          <label>Дата<input name="occasionDate" type="date" defaultValue={details?.occasionDate} /></label>
        </div>
        <label>Повод<input name="occasion" maxLength="80" defaultValue={details?.occasion} placeholder="Без повода" /></label>
        <label>Комментарий<textarea name="comment" rows="3" maxLength="2000" defaultValue={details?.comment} /></label>
        {!gift && <label className="dialog-check"><input type="checkbox" name="unlimited" /> Бесконечное желание</label>}
        <CompanyFields companies={companies} company={company} gift={gift} />
      </div>
    </div>
  )
}
