import { useMemo, useState } from 'react'
import { BoardDialog } from './wishlist/BoardDialog.jsx'
import { BoardFilters, BoardHeading, BoardNavigation } from './wishlist/BoardHeader.jsx'
import { GiftShelf } from './wishlist/GiftShelf.jsx'
import { groupGifts } from './wishlist/giftPresentation.js'
import { useWishlist } from './wishlist/useWishlist.js'
import './wishlist/board.css'

const demoNames = ['Юлия', 'Макс', 'Аня', 'Саша']
const emptyGifts = []

function BoardAccess({ session, pending, error, retry, login }) {
  if (!session) return <p className="board-message page-inset" role="status">Загружаем доску…</p>
  if (session.error) return <div className="board-message page-inset">
    <p role="alert">{session.error}</p>
    <button type="button" className="pill" onClick={retry}>Повторить</button>
  </div>
  return <div className="board-message page-inset">
    <p>Войдите, чтобы увидеть желания друзей.</p>
    {session.info.telegramConfigured && <a className="pill" href="/auth/login">Войти через Telegram</a>}
    {session.info.demoEnabled && <div className="demo-logins" aria-label="Демонстрационные аккаунты">
      {demoNames.map((name, index) => <button className="pill" type="button" key={name}
        disabled={pending} onClick={() => login(index)}>{name}</button>)}
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>
}

export default function App() {
  const board = useWishlist()
  const { session, me, company, companies, view, data, pending, actionError } = board
  const [owner, setOwner] = useState('')
  const [occasion, setOccasion] = useState('')
  const [price, setPrice] = useState('')
  const [archived, setArchived] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [dialogError, setDialogError] = useState('')
  const gifts = data?.gifts ?? emptyGifts
  const occasions = useMemo(() => [...new Set(gifts.filter(gift => gift.archived === archived)
    .map(gift => gift.details.occasion).filter(Boolean))], [gifts, archived])
  const groups = useMemo(() => groupGifts(gifts.filter(gift => (
    gift.archived === archived &&
    (!owner || gift.owner.id === owner) &&
    (!occasion || gift.details.occasion === occasion) &&
    (!price || (gift.details.price != null && gift.details.price <= Number(price)))
  ))), [gifts, owner, occasion, price, archived])

  function resetFilters() {
    setOwner('')
    setOccasion('')
    setPrice('')
  }

  function navigate(next) {
    board.setView(next)
    setArchived(false)
    resetFilters()
  }

  function openDialog(kind, gift) {
    setDialogError('')
    setDialog({ kind, gift })
  }

  async function submit(form) {
    setDialogError('')
    if (await board.submitDialog(dialog, form)) {
      if (dialog.kind === 'create') navigate('mine')
      setDialog(null)
    } else {
      setDialogError('action')
    }
  }

  async function logout() {
    if (await board.logout()) {
      board.setCompanyId('')
      navigate('board')
    }
  }

  return (
    <>
      <BoardNavigation view={me ? view : 'board'} onView={navigate} company={company} me={me} pending={pending}
        archived={archived} onArchive={() => { setArchived(value => !value); resetFilters() }}
        onMenu={openDialog} onLogout={logout} />
      <main>
        <BoardHeading view={me ? view : 'board'} company={company} companies={companies}
          onCompany={id => { board.setCompanyId(id); navigate('board') }} />
        {!me ? <BoardAccess session={session} pending={pending} error={actionError} retry={board.retrySession}
          login={board.demoLogin} /> : <>
          <BoardFilters people={view === 'board' ? company.members : []} owner={owner} onOwner={setOwner}
            occasions={occasions} occasion={occasion} onOccasion={setOccasion} price={price} onPrice={setPrice} />
          {archived && <p className="board-message page-inset">Архив желаний</p>}
          {actionError && !dialog && <p className="board-error page-inset" role="alert">{actionError}</p>}
          {!data && <p className="board-message page-inset" role="status">Загружаем желания…</p>}
          {data?.error && <div className="board-message page-inset">
            <p role="alert">{data.error}</p>
            <button className="pill" type="button" onClick={board.refresh}>Повторить</button>
          </div>}
          {data?.gifts && !groups.length && <p className="board-message page-inset">Здесь пока нет желаний.</p>}
          {groups.map(group => <GiftShelf key={group.owner.id} title={`${group.owner.name} желает`}
            gifts={group.gifts} viewerId={me.user.id} canSplit={(company?.members.length ?? 0) >= 3}
            onAction={(gift, kind) => openDialog(kind, gift)} pending={pending} />)}
        </>}
      </main>
      {dialog && me && <BoardDialog dialog={dialog} me={me} company={company} pending={pending}
        error={dialogError ? actionError : ''} onClose={() => setDialog(null)} onSubmit={submit} />}
    </>
  )
}
