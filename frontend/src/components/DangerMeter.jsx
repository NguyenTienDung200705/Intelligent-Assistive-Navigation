import React from 'react'

const COLOR = {
  LOW:      '#00ff87',
  MEDIUM:   '#ffb300',
  HIGH:     '#ff6d00',
  CRITICAL: '#ff1744',
}

export default function DangerMeter({ score = 0, level = 'LOW' }) {
  const color = COLOR[level] || COLOR.LOW
  const pct   = Math.min(Math.round(score * 100), 100)

  return (
    <div className="danger-meter">
      <div className="meter-head">
        <span className="meter-title">DANGER SCORE</span>
        <span className="meter-value" style={{ color }}>{pct}%</span>
      </div>
      <div className="meter-track">
        <div
          className="meter-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #00ff87, ${color})`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
        {[25, 50, 75].map(t => (
          <div key={t} className="meter-tick" style={{ left: `${t}%` }} />
        ))}
      </div>
      <div className="meter-labels">
        <span>LOW</span>
        <span>MED</span>
        <span>HIGH</span>
        <span>CRIT</span>
      </div>
    </div>
  )
}
