import { useCallback, useMemo, useState } from 'react'
import { BoardDialog } from './wishlist/BoardDialog.jsx'
import { BoardFilters, BoardHeading, BoardNavigation, WishlistCompanyFilter } from './wishlist/BoardHeader.jsx'
import { cardArtworkCollection } from './wishlist/cardArtwork.js'
import { GiftShelf } from './wishlist/GiftShelf.jsx'
import { clearInvite, inviteLink, pendingInvite, retainInvite } from './wishlist/companyInvite.js'
import { groupGifts, matchesWishlistCompany } from './wishlist/giftPresentation.js'
import { useWishlist } from './wishlist/useWishlist.js'
import './wishlist/board.css'

const demoNames = ['Юлия', 'Макс', 'Аня', 'Саша']
const emptyGifts = []

function BoardAccess({ session, pending, error, retry, login, inviteToken }) {
  if (!session) return <p className="board-message page-inset" role="status">Загружаем доску…</p>
  if (session.error) return <div className="board-message page-inset">
    <p role="alert">{session.error}</p>
    <button type="button" className="pill" onClick={retry}>Повторить</button>
  </div>
  return <div className="board-message page-inset">
    <p>Войдите, чтобы увидеть желания друзей.</p>
    {session.info.telegramConfigured && <a className="pill" href="/auth/login"
      onClick={() => retainInvite(inviteToken)}>Войти через Telegram</a>}
    {session.info.demoEnabled && <div className="demo-logins" aria-label="Демонстрационные аккаунты">
      {demoNames.map((name, index) => <button className="pill" type="button" key={name}
        disabled={pending} onClick={() => login(index)}>{name}</button>)}
    </div>}
    {error && <p role="alert">{error}</p>}
  </div>
}

export default function App() {
  const board = useWishlist()
  const { session, me, company, companies, view, data, pending, actionError, artwork } = board
  const artworkImages = artwork?.images
  const collection = useMemo(() => cardArtworkCollection(artworkImages), [artworkImages])
  const [owner, setOwner] = useState('')
  const [occasion, setOccasion] = useState('')
  const [price, setPrice] = useState('')
  const [wishlistCompany, setWishlistCompany] = useState('')
  const [archived, setArchived] = useState(false)
  const [dialog, setDialog] = useState(null)
  const finishClosingDialog = useCallback(() => {
    setDialog(current => current?.closing ? null : current)
  }, [])
  const [dialogError, setDialogError] = useState('')
  const [inviteToken, setInviteToken] = useState(pendingInvite)
  const loadedGifts = data?.gifts ?? emptyGifts
  const viewerId = me?.user.id
  // Older Darim deployments ignore includeMine.
  const gifts = useMemo(() => view === 'board'
    ? loadedGifts.filter(gift => gift.owner.id !== viewerId)
    : loadedGifts, [loadedGifts, view, viewerId])
  const occasions = useMemo(() => [...new Set(gifts.filter(gift => gift.archived === archived)
    .map(gift => gift.details.occasion).filter(Boolean))], [gifts, archived])
  const groups = useMemo(() => groupGifts(gifts.filter(gift => (
    gift.archived === archived &&
    (view === 'mine'
      ? matchesWishlistCompany(gift.visibility, wishlistCompany)
      : (!owner || gift.owner.id === owner) &&
        (!occasion || gift.details.occasion === occasion) &&
        (!price || (gift.details.price != null && gift.details.price <= Number(price))))
  ))), [gifts, view, wishlistCompany, owner, occasion, price, archived])

  function resetFilters() {
    setOwner('')
    setOccasion('')
    setPrice('')
    setWishlistCompany('')
  }

  function navigate(next) {
    board.setView(next)
    setArchived(false)
    resetFilters()
  }

  function openDialog(kind, gift) {
    setDialogError('')
    if (kind === 'split-details') {
      setDialog({ kind, gift, splitSnapshot: data })
      board.refresh()
      return
    }
    setDialog({ kind, gift, token: kind === 'join-company' ? inviteToken : undefined })
  }

  function closeDialog() {
    setDialog(current => current?.kind === 'create' ? { ...current, closing: true } : null)
  }

  async function submit(form) {
    setDialogError('')
    const result = await board.submitDialog(dialog, form)
    if (result) {
      if (dialog.kind === 'card-artwork') {
        setDialog({ ...dialog, uploaded: (dialog.uploaded ?? 0) + 1, artworkStatus: 'Изображение добавлено.' })
        return
      }
      if (dialog.kind === 'create') {
        navigate('mine')
        closeDialog()
        return
      }
      if (dialog.kind === 'create-company' || dialog.kind === 'join-company') navigate('board')
      if (dialog.kind === 'join-company' && inviteToken) dismissInvite()
      if (['split', 'join'].includes(dialog.kind) && result.response?.participation?.isMine) {
        openDialog('split-details', result.response)
        return
      }
      const token = result.response?.token
      setDialog(token ? { kind: 'invite-result', link: inviteLink(token) } : null)
    } else {
      setDialogError('action')
    }
  }

  async function removeArtwork(id) {
    setDialogError('')
    if (await board.removeArtwork(id)) {
      setDialog({ ...dialog, artworkStatus: 'Изображение удалено.' })
    } else {
      setDialogError('action')
    }
  }

  function dismissInvite() {
    clearInvite()
    setInviteToken('')
  }

  async function logout() {
    if (await board.logout()) {
      board.setCompanyId('')
      navigate('board')
    }
  }

  let displayedDialog = dialog
  if (dialog?.kind === 'split-details' && data !== dialog.splitSnapshot && data?.gifts) {
    const gift = loadedGifts.find(item => item.id === dialog.gift.id &&
      item.participation?.mode === 'split' && item.participation.isMine)
    displayedDialog = { ...dialog, gift }
  }

  return (
    <>
      <BoardNavigation view={me ? view : 'board'} onView={navigate} company={company} me={me} pending={pending}
        canManageArtwork={Array.isArray(artworkImages) && artwork.canManage}
        archived={archived} onArchive={() => { setArchived(value => !value); resetFilters() }}
        onMenu={openDialog} onLogout={logout} />
      <main>
        <BoardHeading view={me ? view : 'board'} company={company} companies={companies}
          onCompany={id => { board.setCompanyId(id); navigate('board') }} />
        {!me ? <BoardAccess session={session} pending={pending} error={actionError} retry={board.retrySession}
          login={board.demoLogin} inviteToken={inviteToken} /> : <>
          {inviteToken ? <div className="board-message page-inset">
            <p>У вас есть приглашение в компанию.</p>
            <div className="demo-logins">
              <button type="button" className="pill" onClick={() => openDialog('join-company')}>Принять приглашение</button>
              <button type="button" className="pill" onClick={dismissInvite}>Скрыть</button>
            </div>
          </div> : !company && <div className="board-message page-inset">
            <p>Создайте компанию или вступите по приглашению, чтобы увидеть общую доску.</p>
            <div className="demo-logins">
              <button type="button" className="pill" onClick={() => openDialog('create-company')}>Создать компанию</button>
              <button type="button" className="pill" onClick={() => openDialog('join-company')}>Вступить по приглашению</button>
            </div>
          </div>}
          {view === 'mine'
            ? <WishlistCompanyFilter companies={companies} value={wishlistCompany} onChange={setWishlistCompany} />
            : <BoardFilters people={view === 'board' ? company.members.filter(person => person.id !== viewerId) : []} owner={owner} onOwner={setOwner}
              occasions={occasions} occasion={occasion} onOccasion={setOccasion} price={price} onPrice={setPrice} />}
          {archived && <p className="board-message page-inset">Архив желаний</p>}
          {actionError && !dialog && <p className="board-error page-inset" role="alert">{actionError}</p>}
          {!data && <p className="board-message page-inset" role="status">Загружаем желания…</p>}
          {data?.error && <div className="board-message page-inset">
            <p role="alert">{data.error}</p>
            <button className="pill" type="button" onClick={board.refresh}>Повторить</button>
          </div>}
          {data?.gifts && !groups.length && <p className="board-message page-inset">Здесь пока нет желаний.</p>}
          {groups.map(group => <GiftShelf key={group.owner.id} title={view === 'mine' ? undefined : `${group.owner.name} желает`}
            gifts={group.gifts} viewerId={me.user.id} canSplit={(company?.members.length ?? 0) >= 3}
            onAction={(gift, kind) => openDialog(kind, gift)} pending={pending} artwork={collection} />)}
        </>}
      </main>
      {displayedDialog && me && <BoardDialog dialog={displayedDialog} me={me} company={company} companies={companies} pending={pending}
        artworkCatalog={collection.catalog} onRemoveArtwork={removeArtwork}
        error={dialogError ? actionError : ''} onClose={closeDialog} onClosed={finishClosingDialog} onSubmit={submit}
        onGiftAction={openDialog} />}
    </>
  )
}
