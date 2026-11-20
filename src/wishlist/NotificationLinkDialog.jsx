import { useEffect, useRef, useState } from 'react'
import { GiftBackContent } from './GiftCard.jsx'
import { SplitDetails } from './GiftSplit.jsx'

function giftLink(id) {
  return '/?' + new URLSearchParams({ open: 'gift', id })
}

async function loadTarget({ kind, id }, api, me, signal) {
  const companies = me.companies ?? (me.company ? [me.company] : [])
  const find = gifts => gifts.find(gift => gift.id === id)
  if (kind === 'person' || kind === 'owner') {
    const shared = companies.filter(company => company.members.some(person => person.id === id))
    const person = id === me.user.id ? me.user : shared[0]?.members.find(member => member.id === id)
    if (!person) return {}
    const boards = id === me.user.id ? [await api.gifts('mine', undefined, signal)]
      : await Promise.all(shared.map(company => api.gifts('board', company.id, signal)))
    const gifts = new Map(boards.flat().filter(gift => !gift.archived && gift.owner.id === id)
      .map(gift => [gift.id, gift]))
    return { person, gifts: [...gifts.values()] }
  }
  const giving = find(await api.gifts('giving', undefined, signal))
  if (kind === 'split') {
    return giving?.participation?.mode === 'split' && giving.participation.isMine ? { gift: giving } : {}
  }
  if (giving) return { gift: giving }
  const own = find(await api.gifts('mine', undefined, signal))
  if (own) return { gift: own }
  const boards = await Promise.all(companies.map(company => api.gifts('board', company.id, signal)))
  return { gift: find(boards.flat()) }
}

export function NotificationLinkDialog({ link, api, me, onClose }) {
  const ref = useRef(null)
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => { ref.current.showModal() }, [])
  useEffect(() => {
    const controller = new AbortController()
    loadTarget(link, api, me, controller.signal).then(value => {
      if (!controller.signal.aborted) setResult(value)
    }, () => {
      if (!controller.signal.aborted) setResult({ error: true })
    })
    return () => controller.abort()
  }, [link, api, me, retry])

  const { person, gift, gifts, error } = result ?? {}
  const heading = link.kind === 'split' ? 'Детали распила' : ['person', 'owner'].includes(link.kind) ? 'Профиль участника' : 'Желание'
  return <dialog ref={ref} className="board-dialog board-dialog--gift-details"
    aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <section className="gift-details__panel">
      <div className="gift-details__content" tabIndex={0}>
        {gift && link.kind === 'gift' ? <>
          <GiftBackContent gift={gift} modal />
          <p>Автор желания: {gift.owner.name}</p>
          {gift.archived && <p>Желание в архиве.</p>}
        </> : <>
          <h2 id="dialog-title">{person?.name ?? heading}</h2>
          {gift && <SplitDetails gift={gift} />}
        </>}
        {person && (gifts.length ? <ul aria-label="Желания участника">
          {gifts.map(item => <li key={item.id}><a href={giftLink(item.id)}>{item.details.title}</a></li>)}
        </ul> : <p>У участника пока нет доступных желаний.</p>)}
        {!result && <p role="status">Открываем ссылку…</p>}
        {error && <><p role="alert">Не удалось открыть ссылку.</p>
          <button className="pill" type="button" onClick={() => { setResult(null); setRetry(value => value + 1) }}>Повторить</button></>}
        {result && !error && !gift && !person && <p>{link.kind === 'gift'
          ? 'Желание больше недоступно. Возможно, его убрали в архив или изменили видимость.'
          : link.kind === 'split' ? 'Детали распила больше недоступны.' : 'Профиль участника недоступен.'}</p>}
      </div>
      <footer><button className="gift-action" type="button" onClick={onClose}>К доске желаний</button></footer>
    </section>
  </dialog>
}
