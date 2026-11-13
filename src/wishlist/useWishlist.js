import { useEffect, useRef, useState } from 'react'
import { createDarimApi } from '../api/darim.js'
import { invitationToken } from './companyInvite.js'
import { useCardArtwork } from './useCardArtwork.js'

export function useWishlist(archived) {
  const [api, setApi] = useState(createDarimApi)
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState('board')
  const [companyId, setCompanyId] = useState('')
  const [session, setSession] = useState(null)
  const [result, setResult] = useState(null)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const busy = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const profile = api.me(signal).catch(error => {
      if (error.status === 401) return null
      throw error
    })
    Promise.all([api.authInfo(signal), profile]).then(([info, me]) => {
      if (!signal.aborted) setSession({ api, info, me })
    }).catch(error => {
      if (!signal.aborted) setSession({ api, error: error.message })
    })
    return () => controller.abort()
  }, [api])

  const current = session?.api === api ? session : null
  const me = current?.me
  const [artwork, updateArtworkImages] = useCardArtwork(session?.me?.user.id)
  const companies = me?.companies ?? (me?.company ? [me.company] : [])
  const company = companies.find(item => item.id === companyId) ?? companies[0]
  const activeView = view === 'board' && !company ? 'mine' : view
  const activeCompanyId = company?.id
  const queryView = archived ? 'archive' : activeView
  const queryCompanyId = archived ? undefined : activeCompanyId
  const queryKey = `${me?.user.id}/${queryView}/${queryCompanyId ?? ''}`

  useEffect(() => {
    if (!me) return
    const controller = new AbortController()
    const { signal } = controller
    api.gifts(queryView, queryCompanyId, signal).then(gifts => {
      if (!signal.aborted) setResult({ queryKey, gifts })
    }).catch(error => {
      if (signal.aborted) return
      if (error.status === 401) setApi(createDarimApi())
      else setResult({ queryKey, error: error.message })
    })
    return () => controller.abort()
  }, [api, me, queryView, queryCompanyId, queryKey, revision])

  const data = result?.queryKey === queryKey ? result : null

  async function run(request, refreshSession = false, resetUnauthorized = true) {
    if (busy.current) return false
    busy.current = true
    setPending(true)
    setActionError('')
    try {
      const response = await request(api)
      if (refreshSession) setApi(createDarimApi())
      else setRevision(value => value + 1)
      return { response }
    } catch (error) {
      setActionError(error.message)
      if (error.status === 401 && resetUnauthorized) setApi(createDarimApi())
      if (error.status === 409) setRevision(value => value + 1)
      return false
    } finally {
      setPending(false)
      busy.current = false
    }
  }

  function submitDialog({ kind, gift }, form) {
    const field = name => form.get(name)?.trim() || null
    if (kind === 'card-artwork') {
      return run(async client => {
        const file = form.get('artwork')
        if (!file?.size) throw new Error('Выберите PNG-файл.')
        if (file.size > 5 * 1024 * 1024) throw new Error('Размер PNG должен быть не больше 5 МБ.')
        const { id, category } = await client.uploadCardArtwork(field('category'), file)
        updateArtworkImages(images => [...images, { id, category }].sort((a, b) => a.id.localeCompare(b.id)))
      })
    }
    if (kind === 'create-company' || kind === 'join-company') {
      return run(async client => {
        const result = kind === 'create-company'
          ? await client.createCompany(field('name'))
          : await client.joinCompany(invitationToken(field('token')))
        setCompanyId(result.companyId)
        setView('board')
        return result
      }, true)
    }
    if (kind === 'invite-company') {
      return run(client => client.issueInvite(activeCompanyId))
    }
    if (kind === 'profile') {
      return run(client => client.saveProfile({ name: field('name'), contact: field('contact') }), true)
    }
    if (kind === 'create' || kind === 'edit') {
      const price = field('price')
      const url = field('url')
      const details = {
        title: field('title'),
        url: url && !/^[a-z][a-z\d+.-]*:\/\//i.test(url) ? `https://${url.replace(/^\/\//, '')}` : url,
        price: price === null ? null : Number(price),
        occasion: gift?.details.occasion,
        occasionDate: gift?.details.occasionDate,
        comment: field('comment'),
        unlimited: gift?.unlimited ?? form.has('unlimited'),
      }
      const companyIds = form.getAll('companyIds')
      const previousIds = gift?.visibility?.companyIds ?? []
      if (!gift || gift.visibility?.allCompanies ||
        companyIds.length !== previousIds.length || companyIds.some(id => !previousIds.includes(id))) {
        details.visibility = { allCompanies: false, companyIds }
      }
      if (form.has('removePhoto')) details.removePhoto = true
      const photo = form.get('photo')
      return run(client => client.saveGift(gift?.id, details, photo?.size ? photo : undefined))
    }
    if (kind === 'archive') return run(client => client.archiveGift(gift.id))
    return run(client => client.act(gift.id, {
      action: kind,
      companyId: activeView === 'board' ? activeCompanyId : undefined,
      slots: kind === 'split' ? Number(field('slots')) : undefined,
    }))
  }

  return {
    api,
    session: current,
    me,
    companies,
    company,
    view: activeView,
    setView,
    setCompanyId,
    data,
    artwork: me ? artwork : undefined,
    removeArtwork: id => run(async client => {
      await client.removeCardArtwork(id)
      updateArtworkImages(images => images.filter(image => image.id !== id))
    }),
    pending,
    actionError,
    submitDialog,
    restoreGift: id => run(client => client.restoreGift(id)),
    codeLogin: code => run(client => client.codeLogin(code), true, false),
    demoLogin: index => run(client => client.demoLogin(index), true),
    logout: () => run(client => client.logout(), true),
    refresh: () => setRevision(value => value + 1),
    retrySession: () => setApi(createDarimApi()),
  }
}
