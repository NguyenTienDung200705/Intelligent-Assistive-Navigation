import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const LEVEL_CFG = {
  LOW:      { color: '#00ff87', label: 'AN TOÀN'   },
  MEDIUM:   { color: '#ffb300', label: 'CHÚ Ý'     },
  HIGH:     { color: '#ff6d00', label: 'NGUY HIỂM' },
  CRITICAL: { color: '#ff1744', label: 'KHẨN CẤP'  },
}

function fmt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', { hour12: false })
}

function StatCard({ label, value, color }) {
  return (
    <div className="hist-stat">
      <div className="hist-stat-val" style={{ color: color || 'var(--accent-cyan)' }}>{value}</div>
      <div className="hist-stat-lbl">{label}</div>
    </div>
  )
}

export default function HistoryPage() {
  const { history, clearHistory } = useApp()
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL' ? history : history.filter(h => h.level === filter)

  const total    = history.length
  const critical = history.filter(h => h.level === 'CRITICAL').length
  const high     = history.filter(h => h.level === 'HIGH').length
  const safe     = history.filter(h => h.level === 'LOW').length
  const avgScore = total > 0
    ? (history.reduce((s, h) => s + h.score, 0) / total * 100).toFixed(1)
    : '0'

  return (
    <div className="page history-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">LỊCH SỬ PHÂN TÍCH</h2>
          <p className="page-sub">Session history — {total} lần quét</p>
        </div>
        {total > 0 && (
          <button className="btn-danger-sm" onClick={clearHistory}>
            🗑 Xóa tất cả
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="hist-stats-row">
        <StatCard label="TỔNG SCANS"    value={total}    />
        <StatCard label="KHẨN CẤP"      value={critical} color="#ff1744" />
        <StatCard label="NGUY HIỂM"     value={high}     color="#ff6d00" />
        <StatCard label="AN TOÀN"        value={safe}     color="#00ff87" />
        <StatCard label="AVG SCORE"      value={`${avgScore}%`} />
      </div>

      {/* Filter tabs */}
      <div className="hist-filters">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
          <button
            key={f}
            className={`hist-filter${filter === f ? ' active' : ''}`}
            style={filter === f && LEVEL_CFG[f] ? { borderColor: LEVEL_CFG[f].color, color: LEVEL_CFG[f].color } : {}}
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'TẤT CẢ' : LEVEL_CFG[f]?.label}
            <span className="hist-filter-count">
              {f === 'ALL' ? total : history.filter(h => h.level === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* History list */}
      {filtered.length === 0 ? (
        <div className="hist-empty">
          <div className="hist-empty-icon">📂</div>
          <p>{total === 0 ? 'Chưa có lịch sử phân tích. Hãy upload ảnh/video để bắt đầu.' : 'Không có kết quả phù hợp với bộ lọc này.'}</p>
        </div>
      ) : (
        <div className="hist-list">
          {filtered.map((item, i) => {
            const cfg = LEVEL_CFG[item.level] || LEVEL_CFG.LOW
            return (
              <div key={item.id} className="hist-item" style={{ borderColor: cfg.color + '44', animationDelay: `${i * 40}ms` }}>
                <div className="hist-item-left">
                  <div className="hist-level-dot" style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }} />
                  <div>
                    <div className="hist-filename">{item.filename || 'Unknown file'}</div>
                    <div className="hist-time">{fmt(item.timestamp)}</div>
                  </div>
                </div>
                <div className="hist-item-center">
                  <div className="hist-summary">{item.summary || '—'}</div>
                </div>
                <div className="hist-item-right">
                  <div className="hist-badge" style={{ background: cfg.color + '22', color: cfg.color, borderColor: cfg.color + '55' }}>
                    {cfg.label}
                  </div>
                  <div className="hist-meta">
                    <span>{item.objects} vật thể</span>
                    <span>{(item.score * 100).toFixed(0)}% risk</span>
                    <span>{item.fileType}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
