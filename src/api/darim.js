import { createHttpClient } from './http.js'
import { initializeMiniSession, miniToken, closeMiniSession } from './miniSession.js'

function encodePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.slice(reader.result.indexOf(',') + 1))
    reader.onerror = () => reject(new Error('Не удалось прочитать фото.'))
    reader.readAsDataURL(file)
  })
}

export function createDarimApi() {
  const http = createHttpClient({ token: miniToken })

  return {
    ready: initializeMiniSession,
    publicWishlist: (token, signal) => createHttpClient().get('/api/public/wishlist', signal, { Authorization: `Wishlist ${token}` }),
    authInfo: signal => http.get('/api/auth-info', signal),
    me: signal => http.get('/api/me', signal),
    cardArtwork: signal => http.get('/api/card-artwork', signal),
    uploadCardArtwork: (category, file) => http.write(`/api/card-artwork/${encodeURIComponent(category)}`, 'POST', file, 'image/png'),
    removeCardArtwork: id => http.write(`/api/card-artwork/${encodeURIComponent(id)}`, 'DELETE'),
    codeLogin: code => http.write('/auth/code', 'POST', { code }),
    demoLogin: index => http.write(`/auth/demo/${index}`, 'POST'),
    logout: () => miniToken() ? Promise.resolve(closeMiniSession()) : http.write('/api/logout', 'POST'),
    notices: signal => http.get('/api/notices', signal),
    readNotices: () => http.write('/api/notices/read', 'POST'),
    interests: signal => http.get('/api/wishlist-interest', signal),
    notifyGuest: id => http.write(`/api/wishlist-interest/${id}/notify`, 'POST'),
    shareLinks: signal => http.get('/api/wishlist-links', signal),
    createShare: input => http.write('/api/wishlist-links', 'POST', input),
    revokeShare: id => http.write(`/api/wishlist-links/${id}`, 'DELETE'),
    guestRequests: signal => http.get('/api/wishlist-requests', signal),
    withdrawRequest: id => http.write(`/api/wishlist-requests/${id}`, 'DELETE'),
    requestGift: (id, token, shareUsername) => http.write(`/api/wishlist-links/gifts/${id}/request`, 'POST', { token, shareUsername }),
    createCompany: name => http.write('/api/company', 'POST', { name }),
    joinCompany: token => http.write('/api/company/join?returnCompany=true', 'POST', { token }),
    issueInvite: (companyId, maxUses = 1) => http.write('/api/company/invite', 'POST', { companyId, maxUses }),
    gifts: (view, companyId, signal) => {
      if (view === 'archive') return Promise.all([
        http.get('/api/gifts/mine', signal),
        http.get('/api/gifts/giving', signal),
      ]).then(([mine, giving]) => [...mine, ...giving].filter(gift => gift.archived))
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
    ohmywishesStatus: signal => http.get('/api/ohmywishes', signal),
    syncOhmywishes: () => http.write('/api/ohmywishes/sync', 'POST'),
    ohmywishesLists: () => http.get('/api/ohmywishes/lists'),
    connectOhmywishes: () => http.write('/api/ohmywishes/connect', 'POST'),
    connectOhmywishesByLink: (url, companyId) => http.write('/api/ohmywishes/web-connect', 'POST', { url, companyId }),
    selectOhmywishesList: (listId, companyId) => http.write('/api/ohmywishes/list', 'PUT', { listId, companyId }),
    disconnectOhmywishes: () => http.write('/api/ohmywishes/disconnect', 'POST'),
  }
}
