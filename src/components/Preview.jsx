import React, { useEffect, useRef, useState } from 'react'
import './Preview.css'

const Preview = ({ html }) => {
  const iframeRef = useRef(null)
  const [deviceMode, setDeviceMode] = useState('desktop') // 'desktop', 'tablet', 'mobile'

  useEffect(() => {
    if (!html || !iframeRef.current) return

    // 处理协议相对链接，确保使用 HTTPS
    const processedHtml = html.replace(
      /(src|href)=["']\/\/([^"']+)["']/g,
      '$1="https://$2"'
    )

    // 创建完整的 HTML 文档
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>预览</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          ${processedHtml}
        </body>
      </html>
    `

    // 创建 blob URL
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const blobUrl = URL.createObjectURL(blob)

    // 设置 iframe 的 src
    iframeRef.current.src = blobUrl

    // 清理函数
    return () => {
      URL.revokeObjectURL(blobUrl)
    }
  }, [html, deviceMode]) // 添加 deviceMode 作为依赖项

  const handleDeviceChange = (device) => {
    setDeviceMode(device)
  }

  return (
    <div className="preview-wrapper">
      <div className="preview-header">
        <span>实时预览</span>
        <div className="device-controls">
          <button 
            className={`device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
            onClick={() => handleDeviceChange('desktop')}
            title="桌面端预览"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 12h8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 15h4" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            桌面端
          </button>
          <button 
            className={`device-btn ${deviceMode === 'tablet' ? 'active' : ''}`}
            onClick={() => handleDeviceChange('tablet')}
            title="平板端预览"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8" cy="14" r="1" fill="currentColor"/>
            </svg>
            平板端
          </button>
          <button 
            className={`device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
            onClick={() => handleDeviceChange('mobile')}
            title="移动端预览"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="4" y="2" width="8" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="8" cy="14" r="1" fill="currentColor"/>
            </svg>
            移动端
          </button>
        </div>
      </div>
      <div className={`preview-content preview-${deviceMode}`}>
        <div className="device-frame">
          <iframe
            ref={iframeRef}
            title="预览"
            className="preview-iframe"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>
    </div>
  )
}

export default Preview 