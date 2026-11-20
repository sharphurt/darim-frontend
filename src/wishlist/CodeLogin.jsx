import { useId, useRef, useState } from 'react'

const codeLength = 6

export function CodeLogin({ botUsername, pending, onLogin, legacy = false }) {
  const [digits, setDigits] = useState(() => Array(codeLength).fill(''))
  const [legacyCode, setLegacyCode] = useState('')
  const fields = useRef([])
  const hintId = useId()
  const username = botUsername?.replace(/^@/, '')
  const code = legacy ? legacyCode : digits.join('')
  const valid = legacy ? /^[A-F0-9]{12}$/.test(code) : code.length === codeLength

  function enter(index, value) {
    const clean = value.replace(/[^0-9]/g, '').slice(0, codeLength)
    if (value && !clean) return

    const start = clean.length === codeLength ? 0 : index
    const next = [...digits]
    next.splice(start, clean.length || 1, ...(clean ? clean.slice(0, codeLength - start) : ['']))
    setDigits(next)
    if (clean) fields.current[Math.min(start + clean.length, codeLength - 1)]?.focus()
  }

  function submit(event) {
    event.preventDefault()
    if (!pending && valid) onLogin(code)
  }

  return <div className="code-login">
    <p id={hintId}>Отправьте <strong>/login</strong> боту{' '}
      {username ? <a href={`https://t.me/${encodeURIComponent(username)}`} target="_blank"
        rel="noopener noreferrer">@{username}</a> : '«Дарим»'} в Telegram
    </p>
    {username && <a className="pill code-login__bot" href={`https://t.me/${encodeURIComponent(username)}`}
      target="_blank" rel="noopener noreferrer">Перейти к боту</a>}
    <form onSubmit={submit} aria-label="Вход по коду">
      {legacy ? <label className="code-login__legacy">Код из Telegram
        <input value={legacyCode} onChange={event => setLegacyCode(event.target.value.replace(/\s/g, '').toUpperCase())}
          autoComplete="one-time-code" pattern="[A-F0-9]{12}" aria-describedby={hintId}
          disabled={pending} required />
      </label> : <fieldset disabled={pending} aria-describedby={hintId}>
        <legend>Код из Telegram</legend>
        <div className="code-login__digits">
          {digits.map((digit, index) => <input key={index}
            ref={field => { fields.current[index] = field }}
            aria-label={`Цифра ${index + 1} из ${codeLength}`}
            value={digit} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]" required
            onFocus={event => event.currentTarget.select()}
            onChange={event => enter(index, event.target.value)}
            onPaste={event => {
              event.preventDefault()
              enter(index, event.clipboardData.getData('text'))
            }}
            onKeyDown={event => {
              if (event.key === 'Backspace' && !digit && index > 0) {
                event.preventDefault()
                enter(index - 1, '')
                fields.current[index - 1]?.focus()
              }
            }} />)}
        </div>
      </fieldset>}
      <button type="submit" className="pill login-submit" disabled={pending || !valid}>
        {pending ? 'Входим…' : 'Войти'}
      </button>
    </form>
  </div>
}
