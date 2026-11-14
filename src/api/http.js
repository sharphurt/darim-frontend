export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function createHttpClient({ token = () => null } = {}) {
  let csrf

  async function send(path, { method = 'GET', body, signal, headers, rawType } = {}) {
    const response = await fetch(path, {
      method,
      signal,
      credentials: token() ? 'omit' : 'same-origin',
      headers: { ...headers, ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': rawType ?? 'application/json' }) },
      body: rawType ? body : JSON.stringify(body),
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
    get: (path, signal, headers) => send(path, { signal, headers }),
    async write(path, method, body, rawType) {
      const headers = {}
      if (path.startsWith('/api/') && !token()) {
        csrf ??= send('/api/csrf').then(data => data.token).catch(error => {
          csrf = undefined
          throw error
        })
        headers['X-CSRF-TOKEN'] = await csrf
      }
      try {
        return await send(path, { method, body, headers, rawType })
      } catch (error) {
        if (error.status === 400 || error.status === 401) csrf = undefined
        throw error
      }
    },
  }
}
