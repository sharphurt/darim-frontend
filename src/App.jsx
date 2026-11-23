import { useCallback, useEffect, useMemo, useState } from 'react'
import { CodeLogin } from './wishlist/CodeLogin.jsx'
import { AccountTools } from './wishlist/AccountTools.jsx'
import { BoardDialog } from './wishlist/BoardDialog.jsx'
import { BoardFilters, BoardHeading, BoardNavigation, WishlistCompanyFilter } from './wishlist/BoardHeader.jsx'
import { cardArtworkCollection } from './wishlist/cardArtwork.js'
import { GiftShelf } from './wishlist/GiftShelf.jsx'
import { GiftTable } from './wishlist/GiftTable.jsx'
import { clearInvite, inviteLink, pendingInvite } from './wishlist/companyInvite.js'
import { groupGifts, matchesGiftBudget, matchesWishlistCompany } from './wishlist/giftPresentation.js'
import { pendingNotificationLink, clearNotificationLink, resolveNotificationBoard, highlightNotificationCard } from './wishlist/notificationLink.js'
import { useWishlist } from './wishlist/useWishlist.js'
import { useMiniApp } from './wishlist/useMiniApp.js'
import './wishlist/board.css'

const demoNames = ['Юлия', 'Макс', 'Аня', 'Саша']
const emptyGifts = []
const cardHintKey = 'darim.mobile-card-hint-dismissed'
const displayModeKey = 'darim.wishlist-display-mode'

function BoardAccess({ session, pending, error, retry, login, codeLogin }) {
  if (!session) return <p className="board-message page-inset" role="status">Загружаем доску…</p>
  if (session.error) return <div className="board-message page-inset">
    <p role="alert">{session.error}</p>
    <button type="button" className="pill" onClick={retry}>Повторить</button>
  </div>
  return <section className="login-card" aria-labelledby="login-title">
    <h1 id="login-title">Добро пожаловать в Дарим</h1>
    {session.info.codeLoginEnabled && <CodeLogin botUsername={session.info.botUsername}
      pending={pending} onLogin={codeLogin} legacy={session.info.codeLoginLength !== 6} />}
    {!session.info.codeLoginEnabled && session.info.telegramConfigured &&
      <div className="demo-logins"><a href="/auth/login" className="pill">Войти через Telegram</a></div>}
    {!session.info.codeLoginEnabled && !session.info.telegramConfigured && !session.info.demoEnabled &&
      <p role="status">Вход пока недоступен. Попробуйте позже.</p>}
    {session.info.demoEnabled && <div className="demo-logins" aria-label="Демонстрационные аккаунты">
      {demoNames.map((name, index) => <button className="pill" type="button" key={name}
        disabled={pending} onClick={() => login(index)}>{name}</button>)}
    </div>}
    {error && <p role="alert">{error}</p>}
  </section>
}

export default function App() {
  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem(displayModeKey) === 'table' ? 'table' : 'cards'
    } catch {
      return 'cards'
    }
  })
  function changeDisplayMode(mode) {
    setDisplayMode(mode)
    try {
      localStorage.setItem(displayModeKey, mode)
    } catch {
      // Keep the selected mode for this visit when storage is unavailable.
    }
  }
  const [notificationLink, setNotificationLink] = useState(pendingNotificationLink)
  const [archived, setArchived] = useState(false)
  const board = useWishlist(archived)
  const { session, me, company, companies, view, data, pending, actionError, artwork } = board
  const managedCompanies = companies.filter(item => item.isOrganizer)
  const artworkImages = artwork?.images
  const collection = useMemo(() => cardArtworkCollection(artworkImages), [artworkImages])
  const [owner, setOwner] = useState('')
  const [budget, setBudget] = useState('')
  const [wishlistCompany, setWishlistCompany] = useState('')
  const [dialog, setDialog] = useState(() => {
    const outcome = new URLSearchParams(location.search).get('ohmywishes')
    return ['profile', 'connected', 'failed'].includes(outcome) ? { kind: 'profile', outcome } : null
  })
  useEffect(() => {
    const url = new URL(location.href)
    if (url.searchParams.has('ohmywishes')) {
      url.searchParams.delete('ohmywishes')
      history.replaceState(history.state, '', url)
    }
  }, [])
  const [cardHintDismissed, setCardHintDismissed] = useState(() => {
    try {
      return localStorage.getItem(cardHintKey) === 'true'
    } catch {
      return false
    }
  })
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
  const groups = useMemo(() => {
    if (archived) return loadedGifts.length ? [{ gifts: loadedGifts }] : []
    return groupGifts(gifts.filter(gift => !gift.archived && (view === 'mine'
      ? matchesWishlistCompany(gift.visibility, wishlistCompany)
      : (!owner || gift.owner.id === owner) && (view !== 'board' || matchesGiftBudget(gift, budget)))))
  }, [gifts, loadedGifts, view, wishlistCompany, owner, budget, archived])

  const { api, setCompanyId, setView } = board
  const [notificationTarget, setNotificationTarget] = useState(null)
  const [notificationStatus, setNotificationStatus] = useState('')
  const [notificationRetry, setNotificationRetry] = useState(0)
  const finishNotification = useCallback(() => {
    clearNotificationLink()
    setNotificationLink(null)
  }, [])

  useEffect(() => {
    if (!me || !notificationLink) return
    const controller = new AbortController()
    const { signal } = controller
    const target = notificationLink.kind === 'split'
      ? Promise.resolve({ view: 'giving' })
      : resolveNotificationBoard(notificationLink, api, me, signal)
    target.then(destination => {
      if (signal.aborted) return
      if (destination) {
        if (destination.companyId) setCompanyId(destination.companyId)
        setView(destination.view)
        setArchived(false)
        setOwner('')
        setWishlistCompany('')
        if (notificationLink.kind !== 'split') setDisplayMode('cards')
      }
      setNotificationTarget({ link: notificationLink, destination })
    }, () => {
      if (!signal.aborted) setNotificationStatus('retry')
    })
    return () => controller.abort()
  }, [api, me, notificationLink, notificationRetry, setCompanyId, setView])

  useEffect(() => {
    if (!notificationLink || notificationTarget?.link !== notificationLink) return
    const { destination } = notificationTarget
    if (destination && (view !== destination.view || archived || !data ||
      (destination.companyId && company?.id !== destination.companyId) ||
      (view !== 'giving' && (owner || displayMode !== 'cards')))) return

    const frame = requestAnimationFrame(() => {
      if (destination && data?.error) {
        setNotificationStatus('retry')
        return
      }
      if (notificationLink.kind === 'split') {
        const gift = data?.gifts?.find(item => item.id === notificationLink.id &&
          item.participation?.mode === 'split' && item.participation.isMine)
        if (gift) setDialog({ kind: 'split-details', gift, splitSnapshot: data })
        else setNotificationStatus('Этот распил больше недоступен.')
      } else {
        const isGift = notificationLink.kind === 'gift'
        const anchorId = isGift ? 'wishlist-gift-' + notificationLink.id : 'wishlist-owner-' + destination?.ownerId
        const anchor = destination && document.getElementById(anchorId)
        if (anchor) {
          const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
          anchor.focus({ preventScroll: true })
          anchor.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: isGift ? 'center' : 'start' })
          if (isGift) highlightNotificationCard(anchor, reducedMotion)
        } else {
          setNotificationStatus(isGift ? 'Это желание больше недоступно.' : 'На этой доске нет доступных желаний участника.')
        }
      }
      finishNotification()
    })
    return () => cancelAnimationFrame(frame)
  }, [notificationLink, notificationTarget, view, archived, data, company?.id, owner, displayMode, finishNotification])

  function resetFilters() {
    setBudget('')
    setOwner('')
    setWishlistCompany('')
  }

  function navigate(next) {
    if (notificationLink) finishNotification()
    setNotificationStatus('')
    board.setView(next)
    setArchived(false)
    resetFilters()
  }

  function dismissCardHint() {
    setCardHintDismissed(true)
    try {
      localStorage.setItem(cardHintKey, 'true')
    } catch {
      // The hint can still be dismissed for the current visit.
    }
  }

  function openDialog(kind, gift, { replace = false, managedCompany, initialVariantId } = {}) {
    setDialogError('')
    if (kind === 'gift-details' && !cardHintDismissed) dismissCardHint()
    const next = kind === 'split-details' ? { kind, gift, splitSnapshot: data }
      : { kind, gift, managedCompany, initialVariantId, initialVariantsVersion: gift?.variantsVersion,
        token: kind === 'join-company' ? inviteToken : undefined }
    setDialog(current => ({ ...next, previous: replace ? undefined : current }))
    if (kind === 'split-details') board.refresh()
  }

  async function handleGiftAction(gift, kind, initialVariantId) {
    if (kind === 'join') {
      setDialogError('')
      const result = await board.actOnGift(gift.id, 'join')
      if (result?.response?.participation?.isMine) {
        openDialog('split-details', result.response, { replace: true })
      } else if (!result) {
        setDialogError('action')
      }
      return
    }
    if (kind !== 'restore') return openDialog(kind, gift, { initialVariantId })
    if (await board.restoreGift(gift.id)) setDialog(current => current?.gift === gift ? null : current)
    else setDialogError('action')
  }

  function closeDialog() {
    setDialogError('')
    setDialog(current => current?.kind === 'create' ? { ...current, closing: true } : current?.previous ?? null)
  }
  useMiniApp(Boolean(dialog) && !pending, closeDialog)

  async function submit(form) {
    setDialogError('')
    const result = await board.submitDialog(displayedDialog, form)
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
      if (dialog.kind === 'delete-company') {
        if (company?.id === dialog.managedCompany.id) setOwner('')
        if (wishlistCompany === dialog.managedCompany.id) setWishlistCompany('')
        setDialog(managedCompanies.length > 1 ? dialog.previous : null)
        return
      }
      if (dialog.kind === 'split' && result.response?.participation?.isMine) {
        openDialog('split-details', result.response, { replace: true })
        return
      }
      const token = result.response?.token
      setDialog(token ? {
        kind: 'invite-result',
        link: inviteLink(token),
        managedCompany: dialog.managedCompany,
        previous: dialog.previous,
      } : null)
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
    setDialogError('')
    if (await board.logout()) {
      setDialog(null)
      board.setCompanyId('')
      navigate('board')
    } else {
      setDialogError('action')
    }
  }

  let displayedDialog = dialog
  if (dialog?.kind === 'split-details' && data !== dialog.splitSnapshot && data?.gifts) {
    const gift = loadedGifts.find(item => item.id === dialog.gift.id &&
      item.participation?.mode === 'split' && item.participation.isMine)
    displayedDialog = { ...dialog, gift }
  }

  if (dialog && ['gift-details', 'reserve', 'split'].includes(dialog.kind) && data?.gifts) {
    const gift = loadedGifts.find(item => item.id === dialog.gift.id)
    displayedDialog = { ...dialog, gift: gift ?? { ...dialog.gift, participation: null } }
  }

  return (
    <>
      {me && <BoardNavigation view={me ? view : 'board'} onView={navigate} company={company} me={me} pending={pending}
        canManageCompanies={managedCompanies.length > 0}
        displayMode={displayMode} onDisplayMode={changeDisplayMode}
        canManageArtwork={Array.isArray(artworkImages) && artwork.canManage}
        archived={archived} onArchive={() => { setArchived(value => !value); resetFilters() }}
        onMenu={openDialog} />}
      <main className={!me ? 'login-page' : undefined} data-display-mode={displayMode}>
        {me && <BoardHeading view={me ? view : 'board'} archived={archived} company={company} companies={companies}
          onCompany={id => { board.setCompanyId(id); navigate('board') }} />}
        {!me ? <BoardAccess session={session} pending={pending} error={actionError} retry={board.retrySession}
          login={board.demoLogin} codeLogin={board.codeLogin} /> : <>
          {inviteToken ? <div className="board-message page-inset">
            <p>У вас есть приглашение в компанию.</p>
            <div className="demo-logins">
              <button type="button" className="pill" onClick={() => openDialog('join-company')}>Принять приглашение</button>
              <button type="button" className="pill" onClick={dismissInvite}>Скрыть</button>
            </div>
          </div> : !company && <div className="board-message page-inset">
            <p>Общая доска появится после вступления в компанию по ссылке-приглашению.</p>
          </div>}
          {!archived && (view === 'mine'
            ? <WishlistCompanyFilter companies={companies} value={wishlistCompany} onChange={setWishlistCompany} />
            : view === 'board' && <BoardFilters people={company.members.filter(person => person.id !== viewerId)}
              owner={owner} onOwner={setOwner} budget={budget} onBudget={setBudget} />)}
          {actionError && !dialog && <p className="board-error page-inset" role="alert">{actionError}</p>}
          {!data && <p className="board-message page-inset" role="status">Загружаем желания…</p>}
          {data?.error && <div className="board-message page-inset">
            <p role="alert">{data.error}</p>
            <button className="pill" type="button" onClick={board.refresh}>Повторить</button>
          </div>}
          {notificationStatus && <div className="board-message page-inset" role="status">
            <p>{notificationStatus === 'retry' ? 'Не удалось открыть ссылку из уведомления.' : notificationStatus}</p>
            {notificationStatus === 'retry' && <button className="pill" type="button" onClick={() => {
              setNotificationStatus('')
              setNotificationTarget(null)
              board.refresh()
              setNotificationRetry(value => value + 1)
            }}>Повторить</button>}
          </div>}
          {data?.gifts && !groups.length && <p className="board-message board-empty">{view === 'board' && budget !== '' ? 'Нет желаний в этом бюджете' : 'Здесь пока нет желаний'}</p>}
          {displayMode === 'cards' && !cardHintDismissed && groups.length > 0 && <div className="mobile-card-hint page-inset">
            <div className="mobile-card-hint__message">
              <p>Нажмите на карточку, чтобы посмотреть детали желания.</p>
              <button type="button" className="pill" onClick={dismissCardHint}>Понятно</button>
            </div>
          </div>}
          {displayMode === 'table' ? groups.length > 0 && <GiftTable
            gifts={groups.flatMap(group => group.gifts)} archived={archived}
            canFilterFree={view === 'board' && !archived} onAction={handleGiftAction} />
            : groups.map(group => <GiftShelf key={archived ? 'archive' : group.owner.id}
            ownerId={archived ? undefined : group.owner.id}
            title={archived || view === 'mine' ? undefined : `${group.owner.name} желает`}
            label={archived ? 'Архив желаний' : undefined}
            gifts={group.gifts} viewerId={me.user.id} canSplit={(company?.members.length ?? 0) >= 3}
            onAction={handleGiftAction}
            pending={pending} artwork={collection} />)}
        </>}
      </main>
      {displayedDialog && me && (['notices', 'shares', 'requests'].includes(displayedDialog.kind)
        ? <AccountTools key={displayedDialog.kind} kind={displayedDialog.kind} api={board.api} companies={companies} onClose={closeDialog} />
        : <BoardDialog key={displayedDialog.kind} dialog={displayedDialog} me={me} company={company} companies={companies} pending={pending}
        ohmywishesApi={board.api} importCompany={view === 'board' && !archived ? company : undefined} onGiftsChanged={board.refresh}
        artworkCatalog={collection.catalog} onRemoveArtwork={removeArtwork}
        onLogout={logout}
        managedCompanies={managedCompanies}
        onCompanyAction={(kind, item) => openDialog(kind, undefined, { managedCompany: item })}
        error={dialogError ? actionError : ''} onClose={closeDialog} onClosed={finishClosingDialog} onSubmit={submit}
        onGiftAction={openDialog} onCardAction={handleGiftAction} canSplit={(company?.members.length ?? 0) >= 3} />)}
    </>
  )
}
