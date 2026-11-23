import { useRef, useState } from 'react'
import { formatPrice, safeLink } from './giftPresentation.js'

export function VariantDetails({ variant, selected = false }) {
  const link = safeLink(variant.url)
  return <div className="gift-variant__details">
    <strong>{selected ? 'Выбранный вариант: ' : ''}{variant.title}</strong>
    <span>{formatPrice(variant.price) || 'Цена не указана'}</span>
    {link && <a href={link} target="_blank" rel="noreferrer" aria-label={`Где купить: ${variant.title}`}>Где купить</a>}
  </div>
}

export function GiftVariants({ gift, choose = false, pending = false, initialVariantId, renderActions, compact = false }) {
  const variants = gift.variants ?? []
  const [variantId, setVariantId] = useState(initialVariantId)
  const touch = useRef(null)
  if (!variants.length) return null

  const index = Math.max(0, variants.findIndex(item => item.id === variantId))
  const variant = variants[index]
  const multiple = variants.length > 1

  function move(step) {
    const next = variants[index + step]
    if (!pending && next) setVariantId(next.id)
  }

  function startSwipe(event) {
    if (event.pointerType !== 'touch' || !event.isPrimary || event.target.closest('button, a')) return
    touch.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
  }

  function finishSwipe(event) {
    const start = touch.current
    if (start?.id !== event.pointerId) return
    touch.current = null
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.25) move(dx < 0 ? 1 : -1)
  }

  const arrow = (step, label) => <button type="button" className="variant-deck__arrow"
    aria-label={label} aria-disabled={pending || !variants[index + step]}
    tabIndex={pending || !variants[index + step] ? -1 : undefined} onClick={() => move(step)}>
    <span className="variant-deck__chevron" aria-hidden="true" />
  </button>

  return <section className={compact ? "variant-deck variant-deck--compact" : "variant-deck"} aria-label="Варианты подарка">
    {choose && <>
      <input type="hidden" name="variantsVersion" value={gift.variantsVersion} />
      <input type="hidden" name="variantId" value={variant.id} />
    </>}
    <div className="variant-deck__viewport" role="group" aria-label="Листать варианты" tabIndex={multiple ? 0 : undefined}
      onPointerDown={startSwipe} onPointerUp={finishSwipe} onPointerCancel={() => { touch.current = null }}
      onKeyDown={event => {
        if (!multiple || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        move(event.key === 'ArrowLeft' ? -1 : 1)
      }}>
      {!compact && <span className="variant-stack" aria-hidden="true" />}
      <div className="variant-deck__card">
        <div className="variant-deck__model" key={variant.id}>
          <VariantDetails variant={variant} />
        </div>
      </div>
      {multiple && <>
        {arrow(-1, 'Предыдущий вариант')}
        {arrow(1, 'Следующий вариант')}
      </>}
    </div>
    {multiple && <p className="variant-deck__position" role="status">
      <span className="sr-only">{variant.title}, вариант </span>{index + 1} из {variants.length}
    </p>}
    {renderActions?.(variant)}
  </section>
}
