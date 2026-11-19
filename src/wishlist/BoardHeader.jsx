import { useRef, useState } from 'react'
import menuIcon from '../assets/menu.svg'
import wishPlusLeft from '../assets/wish-plus-left.svg'
import wishPlusRight from '../assets/wish-plus-right.svg'

const viewNames = { board: 'Доска желаний', mine: 'Мой вишлист', giving: 'Я дарю' }
const archiveName = 'Архив желаний'

export function BoardNavigation({ view, onView, company, me, pending, archived, onArchive, onMenu, canManageArtwork, canManageCompanies, displayMode, onDisplayMode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuToggle = useRef(null)
  function closeMenu() {
    menuToggle.current.focus()
    setMenuOpen(false)
  }
  function choose(action) {
    closeMenu()
    action()
  }

  return (
    <header className={me ? 'board-nav board-nav--dock' : 'board-nav'}>
      <nav aria-label="Разделы">
        {Object.entries(viewNames).map(([value, label]) => (
          <button key={value} type="button" className="board-nav__tab" aria-current={!archived && view === value ? 'page' : undefined}
            disabled={!me || (value === 'board' && !company)} onClick={() => onView(value)}>{label}</button>
        ))}
      </nav>
      {me && <button type="button" className="gift-action gift-action--primary board-nav__create"
        aria-label="Загадать желание" disabled={pending} onClick={() => onMenu('create')}>
        <img src={wishPlusLeft} width="24" height="24" alt="" />
        <span className="board-nav__create-label">Загадать желание</span>
        <img className="board-nav__create-plus-right" src={wishPlusRight} width="24" height="24" alt="" />
      </button>}
      {me && <div className="board-menu" onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
      }} onKeyDown={event => {
        if (menuOpen && event.key === 'Escape') closeMenu()
      }}>
        <button type="button" className="board-menu__toggle board-nav__notices" aria-label="Уведомления" aria-haspopup="dialog" onClick={() => {
          setMenuOpen(false)
          onMenu('notices')
        }}>
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 10h18c0-3-3-3-3-10m-8 13a2 2 0 0 0 4 0" />
          </svg>
        </button>
        <button ref={menuToggle} type="button" className="board-menu__toggle" aria-label="Меню"
          aria-expanded={menuOpen} aria-controls="board-menu-panel"
          onClick={() => setMenuOpen(open => !open)}><img src={menuIcon} width="32" height="32" alt="" /></button>
        <div id="board-menu-panel" className="board-menu__panel" inert={!menuOpen}>
          <div className="board-menu__display">
            <span id="display-mode-label">Отображение желаний</span>
            <div className="board-menu__display-options" role="group" aria-labelledby="display-mode-label">
              <button type="button" aria-pressed={displayMode === 'cards'}
                onClick={() => choose(() => onDisplayMode('cards'))}>Карточки</button>
              <button type="button" aria-pressed={displayMode === 'table'}
                onClick={() => choose(() => onDisplayMode('table'))}>Таблица</button>
            </div>
          </div>
          {canManageCompanies && <button type="button" aria-haspopup="dialog" onClick={() => choose(() => onMenu('manage-companies'))}>
            Управление компаниями
          </button>}
          <button type="button" className="board-menu__notices" aria-haspopup="dialog"
            onClick={() => choose(() => onMenu('notices'))}>Уведомления</button>
          {canManageArtwork && <button type="button" onClick={() => choose(() => onMenu('card-artwork'))}>Фоны и узоры</button>}
          <button type="button" onClick={() => choose(onArchive)}>{archived ? 'Активные желания' : archiveName}</button>
          <button type="button" onClick={() => choose(() => onMenu('profile'))}>Мой профиль</button>
        </div>
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

export function BoardHeading({ view, archived, company, companies, onCompany }) {
  const showCompany = !archived && view === 'board' && company
  return (
    <div className="board-heading" data-view={archived ? 'archive' : view}>
      <h1>{archived ? archiveName : viewNames[view]}</h1>
      {showCompany && (companies.length === 1
        ? <span className="company-picker company-picker__name">{company.name}</span>
        : <label className="company-picker">
          <span className="company-picker__name" aria-hidden="true">{company.name}</span>
          <span className="company-picker__chevron" aria-hidden="true" />
          <BoardSelect label="Компания" value={company.id} onChange={onCompany}>
            {companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </BoardSelect>
        </label>)}
    </div>
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

export function BoardFilters({ people, owner, onOwner }) {
  return (
    <div className="board-filters">
      {people.length > 0 && <FilterTabs label="Участники" value={owner} onChange={onOwner}
        options={[{ id: '', name: 'ПОЛНЫЙ СОСТАВ' }, ...people]} />}
    </div>
  )
}
