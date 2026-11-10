import { createHttpClient } from './http.js'

export function createDarimApi() {
  const http = createHttpClient()

  return {
    authInfo: signal => http.get('/api/auth-info', signal),
    me: signal => http.get('/api/me', signal),
    demoLogin: index => http.write(`/auth/demo/${index}`, 'POST'),
    logout: () => http.write('/api/logout', 'POST'),
    createCompany: name => http.write('/api/company', 'POST', { name }),
    joinCompany: token => http.write('/api/company/join?returnCompany=true', 'POST', { token }),
    issueInvite: companyId => http.write('/api/company/invite', 'POST', { companyId, maxUses: 1 }),
    gifts: (view, companyId, signal) => {
      if (view === 'mine') return http.get('/api/gifts/mine', signal)
      if (view === 'giving') return http.get('/api/gifts/giving', signal)
      return http.get(`/api/gifts?${new URLSearchParams({ companyId })}`, signal)
    },
    act: (id, action) => http.write(`/api/gifts/${id}/actions`, 'POST', action),
    saveGift: (id, gift) => id
      ? http.write(`/api/gifts/${id}`, 'PUT', gift)
      : http.write('/api/gifts', 'POST', gift),
    archiveGift: id => http.write(`/api/gifts/${id}/archive`, 'POST'),
    saveProfile: profile => http.write('/api/profile', 'PUT', profile),
  }
}
