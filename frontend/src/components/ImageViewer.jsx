import React, { useState } from 'react'
import { getImageUrl, getVideoUrl } from '../utils/api'

const TABS = [
  { key: 'detected', label: 'KẾT QUẢ DETECTION' },
  { key: 'depth',    label: 'DEPTH MAP'          },
  { key: 'original', label: 'ẢNH / VIDEO GỐC'   },
]

const CORNER_COLOR = {
  LOW:      '#00ff87',
  MEDIUM:   '#ffb300',
  HIGH:     '#ff6d00',
  CRITICAL: '#ff1744',
}

export default function ImageViewer({ result, inputFile, inputMode = 'image' }) {
  const [tab, setTab] = useState('detected')

  const level = result?.summary?.overall_level || 'LOW'
  const color = CORNER_COLOR[level] || CORNER_COLOR.LOW
  const glow  = `0 0 28px ${color}33`

  const isVideo = inputMode === 'video'

  // Annotated output video URL
  const outputVideoUrl    = result?.output_video   ? getVideoUrl(result.output_video)   : null
  // Annotated image URL
  const annotatedImageUrl = result?.annotated_image ? getImageUrl(result.annotated_image) : null
  // Depth map URL
  const depthImageUrl     = result?.depth_image    ? getImageUrl(result.depth_image)    : null

  return (
    <div className="image-viewer">
      {/* Tab bar */}
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
      <div
        className="viewer-frame"
        style={{ borderColor: `${color}55`, boxShadow: glow }}
      >
        {/* Corner decorations */}
        {['tl','tr','bl','br'].map(pos => (
          <div key={pos} className={`vcorner ${pos}`} style={{ borderColor: color }} />
        ))}

        <div className="viewer-content">
          {/* ── DETECTED tab ────────────────────────────────────────── */}
          {tab === 'detected' && (
            <>
              {isVideo && outputVideoUrl ? (
                /* Annotated video with bounding boxes */
                <video
                  key={outputVideoUrl}
                  src={outputVideoUrl}
                  controls
                  autoPlay={false}
                  className="viewer-img"
                  style={{ maxHeight: 480 }}
                  onError={(e) => console.error('Video load error:', e)}
                />
              ) : annotatedImageUrl ? (
                /* Annotated image with bounding boxes */
                <img
                  src={annotatedImageUrl}
                  alt="Detection result"
                  className="viewer-img"
                />
              ) : (
                <EmptyState text="Đang xử lý..." />
              )}
            </>
          )}

          {/* ── DEPTH MAP tab ────────────────────────────────────────── */}
          {tab === 'depth' && (
            depthImageUrl
              ? <img src={depthImageUrl} alt="Depth map" className="viewer-img" />
              : <EmptyState text="Depth map chỉ khả dụng với ảnh tĩnh" />
          )}

          {/* ── ORIGINAL tab ─────────────────────────────────────────── */}
          {tab === 'original' && inputFile && (
            isVideo
              ? <video src={inputFile} controls className="viewer-img" style={{ maxHeight: 480 }} />
              : <img   src={inputFile} alt="Original" className="viewer-img" />
          )}
          {tab === 'original' && !inputFile && (
            <EmptyState text="Chưa có file gốc" />
          )}
        </div>

        {/* HUD */}
        <div className="viewer-hud">
          <span>
            {result?.frame_size
              ? `${result.frame_size.width}×${result.frame_size.height}`
              : result?.video_info
              ? `${result.video_info.width}×${result.video_info.height} · ${result.video_info.fps?.toFixed(0)}fps`
              : '—'}
          </span>
          <span style={{ color }}>{level}</span>
          <span>
            {result?.processing_time_ms
              ? `${result.processing_time_ms}ms`
              : result?.total_frames
              ? `${result.total_frames} frames`
              : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 200, width: '100%',
      color: 'var(--t-muted)',
      fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
    }}>
      {text}
    </div>
  )
}