import { useMemo, useState } from 'react'
import { formatPrice, safeLink } from './giftPresentation.js'
import { sortTableGifts, tableGiftStatus } from './giftTableSorting.js'
import './giftTable.css'

const columns = [
  { key: 'title', label: 'Желание' },
  { key: 'owner', label: 'Кто желает' },
  { key: 'price', label: 'Цена' },
  { key: 'status', label: 'Статус' },
]

export function GiftTable({ gifts, archived, onAction }) {
  const [sort, setSort] = useState(null)
  const sortedGifts = useMemo(() => sortTableGifts(gifts, sort), [gifts, sort])

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
    <div className="gift-table__summary">
      <h2>{archived ? 'Архив желаний' : 'Все выбранные желания'}</h2>
      <span>Всего: {gifts.length}</span>
    </div>
    <div className="gift-table__scroll" tabIndex={0} role="region" aria-label="Таблица желаний, прокрутка по горизонтали">
      <table>
        <caption className="sr-only">{archived ? 'Архив желаний' : 'Выбранные желания'}: {gifts.length}</caption>
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
    </div>
  </section>
}
