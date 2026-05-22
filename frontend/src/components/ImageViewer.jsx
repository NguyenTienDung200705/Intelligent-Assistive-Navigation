import React, { useState } from 'react'
import { getMediaUrl } from '../utils/api'

const TABS = [
  { key: 'detected', label: 'KẾT QUẢ DETECTION' },
  { key: 'depth',    label: 'DEPTH MAP'         },
  { key: 'original', label: 'GỐC'               },
]

const CORNER_COLORS = {
  LOW:      '#00ff87',
  MEDIUM:   '#ffb300',
  HIGH:     '#ff6d00',
  CRITICAL: '#ff1744',
}

export default function ImageViewer({ result, inputFile, inputMode = 'image' }) {
  const [tab, setTab] = useState('detected')
  const level = result?.summary?.overall_level || 'LOW'
  const color = CORNER_COLORS[level] || CORNER_COLORS.LOW

  const borderColor = color + '55'
  const glow = `0 0 28px ${color}33`

  return (
    <div className="image-viewer">
      {/* Tabs */}
      <div className="viewer-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Frame */}
      <div className="viewer-frame" style={{ borderColor, boxShadow: glow }}>
        {/* Corner decorations */}
        {['tl','tr','bl','br'].map(pos => (
          <div key={pos} className={`vcorner ${pos}`} style={{ borderColor: color }} />
        ))}

        {/* Content */}
        <div className="viewer-content">
          {tab === 'detected' && (
            result?.annotated_image
              ? <img src={getMediaUrl(result.annotated_image)} alt="Detection" className="viewer-img" />
              : result?.output_video
              ? <video key={result.output_video} src={getMediaUrl(result.output_video)} controls className="viewer-img"  preload="metadata"/>
              : <EmptyViewer text="Không có ảnh kết quả" />
          )}
          {tab === 'depth' && (
            result?.depth_image
              ? <img src={getMediaUrl(result.depth_image)} alt="Depth map" className="viewer-img" />
              : <EmptyViewer text="Depth map không khả dụng" />
          )}
          {tab === 'original' && inputFile && (
            inputMode === 'video'
              ? <video key={inputFile} src={inputFile} controls className="viewer-img" preload="metadata" />
              : <img src={inputFile} alt="Original" className="viewer-img" />
          )}
        </div>

        {/* HUD */}
        <div className="viewer-hud">
          <span>
            {result?.frame_size
              ? `${result.frame_size.width}×${result.frame_size.height}`
              : result?.video_info
              ? `${result.video_info.width}×${result.video_info.height}`
              : '—'}
          </span>
          <span style={{ color }}>{level}</span>
          <span>{result?.processing_time_ms ? `${result.processing_time_ms}ms` : '—'}</span>
        </div>
      </div>
    </div>
  )
}

function EmptyViewer({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
      {text}
    </div>
  )
}
