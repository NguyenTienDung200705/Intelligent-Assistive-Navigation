import React from 'react'
import { useApp } from '../context/AppContext'

const LEVEL_COLOR = {
  LOW: '#00ff87', MEDIUM: '#ffb300', HIGH: '#ff6d00', CRITICAL: '#ff1744',
}

export default function SessionStats() {
  const { history } = useApp()

  if (history.length === 0) return null

  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  history.forEach(h => { if (counts[h.level] !== undefined) counts[h.level]++ })

  const total   = history.length
  const highest = history.reduce((acc, h) => {
    const order = ['LOW','MEDIUM','HIGH','CRITICAL']
    return order.indexOf(h.level) > order.indexOf(acc) ? h.level : acc
  }, 'LOW')

  return (
    <div className="session-stats">
      <div className="ss-title">SESSION STATS</div>
      <div className="ss-total">
        <span className="ss-total-num">{total}</span>
        <span className="ss-total-lbl">SCANS</span>
      </div>
      <div className="ss-bars">
        {['CRITICAL','HIGH','MEDIUM','LOW'].map(level => (
          <div key={level} className="ss-bar-row">
            <span className="ss-bar-label" style={{ color: LEVEL_COLOR[level] }}>
              {level.slice(0, 4)}
            </span>
            <div className="ss-bar-track">
              <div
                className="ss-bar-fill"
                style={{
                  width: total > 0 ? `${(counts[level] / total) * 100}%` : '0%',
                  background: LEVEL_COLOR[level],
                }}
              />
            </div>
            <span className="ss-bar-count">{counts[level]}</span>
          </div>
        ))}
      </div>
      <div className="ss-highest">
        <span className="ss-highest-label">HIGHEST</span>
        <span className="ss-highest-val" style={{ color: LEVEL_COLOR[highest] }}>{highest}</span>
      </div>
    </div>
  )
}
