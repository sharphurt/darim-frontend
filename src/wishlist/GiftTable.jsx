import { useMemo, useState } from 'react'
import { formatPrice, safeLink } from './giftPresentation.js'
import { isFreeGift, sortTableGifts, tableGiftStatus } from './giftTableSorting.js'
import './giftTable.css'

const columns = [
  { key: 'title', label: 'Желание' },
  { key: 'owner', label: 'Кто желает' },
  { key: 'price', label: 'Цена' },
  { key: 'status', label: 'Статус' },
]

export function GiftTable({ gifts, archived, canFilterFree, onAction }) {
  const [sort, setSort] = useState(null)
  const [onlyFree, setOnlyFree] = useState(false)
  const filterFree = canFilterFree && onlyFree
  const sortedGifts = useMemo(() => sortTableGifts(filterFree ? gifts.filter(isFreeGift) : gifts, sort), [gifts, sort, filterFree])

  function changeSort(key) {
    setSort(current => ({ key, direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' }))
  }

  function openRow(event, gift) {
    if (event.target.closest('a, button')) return
    const selection = window.getSelection()
    if (selection && !selection.isCollapsed && selection.containsNode(event.currentTarget, true)) return
    onAction(gift, 'gift-details')
  }

  return <section className="gift-table" aria-label="Сводная таблица желаний">
    {canFilterFree && <div className="gift-table__toolbar">
      <button type="button" className="pill" aria-pressed={onlyFree} aria-label="Только свободные желания"
        onClick={() => setOnlyFree(value => !value)}>{onlyFree ? 'Показать все' : 'Показать свободные'}</button>
    </div>}
    {!sortedGifts.length ? <p className="gift-table__empty" role="status">Свободных желаний нет.</p>
      : <div className="gift-table__scroll" tabIndex={0} role="region" aria-label="Таблица желаний, прокрутка по горизонтали">
      <table>
        <caption className="sr-only">{archived ? 'Архив желаний' : filterFree ? 'Свободные желания' : 'Выбранные желания'}: {sortedGifts.length}</caption>
        <thead><tr>
          {columns.map(column => <th key={column.key} scope="col"
            className={column.key === 'price' ? 'gift-table__price' : undefined}
            aria-sort={sort?.key === column.key ? sort.direction : 'none'}>
            <button type="button" className="gift-table__sort" onClick={() => changeSort(column.key)}
              aria-label={`${column.label}: сортировать по ${sort?.key === column.key && sort.direction === 'ascending' ? 'убыванию' : 'возрастанию'}`}>
              {column.label}<span aria-hidden="true">{sort?.key === column.key ? sort.direction === 'ascending' ? '↑' : '↓' : '↕'}</span>
            </button>
          </th>)}
          <th scope="col">Магазин</th>
        </tr></thead>
        <tbody>{sortedGifts.map(gift => {
          const link = safeLink(gift.details.url)
          const status = tableGiftStatus(gift)
          return <tr key={gift.id} onClick={event => openRow(event, gift)}>
            <th scope="row">
              <button type="button" className="gift-table__title" aria-haspopup="dialog"
                onClick={() => onAction(gift, 'gift-details')}>{gift.details.title}</button>
              {gift.details.comment && <p className="gift-table__comment">{gift.details.comment}</p>}
            </th>
            <td>{gift.owner.name}</td>
            <td className="gift-table__price">{formatPrice(gift.details.price) || <span className="gift-table__muted">Не указана</span>}</td>
            <td>{status ? <span className="gift-table__status" data-free={gift.participation?.mode === 'free' && !gift.archived}>{status}</span>
              : <span className="gift-table__muted" aria-label="Статус не отображается">—</span>}</td>
            <td>{link ? <a className="gift-table__shop" href={link} target="_blank" rel="noreferrer"
              aria-label={`Где купить: ${gift.details.title}`}>Где купить ↗</a> : <span className="gift-table__muted">—</span>}</td>
          </tr>
        })}</tbody>
      </table>
    </div>}
  </section>
}
