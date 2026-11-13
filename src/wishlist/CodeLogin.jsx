import { useId, useState } from 'react'

export function CodeLogin({ botUsername, pending, onLogin }) {
  const [code, setCode] = useState('')
  const hintId = useId()
  const username = botUsername?.replace(/^@/, '')

  function submit(event) {
    event.preventDefault()
    if (!pending && /^[A-F0-9]{12}$/.test(code)) onLogin(code)
  }

  return <details className="code-login">
    <summary>Войти по коду</summary>
    <p id={hintId}>Отправьте <strong>/login</strong> боту{' '}
      {username ? <a href={`https://t.me/${encodeURIComponent(username)}`} target="_blank"
        rel="noopener noreferrer">@{username}</a> : '«Дарим»'} в личном сообщении.
      {' '}Код действует 5 минут. Подходит и для первого входа.</p>
    <form onSubmit={submit} aria-label="Вход по коду">
      <label>Код из Telegram
        <input value={code} onChange={event => setCode(event.target.value.replace(/\s/g, '').toUpperCase())}
          autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false}
          aria-describedby={hintId} minLength={12} maxLength={32} pattern="[A-Fa-f0-9]{12}"
          disabled={pending} required />
      </label>
      <button type="submit" className="pill" disabled={pending || !/^[A-F0-9]{12}$/.test(code)}>
        {pending ? 'Входим…' : 'Войти'}
      </button>
    </form>
  </details>
}
