import React from 'react'

const CFG = {
  LOW:      { label: 'AN TOÀN',   color: '#00ff87', border: 'rgba(0,255,135,0.35)' },
  MEDIUM:   { label: 'CHÚ Ý',     color: '#ffb300', border: 'rgba(255,179,0,0.35)' },
  HIGH:     { label: 'NGUY HIỂM', color: '#ff6d00', border: 'rgba(255,109,0,0.35)' },
  CRITICAL: { label: 'KHẨN CẤP',  color: '#ff1744', border: 'rgba(255,23,68,0.5)'  },
}

export default function RadarPanel({ level = 'LOW' }) {
  const cfg = CFG[level] || CFG.LOW

  return (
    <div className="radar-container">
      <div className="radar-rings">
        {[1,2,3,4].map(i => (
          <div key={i} className="radar-ring" style={{
            width: `${i * 25}%`,
            height: `${i * 25}%`,
            borderColor: cfg.border,
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
      </div>
      <div className="radar-sweep" style={{
        background: `conic-gradient(transparent 270deg, ${cfg.color}44 360deg)`,
      }} />
      <div className="radar-dot" style={{ background: cfg.color, boxShadow: `0 0 12px ${cfg.color}` }} />
      <div className="radar-label" style={{ color: cfg.color }}>{cfg.label}</div>
    </div>
  )
}
