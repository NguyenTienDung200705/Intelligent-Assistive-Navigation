import React from 'react'

const DCFG = {
  LOW:      { icon: '✓',  color: '#00ff87', bg: 'rgba(0,255,135,0.07)',  border: 'rgba(0,255,135,0.3)',  glow: 'none'                           },
  MEDIUM:   { icon: '◉',  color: '#ffb300', bg: 'rgba(255,179,0,0.07)',  border: 'rgba(255,179,0,0.3)',  glow: 'none'                           },
  HIGH:     { icon: '⚡', color: '#ff6d00', bg: 'rgba(255,109,0,0.08)', border: 'rgba(255,109,0,0.3)',  glow: '0 0 24px rgba(255,109,0,0.25)'  },
  CRITICAL: { icon: '⚠',  color: '#ff1744', bg: 'rgba(255,23,68,0.10)', border: 'rgba(255,23,68,0.45)', glow: '0 0 32px rgba(255,23,68,0.35)'  },
}

export default function WarningCard({ summary }) {
  if (!summary) return null
  const level = summary.overall_level || 'LOW'
  const cfg   = DCFG[level] || DCFG.LOW

  return (
    <div
      className="warning-card"
      style={{
        borderColor: cfg.border,
        background:  cfg.bg,
        boxShadow:   cfg.glow,
      }}
    >
      <div
        className="warning-icon"
        style={{ color: cfg.color }}
        data-critical={level === 'CRITICAL'}
      >
        {cfg.icon}
      </div>
      <div className="warning-body">
        <div className="warning-level" style={{ color: cfg.color }}>
          {level}
          {summary.critical_count > 0 && (
            <span className="warning-badge crit">{summary.critical_count} KHẨN CẤP</span>
          )}
          {summary.high_count > 0 && (
            <span className="warning-badge high">{summary.high_count} NGUY HIỂM</span>
          )}
        </div>
        <div className="warning-text">{summary.primary_warning}</div>
      </div>
    </div>
  )
}
