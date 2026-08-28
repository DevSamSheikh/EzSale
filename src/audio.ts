export type AudioCueKind = 'success' | 'warning' | 'danger' | 'error' | 'info' | 'tap'

const KEY = 'ezsale:audio:settings'

interface AudioSettings {
  enabled: boolean
  volume: number
}

function readSettings(): AudioSettings {
  if (typeof window === 'undefined') return { enabled: true, volume: 0.4 }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { enabled: true, volume: 0.4 }
    const v = JSON.parse(raw) as Partial<AudioSettings>
    return { enabled: v.enabled ?? true, volume: v.volume ?? 0.4 }
  } catch {
    return { enabled: true, volume: 0.4 }
  }
}

function writeSettings(s: AudioSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null
let unlocked = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx) return ctx
  const Ctor: typeof AudioContext | undefined =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    ctx = null
  }
  return ctx
}

export function unlockAudio() {
  if (unlocked) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') {
    c.resume().catch(() => {
      /* ignore */
    })
  }
  unlocked = true
}

if (typeof document !== 'undefined') {
  const unlock = () => unlockAudio()
  document.addEventListener('pointerdown', unlock, { once: true })
  document.addEventListener('keydown', unlock, { once: true })
}

interface Tone {
  freq: number
  duration: number
  type?: OscillatorType
  delay?: number
  gain?: number
}

function scheduleTones(audio: AudioContext, master: GainNode, tones: Tone[]) {
  const t0 = audio.currentTime + 0.01
  tones.forEach((t) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = t.type ?? 'sine'
    osc.frequency.setValueAtTime(t.freq, t0 + (t.delay ?? 0))
    const peak = Math.max(0.0001, t.gain ?? 1)
    const start = t0 + (t.delay ?? 0)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.duration)
    osc.connect(gain)
    gain.connect(master)
    osc.start(start)
    osc.stop(start + t.duration + 0.02)
  })
}

function tonesFor(kind: AudioCueKind): Tone[] {
  switch (kind) {
    case 'success':
      return [
        { freq: 660, duration: 0.12, type: 'sine', gain: 1 },
        { freq: 880, duration: 0.18, type: 'sine', delay: 0.1, gain: 1 },
      ]
    case 'tap':
      return [{ freq: 880, duration: 0.06, type: 'triangle', gain: 0.7 }]
    case 'info':
      return [{ freq: 740, duration: 0.14, type: 'sine', gain: 0.9 }]
    case 'warning':
      return [
        { freq: 520, duration: 0.14, type: 'square', gain: 0.7 },
        { freq: 520, duration: 0.14, type: 'square', delay: 0.16, gain: 0.7 },
      ]
    case 'danger':
      return [
        { freq: 360, duration: 0.16, type: 'square', gain: 0.9 },
        { freq: 280, duration: 0.22, type: 'square', delay: 0.18, gain: 0.9 },
      ]
    case 'error':
      return [
        { freq: 220, duration: 0.2, type: 'sawtooth', gain: 0.9 },
        { freq: 180, duration: 0.3, type: 'sawtooth', delay: 0.18, gain: 0.9 },
      ]
    default:
      return [{ freq: 600, duration: 0.1, type: 'sine', gain: 0.8 }]
  }
}

export function playCue(kind: AudioCueKind = 'tap') {
  const settings = readSettings()
  if (!settings.enabled) return
  const audio = getCtx()
  if (!audio) return
  if (audio.state === 'suspended') {
    audio.resume().catch(() => {
      /* ignore */
    })
  }
  const master = audio.createGain()
  const vol = Math.min(1, Math.max(0, settings.volume))
  master.gain.value = vol
  master.connect(audio.destination)
  scheduleTones(audio, master, tonesFor(kind))
}

export function getAudioSettings(): AudioSettings {
  return readSettings()
}

export function setAudioEnabled(enabled: boolean) {
  const next = { ...readSettings(), enabled }
  writeSettings(next)
}

export function setAudioVolume(volume: number) {
  const next = { ...readSettings(), volume: Math.min(1, Math.max(0, volume)) }
  writeSettings(next)
}
