export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function createHttpClient() {
  let csrf

  async function send(path, { method = 'GET', body, signal, headers } = {}) {
    const response = await fetch(path, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const isJson = response.headers.get('content-type')?.includes('json')
    const data = isJson ? await response.json() : undefined
    if (!response.ok) {
      throw new ApiError(response.status, data?.detail || data?.title || 'Не удалось выполнить запрос.')
    }
    if (!isJson && method === 'GET') {
      throw new ApiError(response.status, 'Сервер не вернул данные в формате JSON.')
    }
    return data
  }

  return {
    get: (path, signal) => send(path, { signal }),
    async write(path, method, body) {
      const headers = {}
      if (path.startsWith('/api/')) {
        csrf ??= send('/api/csrf').then(data => data.token).catch(error => {
          csrf = undefined
          throw error
        })
        headers['X-CSRF-TOKEN'] = await csrf
      }
      try {
        return await send(path, { method, body, headers })
      } catch (error) {
        if (error.status === 400 || error.status === 401) csrf = undefined
        throw error
      }
    },
  }
}
