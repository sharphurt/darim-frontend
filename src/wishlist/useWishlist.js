import { useEffect, useRef, useState } from 'react'
import { createDarimApi } from '../api/darim.js'

export function useWishlist() {
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
  const companies = me?.companies ?? (me?.company ? [me.company] : [])
  const company = companies.find(item => item.id === companyId) ?? companies[0]
  const activeView = view === 'board' && !company ? 'mine' : view
  const activeCompanyId = company?.id
  const queryKey = `${me?.user.id}/${activeView}/${activeCompanyId ?? ''}`

  useEffect(() => {
    if (!me) return
    const controller = new AbortController()
    const { signal } = controller
    api.gifts(activeView, activeCompanyId, signal).then(gifts => {
      if (!signal.aborted) setResult({ queryKey, gifts })
    }).catch(error => {
      if (signal.aborted) return
      if (error.status === 401) setApi(createDarimApi())
      else setResult({ queryKey, error: error.message })
    })
    return () => controller.abort()
  }, [api, me, activeView, activeCompanyId, queryKey, revision])

  const data = result?.queryKey === queryKey ? result : null

  async function run(request, refreshSession = false) {
    if (busy.current) return false
    busy.current = true
    setPending(true)
    setActionError('')
    try {
      await request(api)
      if (refreshSession) setApi(createDarimApi())
      else setRevision(value => value + 1)
      return true
    } catch (error) {
      setActionError(error.message)
      if (error.status === 401) setApi(createDarimApi())
      if (error.status === 409) setRevision(value => value + 1)
      return false
    } finally {
      setPending(false)
      busy.current = false
    }
  }

  function submitDialog({ kind, gift }, form) {
    const field = name => form.get(name)?.trim() || null
    if (kind === 'profile') {
      return run(client => client.saveProfile({ name: field('name'), contact: field('contact') }), true)
    }
    if (kind === 'create' || kind === 'edit') {
      const price = field('price')
      const details = {
        title: field('title'),
        url: field('url'),
        price: price === null ? null : Number(price),
        occasion: field('occasion') ?? 'Без повода',
        occasionDate: field('occasionDate'),
        comment: field('comment'),
        unlimited: gift?.unlimited ?? form.has('unlimited'),
      }
      if (!gift) {
        details.visibility = {
          allCompanies: false,
          companyIds: form.has('publish') && activeCompanyId ? [activeCompanyId] : [],
        }
      }
      return run(client => client.saveGift(gift?.id, details))
    }
    if (kind === 'archive') return run(client => client.archiveGift(gift.id))
    return run(client => client.act(gift.id, {
      action: kind,
      companyId: activeView === 'board' ? activeCompanyId : undefined,
      slots: kind === 'split' ? Number(field('slots')) : undefined,
    }))
  }

  return {
    session: current,
    me,
    companies,
    company,
    view: activeView,
    setView,
    setCompanyId,
    data,
    pending,
    actionError,
    submitDialog,
    demoLogin: index => run(client => client.demoLogin(index), true),
    logout: () => run(client => client.logout(), true),
    refresh: () => setRevision(value => value + 1),
    retrySession: () => setApi(createDarimApi()),
  }
}
