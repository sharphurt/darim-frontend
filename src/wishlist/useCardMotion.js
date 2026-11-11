import { useEffect, useRef } from 'react'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const restAngles = [-3, 1.5, 0, -3]

export function useCardMotion(cards) {
  const shelf = useRef(null)

  useEffect(() => {
    const stage = shelf.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const states = new Map()
    const visible = new Set()
    const pointer = { active: false, x: 0, y: 0, dx: 0, time: 0 }
    let frame = 0
    let previous = 0

    const observer = new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (isIntersecting) visible.add(target)
        else visible.delete(target)
      }
      schedule()
    }, { rootMargin: '160px' })

    for (const [index, mount] of [...stage.querySelectorAll('[data-pendulum]')].entries()) {
      const initial = restAngles[index % restAngles.length] * Math.PI / 180
      states.set(mount, {
        angle: initial,
        initial,
        index,
        velocity: 0,
        rx: 0,
        ry: 0,
        tilt: mount.querySelector('[data-tilt]'),
      })
      observer.observe(mount)
    }

    function schedule() {
      if (!frame && visible.size && !motion.matches) frame = requestAnimationFrame(tick)
    }

    function tick(time) {
      frame = 0
      const dt = previous ? Math.min((time - previous) / 1000, 0.035) : 0.016
      previous = time
      const bounds = [...visible].map(mount => [mount, states.get(mount).tilt.getBoundingClientRect()])

      for (const [mount, rect] of bounds) {
        const state = states.get(mount)
        const dx = pointer.x - rect.left - rect.width / 2
        const dy = pointer.y - rect.top - rect.height / 2
        const proximity = pointer.active ? Math.exp(-Math.pow(Math.hypot(dx * 0.85, dy * 1.12) / 240, 2)) : 0
        const pointerForce = proximity * 0.8
        const localX = clamp(dx / (rect.width * 0.6), -1, 1)
        const localY = clamp(dy / (rect.height * 0.6), -1, 1)
        const rest = state.initial + Math.sin(time * 0.00064 + state.index * 1.3) * 0.0028
        const target = rest + localX * pointerForce * 0.126
        state.velocity += ((target - state.angle) * 21 - state.velocity * 5.9) * dt
        state.velocity += clamp(pointer.dx * pointerForce * 0.00022, -0.02, 0.02)
        state.angle = clamp(state.angle + state.velocity * dt, -0.20, 0.20)
        const ease = 1 - Math.exp(-dt * 9)
        state.rx += (localY * pointerForce * 10 - state.rx) * ease
        state.ry += (-localX * pointerForce * 18 - state.ry) * ease
        mount.style.setProperty('--swing', `${state.angle}rad`)
        state.tilt.style.setProperty('--rx', `${state.rx}deg`)
        state.tilt.style.setProperty('--ry', `${state.ry}deg`)
        state.tilt.style.setProperty('--shine', proximity * 0.25)
        state.tilt.style.setProperty('--light-x', `${50 + localX * 37}%`)
        state.tilt.style.setProperty('--light-y', `${50 + localY * 34}%`)
      }
      pointer.dx *= 0.3
      schedule()
    }

    function move(event) {
      const time = performance.now()
      pointer.active = event.pointerType !== 'touch'
      pointer.dx = pointer.active && time - pointer.time < 120 ? clamp(event.clientX - pointer.x, -90, 90) : 0
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.time = time
    }

    function leave() {
      pointer.active = false
      pointer.dx = 0
    }

    function nudge(event) {
      const state = states.get(event.target.closest('[data-pendulum]'))
      if (state && !motion.matches) state.velocity += state.index % 2 ? 0.23 : -0.23
    }

    function syncPreference() {
      cancelAnimationFrame(frame)
      frame = 0
      previous = 0
      for (const [mount, state] of states) {
        mount.style.removeProperty('--swing')
        for (const property of ['--rx', '--ry', '--shine', '--light-x', '--light-y']) {
          state.tilt.style.removeProperty(property)
        }
      }
      schedule()
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    window.addEventListener('blur', leave)
    stage.addEventListener('click', nudge)
    motion.addEventListener('change', syncPreference)
    return () => {
      observer.disconnect()
      visible.clear()
      syncPreference()
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
      stage.removeEventListener('click', nudge)
      motion.removeEventListener('change', syncPreference)
    }
  }, [cards])

  return shelf
}
