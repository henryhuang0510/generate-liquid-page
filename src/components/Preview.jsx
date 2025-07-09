import React, { useEffect, useRef } from 'react'
import './Preview.css'

const Preview = ({ html }) => {
  const iframeRef = useRef(null)

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
  }, [html])

  return (
    <div className="preview-wrapper">
      <div className="preview-header">
        <span>实时预览</span>
      </div>
      <div className="preview-content">
        <iframe
          ref={iframeRef}
          title="预览"
          className="preview-iframe"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  )
}

export default Preview 