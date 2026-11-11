import { useState } from 'react'
import chevron from '../assets/chevron.svg'
import menuIcon from '../assets/menu.svg'
import wishPlusLeft from '../assets/wish-plus-left.svg'
import wishPlusRight from '../assets/wish-plus-right.svg'

const viewNames = { board: 'Доска желаний', mine: 'Мой вишлист', giving: 'Я дарю' }

export function BoardNavigation({ view, onView, company, me, pending, archived, onArchive, onMenu, onLogout, canManageArtwork }) {
  const [menuOpen, setMenuOpen] = useState(false)
  function choose(action) {
    setMenuOpen(false)
    action()
  }

  return (
    <header className="board-nav">
      <nav aria-label="Разделы">
        {Object.entries(viewNames).map(([value, label]) => (
          <button key={value} type="button" className="board-nav__tab" aria-current={view === value ? 'page' : undefined}
            disabled={!me || (value === 'board' && !company)} onClick={() => onView(value)}>{label}</button>
        ))}
      </nav>
      {me && <button type="button" className="gift-action gift-action--primary board-nav__create"
        disabled={pending} onClick={() => onMenu('create')}>
        <img src={wishPlusLeft} width="24" height="24" alt="" />
        <span>Загадать желание</span>
        <img src={wishPlusRight} width="24" height="24" alt="" />
      </button>}
      {me && <div className="board-menu" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
      }} onKeyDown={event => {
        if (event.key === 'Escape') {
          event.currentTarget.querySelector('.board-menu__toggle').focus()
          setMenuOpen(false)
        }
      }}>
        <button type="button" className="board-menu__toggle" aria-label="Меню" aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}><img src={menuIcon} width="32" height="32" alt="" /></button>
        {menuOpen && <div className="board-menu__panel">
          <button type="button" onClick={() => choose(() => onMenu('create-company'))}>Создать компанию</button>
          <button type="button" onClick={() => choose(() => onMenu('join-company'))}>Вступить по приглашению</button>
          {company?.isOrganizer && <button type="button" onClick={() => choose(() => onMenu('invite-company'))}>
            Пригласить участника
          </button>}
          <button type="button" onClick={() => choose(() => onMenu('profile'))}>Мой профиль</button>
          {canManageArtwork && <button type="button" onClick={() => choose(() => onMenu('card-artwork'))}>Фоны и узоры</button>}
          <button type="button" onClick={() => choose(onArchive)}>{archived ? 'Активные желания' : 'Архив желаний'}</button>
          <button type="button" disabled={pending} onClick={() => choose(onLogout)}>Выйти</button>
        </div>}
      </div>}
    </header>
  )
}

function BoardSelect({ label, value, onChange, children }) {
  const [pointerFocus, setPointerFocus] = useState(false)

  return (
    <select aria-label={label} value={value} onChange={event => onChange(event.target.value)}
      data-pointer-focus={pointerFocus ? '' : undefined}
      onPointerDown={() => setPointerFocus(true)}
      onKeyDown={() => setPointerFocus(false)}
      onBlur={() => setPointerFocus(false)}>
      {children}
    </select>
  )
}

export function BoardHeading({ view, company, companies, onCompany }) {
  return (
    <div className="board-heading" data-view={view}>
      <h1>{viewNames[view]}</h1>
      {view === 'board' && company && <label className="company-picker">
        <span className="company-picker__name" aria-hidden="true">{company.name}</span>
        <img src={chevron} alt="" width="64" height="64" />
        <BoardSelect label="Компания" value={company.id} onChange={onCompany}>
          {companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </BoardSelect>
      </label>}
    </div>
  )
}

function FilterSelect({ label, value, options, onChange, kind }) {
  return (
    <label className={`pill filter-select filter-select--${kind}`} data-active={Boolean(value)}>
      <BoardSelect label={label} value={value} onChange={onChange}>
        <option value="">{label}</option>
        {options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </BoardSelect>
      <img src={chevron} width="16" height="16" alt="" />
    </label>
  )
}

function FilterTabs({ label, options, value, onChange }) {
  return <div className="board-filters__tabs" role="group" aria-label={label}>
    {options.map(option => <button className="pill" type="button" key={option.id}
      aria-pressed={value === option.id} onClick={() => onChange(option.id)}>{option.name}</button>)}
  </div>
}

export function WishlistCompanyFilter({ companies, value, onChange }) {
  const options = [{ id: '', name: 'Все компании' }, ...companies, { id: 'private', name: 'Только мне' }]
  return <div className="board-filters board-filters--wishlist">
    <FilterTabs label="Компании" options={options} value={value} onChange={onChange} />
  </div>
}

export function BoardFilters({ people, owner, onOwner, occasions, occasion, onOccasion, price, onPrice }) {
  return (
    <div className="board-filters">
      {people.length > 0 && <FilterTabs label="Участники" value={owner} onChange={onOwner}
        options={[{ id: '', name: 'ПОЛНЫЙ СОСТАВ' }, ...people]} />}
      <div className="board-filters__selects">
        <FilterSelect kind="occasion" label="Поводы" value={occasion} options={occasions.map(value => [value, value])} onChange={onOccasion} />
        <FilterSelect kind="price" label="Цена" value={price} onChange={onPrice} options={[
          ['5000', 'До 5 000 ₽'], ['10000', 'До 10 000 ₽'], ['20000', 'До 20 000 ₽'],
        ]} />
      </div>
    </div>
  )
}
