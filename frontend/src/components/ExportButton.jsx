import React, { useState } from 'react'

export default function ExportButton({ result, filename }) {
  const [copied, setCopied] = useState(false)

  if (!result) return null

  const exportJSON = () => {
    const data = {
      exported_at:  new Date().toISOString(),
      source_file:  filename || 'unknown',
      system:       'SmartNav v1.0 — YOLO26 WOTR',
      summary:      result.summary,
      objects:      result.objects,
      metrics: {
        processing_time_ms: result.processing_time_ms,
        frame_size:         result.frame_size,
        total_objects:      result.objects?.length || 0,
        critical_count:     result.summary?.critical_count || 0,
        high_count:         result.summary?.high_count || 0,
      },
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `smartnav_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyText = () => {
    const text = result.objects?.map(o =>
      `${o.label_vi} (${o.danger_level}) — ${o.distance_label} — ${o.direction}`
    ).join('\n') || 'Không có vật thể'
    navigator.clipboard?.writeText(`SmartNav Analysis\n${new Date().toLocaleString('vi-VN')}\n\n${text}\n\nTổng hợp: ${result.summary?.primary_warning}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="export-row">
      <button className="export-btn" onClick={exportJSON} title="Export JSON report">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5L7 1z" strokeLinejoin="round"/>
          <path d="M7 1v4h4" strokeLinejoin="round"/>
          <path d="M4.5 8.5l2 2 2-2M6.5 10.5v-4" strokeLinecap="round"/>
        </svg>
        Export JSON
      </button>
      <button className="export-btn" onClick={copyText}>
        {copied ? '✓ Đã copy' : '📋 Copy text'}
      </button>
    </div>
  )
}
