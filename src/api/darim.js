import { createHttpClient } from './http.js'

function encodePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1))
    reader.onerror = () => reject(new Error('Не удалось прочитать фото.'))
    reader.readAsDataURL(file)
  })
}

export function createDarimApi() {
  const http = createHttpClient()

  return {
    authInfo: signal => http.get('/api/auth-info', signal),
    me: signal => http.get('/api/me', signal),
    cardArtwork: signal => http.get('/api/card-artwork', signal),
    uploadCardArtwork: (category, file) => http.write(`/api/card-artwork/${encodeURIComponent(category)}`, 'POST', file, 'image/png'),
    removeCardArtwork: id => http.write(`/api/card-artwork/${encodeURIComponent(id)}`, 'DELETE'),
    demoLogin: index => http.write(`/auth/demo/${index}`, 'POST'),
    logout: () => http.write('/api/logout', 'POST'),
    createCompany: name => http.write('/api/company', 'POST', { name }),
    joinCompany: token => http.write('/api/company/join?returnCompany=true', 'POST', { token }),
    issueInvite: companyId => http.write('/api/company/invite', 'POST', { companyId, maxUses: 1 }),
    gifts: (view, companyId, signal) => {
      if (view === 'mine') return http.get('/api/gifts/mine', signal)
      if (view === 'giving') return http.get('/api/gifts/giving', signal)
      return http.get(`/api/gifts?${new URLSearchParams({ companyId, includeMine: 'false' })}`, signal)
    },
    act: (id, action) => http.write(`/api/gifts/${id}/actions`, 'POST', action),
    async saveGift(id, gift, photo) {
      const body = photo ? { ...gift, photo: await encodePhoto(photo) } : gift
      return id ? http.write(`/api/gifts/${id}`, 'PUT', body) : http.write('/api/gifts', 'POST', body)
    },
    archiveGift: id => http.write(`/api/gifts/${id}/archive`, 'POST'),
    restoreGift: id => http.write(`/api/gifts/${id}/restore`, 'POST'),
    saveProfile: profile => http.write('/api/profile', 'PUT', profile),
  }
}
