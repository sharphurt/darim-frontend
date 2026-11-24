import { useEffect, useRef, useState } from 'react'
import { formatPrice, safeLink } from './giftPresentation.js'

export function VariantDetails({ variant, selected = false, card = false, canDelete = false }) {
  const link = safeLink(variant.url)
  if (card) return <header>
    <h3 className={canDelete ? 'gift-title--deletable' : undefined}>{variant.title}</h3>
    <div className="gift-card__meta">
      <p>{formatPrice(variant.price) || 'Цена не указана'}</p>
      {link && <a href={link} target="_blank" rel="noreferrer" aria-label={`Где купить: ${variant.title}`}>
        Где купить <span className="gift-card__shop-arrow" aria-hidden="true" />
      </a>}
    </div>
  </header>
  return <div className="gift-variant__details">
    <strong>{selected ? 'Выбранный вариант: ' : ''}{variant.title}</strong>
    <span>{formatPrice(variant.price) || 'Цена не указана'}</span>
    {link && <a href={link} target="_blank" rel="noreferrer" aria-label={`Где купить: ${variant.title}`}>Где купить</a>}
    {variant.description && <p className="gift-variant__description">{variant.description}</p>}
  </div>
}

const rest = [
  [0, 0, 0, 1],
  [5, -5, 4, .98],
  [-5, -7, -4, .95],
  [0, -5, 0, .92],
]

function pose([x, y, angle, scale]) {
  return `translate(${x}%, ${y}%) rotate(${angle}deg) scale(${scale})`
}

function depthAt(position, active, count) {
  const distance = (position - active + count) % count
  if (distance < 2) return distance
  return distance === count - 1 ? 2 : 3
}

export function GiftVariants({ gift, choose = false, pending = false, renderActions, board }) {
  const variants = gift.variants ?? []
  const [index, setIndex] = useState(0)
  const [moving, setMoving] = useState(false)
  const viewport = useRef(null)
  const gesture = useRef(null)
  const swiped = useRef(false)
  const operation = useRef(null)
  const count = variants.length
  const variant = variants[index]
  const opened = !board || board.flipped
  const multiple = count > 1

  useEffect(() => () => {
    const running = operation.current
    operation.current = null
    running?.forEach(animation => animation.cancel())
  }, [])

  if (!variant) return null

  const neighbor = step => (index + step + count) % count
  const nodes = () => Array.from(viewport.current.querySelectorAll('[data-variant-id]'))

  function preview(offset) {
    const step = offset < 0 ? 1 : -1
    const progress = Math.min(Math.abs(offset) / 55, 1)
    nodes().forEach((card, position) => {
      const depth = depthAt(position, index, count)
      card.style.zIndex = position === neighbor(step) ? '4' : depth === 0 ? '5' : ''
      if (!depth) card.style.transform = pose([offset, 0, offset * .11, 1])
      else if (position === neighbor(step)) card.style.transform = pose(
        rest[depth].map((value, i) => value + (rest[0][i] - value) * progress),
      )
      else card.style.removeProperty('transform')
    })
  }

  function settle(next = index, step = 0) {
    if (operation.current) return
    const cards = nodes()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach(card => { card.style.transform = ''; card.style.zIndex = '' })
      setIndex(next)
      return
    }

    const animations = cards.map((card, position) => {
      const from = getComputedStyle(card).transform
      const to = pose(rest[depthAt(position, next, count)])
      const frames = next !== index && position === index
        ? [{ transform: from, zIndex: 5 }, {
          transform: pose([-step * 90, 2, -step * 13, .97]), zIndex: 5, offset: .55,
        }, { transform: pose([-step * 70, -5, -step * 9, .95]), zIndex: 1, offset: .58 },
        { transform: to, zIndex: 1 }]
        : [{ transform: from }, { transform: to }]
      if (next !== index && position === next) {
        frames[0].opacity = 1
        frames[1].opacity = 1
        frames[0].zIndex = 4
        frames[1].zIndex = 4
      }
      card.style.zIndex = ''
      return card.animate(frames, { duration: next === index ? 160 : 330, easing: 'cubic-bezier(.2,.75,.24,1)', fill: 'forwards' })
    })
    operation.current = animations
    setMoving(true)
    const focused = document.activeElement
    if (focused?.closest('[data-variant-id]')) viewport.current.focus({ preventScroll: true })
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (operation.current !== animations) return
      // Commit the final order before removing the animation's filled styles.
      setIndex(next)
      setMoving(false)
    })
  }

  function move(step) {
    if (opened && multiple && !pending && !gesture.current && !operation.current) settle(neighbor(step), step)
  }

  function start(event) {
    if (event.isPrimary) swiped.current = false
    if (!opened || !multiple || pending || operation.current || gesture.current ||
      !event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp }
  }

  function drag(event) {
    const active = gesture.current
    if (active?.id !== event.pointerId) return
    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    if (!active.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return
      if (Math.abs(dx) <= Math.abs(dy) * 1.25) {
        gesture.current = null
        return
      }
      active.horizontal = true
      swiped.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      preview(100 * dx / event.currentTarget.clientWidth)
    }
  }

  function finish(event, cancelled = false) {
    const active = gesture.current
    if (active?.id !== event.pointerId) return
    gesture.current = null
    if (!active.horizontal) return
    const dx = event.clientX - active.x
    const dy = event.clientY - active.y
    const velocity = Math.abs(dx) / Math.max(1, event.timeStamp - active.time)
    const step = dx < 0 ? 1 : -1
    const commit = !cancelled && !pending && Math.abs(dx) > Math.abs(dy) * 1.25 &&
      (Math.abs(dx) >= Math.min(72, event.currentTarget.clientWidth * .24) ||
        Math.abs(dx) >= 24 && velocity >= .45)
    settle(commit ? neighbor(step) : index, step)
  }

  const arrow = (step, label) => <button type="button" className="variant-deck__arrow"
    aria-label={label} aria-disabled={pending || moving} onClick={() => move(step)}>
    <span className="variant-deck__chevron" aria-hidden="true" />
  </button>

  return <section className={board ? 'variant-deck variant-deck--board' : 'variant-deck'}
    data-deck-busy={moving} data-opened={opened} aria-label="Варианты подарка">
    {choose && <>
      <input type="hidden" name="variantsVersion" value={gift.variantsVersion} />
      <input type="hidden" name="variantId" value={variant.id} />
    </>}
    <div className="variant-deck__viewport" ref={element => {
      viewport.current = element
      if (element && !moving && operation.current) {
        element.querySelectorAll('[data-variant-id]').forEach(card => card.style.removeProperty('transform'))
        operation.current.forEach(animation => animation.cancel())
        operation.current = null
      }
    }} role="group" aria-label="Листать варианты" tabIndex={opened && multiple ? 0 : undefined}
      onClick={event => {
        if (!board || !opened || swiped.current || operation.current || event.target.closest('button, a')) return
        if (!window.getSelection()?.isCollapsed) return
        board.onFlip()
      }}
      onPointerDown={start} onPointerMove={drag} onPointerUp={event => finish(event)}
      onPointerLeave={event => { if (!gesture.current?.horizontal) finish(event, true) }}
      onPointerCancel={event => finish(event, true)}
      onLostPointerCapture={event => { if (event.target === event.currentTarget) finish(event, true) }}
      onKeyDown={event => {
        if (!opened || !multiple || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
        event.preventDefault()
        move(event.key === 'ArrowLeft' ? -1 : 1)
      }}>
      <div className="variant-deck__slides">
        {variants.map((item, position) => {
          const depth = depthAt(position, index, count)
          return <div key={item.id} className="variant-deck__card" data-variant-id={item.id} data-depth={depth}
            style={{ '--deck-position': pose(rest[depth]) }} inert={depth !== 0 || moving || !opened}
            aria-hidden={depth !== 0 || moving || !opened}>
            <div className="variant-deck__faces">
              {board && <div className="variant-deck__cover" inert={opened}>{depth === 0 && board.cover}</div>}
              <div className="variant-deck__model" inert={!opened}>
                <VariantDetails variant={item} card={Boolean(board)} canDelete={board?.canDelete} />
                {renderActions?.(item)}
              </div>
            </div>
          </div>
        })}
      </div>
      {opened && multiple && <>
        {arrow(-1, 'Предыдущий вариант')}
        {arrow(1, 'Следующий вариант')}
      </>}
    </div>
    {board && <button type="button" className="variant-deck__flip" onClick={board.onFlip}
      disabled={moving} aria-pressed={board.openDetails ? undefined : opened}
      aria-haspopup={board.openDetails ? 'dialog' : undefined}
      aria-label={opened ? `Показать лицевую сторону: ${board.title}` : `Подробнее: ${board.title}`} />}
    {opened && multiple && <p className="variant-deck__position" role="status">
      <span className="sr-only">{variant.title}, вариант </span>{index + 1} из {count}
    </p>}
  </section>
}
