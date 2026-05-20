import React from 'react'

const DCFG = {
  LOW:      { label: 'AN TOÀN',   color: '#00ff87', bg: 'rgba(0,255,135,0.07)',  border: 'rgba(0,255,135,0.3)'  },
  MEDIUM:   { label: 'CHÚ Ý',     color: '#ffb300', bg: 'rgba(255,179,0,0.07)',  border: 'rgba(255,179,0,0.3)'  },
  HIGH:     { label: 'NGUY HIỂM', color: '#ff6d00', bg: 'rgba(255,109,0,0.08)', border: 'rgba(255,109,0,0.3)'  },
  CRITICAL: { label: 'KHẨN CẤP',  color: '#ff1744', bg: 'rgba(255,23,68,0.09)', border: 'rgba(255,23,68,0.45)' },
}

const DIR_ICON = { approaching: '↓', receding: '↑', stationary: '●', unknown: '?' }
const DIR_TEXT = { approaching: 'Tiến lại', receding: 'Ra xa', stationary: 'Đứng yên', unknown: '—' }

export default function ObjectCard({ obj, index }) {
  const cfg  = DCFG[obj.danger_level] || DCFG.LOW
  const pct  = Math.round((obj.danger_score || 0) * 100)
  const conf = Math.round((obj.confidence  || 0) * 100)

  return (
    <div
      className="obj-card"
      style={{
        '--delay': `${index * 55}ms`,
        borderColor: cfg.border,
        background:  cfg.bg,
      }}
    >
      {/* Header */}
      <div className="obj-card-header">
        <span className="obj-id" style={{ color: cfg.color }}>#{obj.id || index + 1}</span>
        <span className="obj-cls">{obj.label_vi || obj.class_name}</span>
        <span className="obj-badge" style={{ background: cfg.color, color: '#000' }}>{cfg.label}</span>
      </div>

      {/* Stats grid */}
      <div className="obj-stats">
        <div className="ostat">
          <div className="ostat-label">Khoảng cách</div>
          <div className="ostat-value" style={{ color: cfg.color }}>{obj.distance_label || '—'}</div>
        </div>
        <div className="ostat">
          <div className="ostat-label">Hướng</div>
          <div className="ostat-value">
            <span className="dir-arrow">{DIR_ICON[obj.direction] || '?'}</span>
            {DIR_TEXT[obj.direction] || '—'}
          </div>
        </div>
        <div className="ostat">
          <div className="ostat-label">Tốc độ</div>
          <div className="ostat-value">{obj.speed_label || '—'}</div>
        </div>
        <div className="ostat">
          <div className="ostat-label">Tin cậy</div>
          <div className="ostat-value">{conf}%</div>
        </div>
      </div>

      {/* Warning text */}
      <div className="obj-warning" style={{ color: cfg.color }}>
        {obj.warning_text}
      </div>

      {/* Score bar */}
      <div className="obj-bar-track">
        <div
          className="obj-bar-fill"
          style={{ width: `${pct}%`, background: cfg.color }}
        />
      </div>
    </div>
  )
}
