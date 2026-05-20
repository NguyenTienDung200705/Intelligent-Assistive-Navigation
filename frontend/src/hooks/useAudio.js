import { useState, useRef, useEffect, useCallback } from 'react'
import { getAudioUrl } from '../utils/api'

export function useAudio() {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = new Audio()
    audio.onplay  = () => setPlaying(true)
    audio.onended = () => setPlaying(false)
    audio.onerror = () => setPlaying(false)
    audioRef.current = audio
    return () => { audio.pause(); audio.src = '' }
  }, [])

  const play = useCallback((filename) => {
    if (!filename || !audioRef.current) return
    const url = getAudioUrl(filename)
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    audioRef.current.src = url
    audioRef.current.play().catch(() => {})
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setPlaying(false)
    }
  }, [])

  // Beep alert using Web Audio API
  const beep = useCallback((level = 'LOW') => {
    try {
      const ctx = new AudioContext()
      const freqMap = {
        LOW:      [440],
        MEDIUM:   [550, 660],
        HIGH:     [660, 770, 880],
        CRITICAL: [880, 660, 880, 660, 1000],
      }
      const freqs = freqMap[level] || [440]
      freqs.forEach((f, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = f
        osc.type = 'sine'
        const t = ctx.currentTime + i * 0.2
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
        gain.gain.linearRampToValueAtTime(0, t + 0.16)
        osc.start(t)
        osc.stop(t + 0.16)
      })
    } catch (_) {}
  }, [])

  return { playing, play, stop, beep }
}
