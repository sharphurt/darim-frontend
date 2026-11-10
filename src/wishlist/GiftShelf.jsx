import { useMemo, useSyncExternalStore } from 'react'
import separator from '../assets/separator.svg'
import { GiftCard } from './GiftCard.jsx'
import { useCardMotion } from './useCardMotion.js'

const columnQueries = ['(min-width: 1200px)', '(min-width: 761px)', '(min-width: 481px)']
  .map(query => window.matchMedia(query))

function subscribeColumns(listener) {
  for (const query of columnQueries) query.addEventListener('change', listener)
  return () => {
    for (const query of columnQueries) query.removeEventListener('change', listener)
  }
}

function countColumns() {
  const firstMatch = columnQueries.findIndex(query => query.matches)
  return firstMatch < 0 ? 1 : 4 - firstMatch
}

export function GiftShelf({ title, gifts, viewerId, canSplit, onAction, pending }) {
  const columns = useSyncExternalStore(subscribeColumns, countColumns)
  const rows = useMemo(() => Array.from({ length: Math.ceil(gifts.length / columns) },
    (_, index) => gifts.slice(index * columns, (index + 1) * columns)), [gifts, columns])
  const shelf = useCardMotion(rows)
  return (
    <section className="gift-shelf" aria-label={title}>
      <h2 className="gift-shelf__heading">
        <img src={separator} alt="" width="694" height="62" />
        <span>{title}</span>
        <img src={separator} alt="" width="694" height="62" />
      </h2>
      <div className="gift-shelf__cards" ref={shelf}>
        {rows.map(row => <ul className="gift-row" key={row[0].id}>
          {row.map(gift => <GiftCard key={gift.id} gift={gift} own={gift.owner.id === viewerId}
            canSplit={canSplit} onAction={onAction} pending={pending} />)}
        </ul>)}
      </div>
    </section>
  )
}
