import React, { useEffect } from 'react'
import { useAudio } from '../hooks/useAudio'

export default function AudioPlayer({ audioFile, level = 'LOW', autoPlay = false }) {
  const { playing, play, stop, beep } = useAudio()

  useEffect(() => {
    if (autoPlay && audioFile) {
      // Small delay so UI settles first
      const t = setTimeout(() => {
        beep(level)
        if (audioFile) play(audioFile)
      }, 700)
      return () => clearTimeout(t)
    }
  }, [audioFile, level, autoPlay])

  const handlePlay = () => {
    beep(level)
    if (audioFile) play(audioFile)
  }

  return (
    <div className="audio-panel">
      <Waveform playing={playing} />
      <button className="audio-btn" onClick={handlePlay}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
          <path d="M2.5 2.5l8 3.5-8 3.5V2.5z"/>
        </svg>
        Phát cảnh báo
      </button>
      {playing && (
        <button className="audio-btn stop-btn" onClick={stop}>■ Dừng</button>
      )}
    </div>
  )
}

function Waveform({ playing }) {
  return (
    <div className="waveform">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className={`wave-bar${playing ? ' active' : ''}`}
          style={{ animationDelay: `${i * 0.07}s` }}
        />
      ))}
    </div>
  )
}
