import React, { useState, useRef, useEffect } from 'react'
import './AIChatDialog.css'

const AIChatDialog = ({ 
  isOpen, 
  onClose, 
  onSendMessage, 
  messages = [], 
  isLoading = false,
  liquidCode = '',
  productData = null
}) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatMessage = (message) => {
    if (message.type === 'code') {
      return (
        <pre className="code-block">
          <code>{message.content}</code>
          {message.isStreaming && (
            <span className="streaming-cursor">|</span>
          )}
        </pre>
      )
    }
    return (
      <div className="message-text">
        {message.content}
        {message.isStreaming && (
          <span className="streaming-cursor">|</span>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="ai-chat-overlay" onClick={onClose}>
      <div className="ai-chat-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="ai-chat-header">
          <h3>AI 代码助手</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="ai-chat-messages">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🤖</div>
              <h4>AI 代码助手</h4>
              <p>我可以帮你优化和生成 Liquid 代码。请描述你的需求。</p>
              <div className="ai-features">
                <div className="feature-item">
                  <span className="feature-icon">⚡</span>
                  <span>流式响应，实时显示</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔍</span>
                  <span>自动显示代码差异对比</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✅</span>
                  <span>一键接受或拒绝更改</span>
                </div>
              </div>
              <div className="context-info">
                <div className="context-item">
                  <span className="label">当前代码长度:</span>
                  <span className="value">{(new TextEncoder().encode(liquidCode).length / 1024).toFixed(2)} KB</span>
                </div>
                {productData && (
                  <div className="context-item">
                    <span className="label">商品数据:</span>
                    <span className="value">{productData.product?.title || '未设置'}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`message ${message.role} ${message.isStreaming ? 'streaming' : ''} ${message.isSystemMessage ? 'system' : ''}`}>
                <div className="message-avatar">
                  {message.role === 'user' ? '👤' : message.isSystemMessage ? 'ℹ️' : '🤖'}
                </div>
                <div className="message-content">
                  {formatMessage(message)}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="ai-chat-input">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="描述你的需求，例如：优化商品展示、添加价格格式化、修复语法错误..."
              disabled={isLoading}
              rows={1}
            />
            <button 
              className="send-btn" 
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 8L15 1L8 8L15 15L1 8Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIChatDialog 