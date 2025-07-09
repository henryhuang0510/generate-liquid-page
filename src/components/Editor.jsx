import React, { useEffect, useRef, useCallback, useState } from 'react'
import * as monaco from 'monaco-editor'
import AIChatDialog from './AIChatDialog'
import { aiService } from '../services/aiService'
import './Editor.css'

const Editor = ({ value, onChange, productData = null }) => {
  const editorRef = useRef(null)
  const monacoEditorRef = useRef(null)
  const diffEditorRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const isUpdatingRef = useRef(false)
  
  // AI聊天相关状态
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [isAILoading, setIsAILoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState(null)
  const [isStreamingCode, setIsStreamingCode] = useState(false)
  const [originalCode, setOriginalCode] = useState(null)
  const [streamingProgress, setStreamingProgress] = useState(0)
  
  // Diff相关状态
  const [showDiff, setShowDiff] = useState(false)
  const [diffData, setDiffData] = useState(null)
  const [isDiffMode, setIsDiffMode] = useState(false)

  // 防抖函数
  const debouncedOnChange = useCallback((newValue) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(newValue)
    }, 300) // 300ms 防抖
  }, [onChange])

  // AI聊天相关函数
  const handleAIChatOpen = () => {
    setIsAIChatOpen(true)
  }

  const handleAIChatClose = () => {
    setIsAIChatOpen(false)
  }

  const handleAISendMessage = async (message) => {
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: message
    }
    setChatMessages(prev => [...prev, userMessage])
    setIsAILoading(true)
    setStreamingMessage(null)
    setIsStreamingCode(false) // 重置流式代码状态
    
    // 保存原始代码，用于后续的diff对比
    if (!originalCode) {
      setOriginalCode(value)
    }

    try {
      // 创建流式AI响应消息
      const streamingResponse = {
        role: 'assistant',
        content: '',
        type: 'text',
        isStreaming: true
      }
      setChatMessages(prev => [...prev, streamingResponse])

      // 调用流式AI服务
      await aiService.streamMessage(
        message, 
        value, 
        productData,
        // onChunk 回调 - 处理流式数据
        (chunk) => {
          console.log('=== 收到流式数据块 ===')
          console.log('chunk:', chunk)
          console.log('chunk.content:', chunk.content)
          console.log('chunk.fullContent:', chunk.fullContent)
          console.log('chunk.isCodeBlock:', chunk.isCodeBlock)
          console.log('chunk.codeContent:', chunk.codeContent)
          
          setStreamingMessage(chunk)
          
          // 实时应用每个数据块到编辑器（不等待完整代码块）
          if (chunk.content && chunk.content.trim()) {
            console.log('=== 实时应用数据块到编辑器 ===')
            console.log('当前数据块内容:', chunk.content)
            
            // 检查是否包含代码块标记
            if (chunk.content.includes('```')) {
              console.log('检测到代码块标记，开始代码模式')
              setIsStreamingCode(true)
            }
            
            // 尝试从完整内容中提取代码
            const extractedCode = extractCodeFromContent(chunk.fullContent)
            if (extractedCode) {
              console.log('提取到代码内容，实时更新:', extractedCode.substring(0, 50) + '...')
              setStreamingProgress(extractedCode.length)
              
              // 立即应用代码到编辑器
              console.log('调用 onChange:', extractedCode.substring(0, 30) + '...')
              onChange(extractedCode)
              
              // 如果编辑器存在，直接更新内容
              if (monacoEditorRef.current && !showDiff) {
                console.log('直接更新 Monaco 编辑器')
                isUpdatingRef.current = true
                const position = monacoEditorRef.current.getPosition()
                const scrollTop = monacoEditorRef.current.getScrollTop()
                const scrollLeft = monacoEditorRef.current.getScrollLeft()
                
                monacoEditorRef.current.setValue(extractedCode)
                
                // 恢复光标位置和滚动位置
                monacoEditorRef.current.setPosition(position)
                monacoEditorRef.current.setScrollTop(scrollTop)
                monacoEditorRef.current.setScrollLeft(scrollLeft)
                
                isUpdatingRef.current = false
                console.log('Monaco 编辑器更新完成')
              } else {
                console.log('Monaco 编辑器不存在或处于 diff 模式')
              }
            } else {
              // 如果没有提取到代码，检查是否整个内容都是代码
              const trimmedContent = chunk.fullContent.trim()
              if (trimmedContent.includes('{{') || trimmedContent.includes('{%') || trimmedContent.includes('<')) {
                console.log('检测到可能的代码内容，实时更新:', trimmedContent.substring(0, 50) + '...')
                setStreamingProgress(trimmedContent.length)
                setIsStreamingCode(true)
                
                // 立即应用内容到编辑器
                onChange(trimmedContent)
                
                // 如果编辑器存在，直接更新内容
                if (monacoEditorRef.current && !showDiff) {
                  isUpdatingRef.current = true
                  const position = monacoEditorRef.current.getPosition()
                  const scrollTop = monacoEditorRef.current.getScrollTop()
                  const scrollLeft = monacoEditorRef.current.getScrollLeft()
                  
                  monacoEditorRef.current.setValue(trimmedContent)
                  
                  // 恢复光标位置和滚动位置
                  monacoEditorRef.current.setPosition(position)
                  monacoEditorRef.current.setScrollTop(scrollTop)
                  monacoEditorRef.current.setScrollLeft(scrollLeft)
                  
                  isUpdatingRef.current = false
                }
              } else {
                // 如果内容看起来像代码，也尝试应用（更激进的策略）
                const possibleCode = chunk.fullContent.trim()
                if (possibleCode.length > 10 && (
                  possibleCode.includes('div') || 
                  possibleCode.includes('h1') || 
                  possibleCode.includes('h2') || 
                  possibleCode.includes('p') || 
                  possibleCode.includes('span') ||
                  possibleCode.includes('class') ||
                  possibleCode.includes('style')
                )) {
                  console.log('检测到可能的HTML代码，实时更新:', possibleCode.substring(0, 50) + '...')
                  setStreamingProgress(possibleCode.length)
                  setIsStreamingCode(true)
                  
                  // 立即应用内容到编辑器
                  onChange(possibleCode)
                  
                  // 如果编辑器存在，直接更新内容
                  if (monacoEditorRef.current && !showDiff) {
                    isUpdatingRef.current = true
                    const position = monacoEditorRef.current.getPosition()
                    const scrollTop = monacoEditorRef.current.getScrollTop()
                    const scrollLeft = monacoEditorRef.current.getScrollLeft()
                    
                    monacoEditorRef.current.setValue(possibleCode)
                    
                    // 恢复光标位置和滚动位置
                    monacoEditorRef.current.setPosition(position)
                    monacoEditorRef.current.setScrollTop(scrollTop)
                    monacoEditorRef.current.setScrollLeft(scrollLeft)
                    
                    isUpdatingRef.current = false
                  }
                }
              }
            }
          }
          
          // 更新聊天消息中的流式内容
          setChatMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.isStreaming) {
              lastMessage.content = chunk.fullContent
              
              // 检测是否包含代码块标记
              if (chunk.content.includes('```')) {
                console.log('检测到代码块标记:', chunk.content)
                // 开始或结束代码块
                if (!lastMessage.isInCodeBlock) {
                  lastMessage.isInCodeBlock = true
                  lastMessage.type = 'code'
                  lastMessage.content = ''
                  setIsStreamingCode(true)
                  console.log('开始检测到代码块，准备实时更新')
                } else {
                  // 代码块结束，提取完整代码
                  const extractedCode = extractCodeFromContent(chunk.fullContent)
                  if (extractedCode) {
                    lastMessage.content = extractedCode
                    console.log('代码块完成，最终代码长度:', extractedCode.length)
                  }
                }
              } else if (lastMessage.isInCodeBlock) {
                // 在代码块内部，实时更新代码内容
                const currentCode = extractCodeFromContent(chunk.fullContent)
                if (currentCode) {
                  lastMessage.content = currentCode
                  
                  // 更新流式进度
                  setStreamingProgress(currentCode.length)
                  
                  console.log('代码块内更新，当前代码长度:', currentCode.length)
                  
                  // 立即应用代码到编辑器（不使用防抖，实现真正的实时更新）
                  console.log('立即更新代码到编辑器:', currentCode.substring(0, 50) + '...')
                  onChange(currentCode)
                  
                  // 如果编辑器存在，直接更新内容
                  if (monacoEditorRef.current && !showDiff) {
                    isUpdatingRef.current = true
                    const position = monacoEditorRef.current.getPosition()
                    const scrollTop = monacoEditorRef.current.getScrollTop()
                    const scrollLeft = monacoEditorRef.current.getScrollLeft()
                    
                    monacoEditorRef.current.setValue(currentCode)
                    
                    // 恢复光标位置和滚动位置
                    monacoEditorRef.current.setPosition(position)
                    monacoEditorRef.current.setScrollTop(scrollTop)
                    monacoEditorRef.current.setScrollLeft(scrollLeft)
                    
                    isUpdatingRef.current = false
                  }
                }
              } else {
                // 不在代码块内，检查是否应该开始代码块
                if (chunk.fullContent.includes('```') && !lastMessage.isInCodeBlock) {
                  console.log('在完整内容中检测到代码块，开始代码模式')
                  lastMessage.isInCodeBlock = true
                  lastMessage.type = 'code'
                  setIsStreamingCode(true)
                }
                
                // 即使不在代码块内，也尝试提取可能的代码内容
                const possibleCode = extractCodeFromContent(chunk.fullContent)
                if (possibleCode && possibleCode.length > 5) {
                  console.log('检测到可能的代码内容，实时更新:', possibleCode.substring(0, 50) + '...')
                  onChange(possibleCode)
                  
                  // 如果编辑器存在，直接更新内容
                  if (monacoEditorRef.current && !showDiff) {
                    isUpdatingRef.current = true
                    const position = monacoEditorRef.current.getPosition()
                    const scrollTop = monacoEditorRef.current.getScrollTop()
                    const scrollLeft = monacoEditorRef.current.getScrollLeft()
                    
                    monacoEditorRef.current.setValue(possibleCode)
                    
                    // 恢复光标位置和滚动位置
                    monacoEditorRef.current.setPosition(position)
                    monacoEditorRef.current.setScrollTop(scrollTop)
                    monacoEditorRef.current.setScrollLeft(scrollLeft)
                    
                    isUpdatingRef.current = false
                  }
                }
              }
            }
            return newMessages
          })
        },
        // onComplete 回调 - 处理完成
        (finalResponse) => {
          console.log('AI流式响应完成:', finalResponse)
          
          // 更新最终消息
          setChatMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.isStreaming) {
              lastMessage.content = finalResponse.content
              lastMessage.type = finalResponse.type
              lastMessage.isStreaming = false
            }
            return newMessages
          })
          
          // 如果AI返回的是代码，显示diff视图让用户确认
          if (finalResponse.type === 'code') {
            // 显示diff视图，让用户查看差异并决定是否接受
            setDiffData({
              original: originalCode || value, // 使用保存的原始代码作为对比
              modified: finalResponse.content
            })
            setShowDiff(true)
            console.log('AI生成代码完成，显示diff视图供用户确认')
            
            // 添加一个提示消息
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: '代码已生成完成！正在显示差异对比视图，您可以查看修改内容并决定是否应用。',
              type: 'text',
              isSystemMessage: true
            }])
          } else {
            // 如果不是代码，但内容看起来像代码，也显示diff视图
            const possibleCode = finalResponse.content.trim()
            if (possibleCode.includes('{{') || possibleCode.includes('{%') || possibleCode.includes('<')) {
              setDiffData({
                original: originalCode || value,
                modified: possibleCode
              })
              setShowDiff(true)
              console.log('检测到可能的代码内容，显示diff视图')
              
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: '检测到代码内容！正在显示差异对比视图，您可以查看修改内容并决定是否应用。',
                type: 'text',
                isSystemMessage: true
              }])
            }
          }
          
          setStreamingMessage(null)
          setIsStreamingCode(false)
          setStreamingProgress(0) // 重置进度
        }
      )
      
    } catch (error) {
      console.error('AI聊天错误:', error)
      // 添加错误消息
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `错误: ${error.message}`,
        type: 'text'
      }])
      setStreamingMessage(null)
      setIsStreamingCode(false)
      setStreamingProgress(0) // 重置进度
    } finally {
      setIsAILoading(false)
    }
  }

  // 提取代码内容的辅助函数
  const extractCodeFromContent = (fullContent) => {
    // 尝试提取完整的代码块
    const completeMatch = fullContent.match(/```(?:liquid)?\s*([\s\S]*?)```/)
    if (completeMatch) {
      return completeMatch[1].trim()
    }
    
    // 尝试提取部分代码块（可能还在生成中）
    const partialMatch = fullContent.match(/```(?:liquid)?\s*([\s\S]*)/)
    if (partialMatch) {
      return partialMatch[1].trim()
    }
    
    // 如果没有代码块标记，检查是否整个内容都是代码
    const trimmedContent = fullContent.trim()
    if (trimmedContent.includes('{{') || trimmedContent.includes('{%') || trimmedContent.includes('<')) {
      return trimmedContent
    }
    
    return null
  }

  // 测试流式更新功能
  const handleTestStreaming = () => {
    console.log('开始测试流式更新功能...')
    setIsStreamingCode(true)
    setStreamingProgress(0)
    
    // 模拟流式更新
    let testCode = ''
    const testCodeParts = [
      '<div class="product-card">',
      '  <h2>{{ product.title }}</h2>',
      '  <p class="price">{{ product.price | money }}</p>',
      '  <div class="description">',
      '    {{ product.description }}',
      '  </div>',
      '  {% if product.available %}',
      '    <button class="buy-btn">购买</button>',
      '  {% endif %}',
      '</div>'
    ]
    
    let partIndex = 0
    const interval = setInterval(() => {
      if (partIndex < testCodeParts.length) {
        testCode += testCodeParts[partIndex] + '\n'
        console.log('测试流式更新:', testCode.substring(0, 50) + '...')
        
        // 立即应用代码到编辑器
        onChange(testCode)
        
        // 如果编辑器存在，直接更新内容
        if (monacoEditorRef.current && !showDiff) {
          isUpdatingRef.current = true
          const position = monacoEditorRef.current.getPosition()
          const scrollTop = monacoEditorRef.current.getScrollTop()
          const scrollLeft = monacoEditorRef.current.getScrollLeft()
          
          monacoEditorRef.current.setValue(testCode)
          
          // 恢复光标位置和滚动位置
          monacoEditorRef.current.setPosition(position)
          monacoEditorRef.current.setScrollTop(scrollTop)
          monacoEditorRef.current.setScrollLeft(scrollLeft)
          
          isUpdatingRef.current = false
        }
        
        setStreamingProgress(testCode.length)
        partIndex++
      } else {
        clearInterval(interval)
        setIsStreamingCode(false)
        setStreamingProgress(0)
        console.log('测试流式更新完成')
      }
    }, 200) // 每200ms更新一次
  }

  // 停止流式代码更新
  const handleStopStreaming = () => {
    console.log('用户停止流式代码更新')
    setIsStreamingCode(false)
    setStreamingMessage(null)
    // 可以在这里添加取消AI请求的逻辑
  }

  // 处理diff视图的接受/拒绝操作
  const handleDiffAccept = () => {
    if (diffData) {
      // 接受更改：保持当前修改后的代码
      console.log('接受diff更改')
      setShowDiff(false)
      setDiffData(null)
      setIsDiffMode(false)
      // 清除原始代码备份，因为用户已经接受了更改
      setOriginalCode(null)
    }
  }

  const handleDiffReject = () => {
    if (diffData) {
      // 拒绝更改：恢复到原始代码
      console.log('拒绝diff更改，恢复到原始代码')
      // 清除防抖定时器，立即恢复原始代码
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      const codeToRestore = originalCode || diffData.original
      onChange(codeToRestore)
      setShowDiff(false)
      setDiffData(null)
      setIsDiffMode(false)
      // 清除原始代码备份
      setOriginalCode(null)
    }
  }

  // 当showDiff状态改变时，确保编辑器正确切换
  useEffect(() => {
    if (!showDiff && diffEditorRef.current) {
      // 关闭diff视图时，销毁diff编辑器
      diffEditorRef.current.dispose()
      diffEditorRef.current = null
      setIsDiffMode(false)
    }
  }, [showDiff])

  // 手动触发diff视图（用于测试）
  const handleShowDiff = () => {
    console.log('开始测试diff功能...')
    console.log('当前代码长度:', value.length)
    
    // 创建一个更明显的代码差异示例
    let testModifiedCode = value
    
    // 如果代码中包含商品标题，进行明显的修改
    if (value.includes('{{ product.title }}')) {
      testModifiedCode = value.replace(
        /{{ product\.title }}/g,
        `{{ product.title | upcase }}`
      )
    }
    
    // 如果代码中包含h1标签，修改样式
    if (value.includes('<h1')) {
      testModifiedCode = testModifiedCode.replace(
        /<h1([^>]*)>/g,
        '<h1$1 style="color: red; font-size: 2.5rem;">'
      )
    }
    
    // 添加一个明显的测试元素
    testModifiedCode += `

{% comment %}=== DIFF测试：这是AI生成的测试代码 ==={% endcomment %}
<div style="background: yellow; padding: 20px; margin: 20px 0; border: 3px solid red;">
  <h2 style="color: red;">🎯 DIFF测试成功！</h2>
  <p style="color: blue; font-weight: bold;">如果您能看到这个黄色背景的框，说明diff渲染功能正常工作！</p>
  <p>当前时间: {{ 'now' | date: '%Y-%m-%d %H:%M:%S' }}</p>
</div>`
    
    console.log('测试修改后代码长度:', testModifiedCode.length)
    console.log('设置diff数据...')
    
    setDiffData({
      original: value,
      modified: testModifiedCode
    })
    setShowDiff(true)
    
    console.log('diff状态已设置，showDiff:', true)
  }

  // Diff编辑器初始化
  useEffect(() => {
    console.log('Diff编辑器useEffect触发:', { showDiff, hasDiffData: !!diffData, hasEditorRef: !!editorRef.current })
    
    if (showDiff && diffData && editorRef.current) {
      console.log('开始创建diff编辑器...')
      setIsDiffMode(true)
      
      // 如果存在普通编辑器，先销毁它
      if (monacoEditorRef.current) {
        console.log('销毁普通编辑器...')
        monacoEditorRef.current.dispose()
        monacoEditorRef.current = null
      }
      
      // 如果存在diff编辑器，先销毁它
      if (diffEditorRef.current) {
        console.log('销毁现有diff编辑器...')
        diffEditorRef.current.dispose()
        diffEditorRef.current = null
      }

      console.log('创建新的diff编辑器...')
      // 创建diff编辑器
      diffEditorRef.current = monaco.editor.createDiffEditor(editorRef.current, {
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        cursorStyle: 'line',
        wordWrap: 'on',
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always',
        disableLayerHinting: true,
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        glyphMargin: true,
        useTabStops: false,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        trimAutoWhitespace: true,
        largeFileOptimizations: true,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 17,
          horizontalScrollbarSize: 17,
          arrowSize: 30
        },
        // Diff特定配置
        renderSideBySide: true,
        enableSplitViewResizing: true,
        ignoreTrimWhitespace: false,
        renderOverviewRuler: true,
        renderIndicators: true,
        originalEditor: {
          readOnly: true
        },
        modifiedEditor: {
          readOnly: false
        }
      })

      console.log('设置diff内容...')
      // 设置diff内容
      const originalModel = monaco.editor.createModel(diffData.original, 'liquid')
      const modifiedModel = monaco.editor.createModel(diffData.modified, 'liquid')
      diffEditorRef.current.setModel({
        original: originalModel,
        modified: modifiedModel
      })

      // 立即触发onChange，让预览区域渲染修改后的代码
      console.log('立即触发onChange，渲染修改后的代码:', diffData.modified.substring(0, 100) + '...')
      debouncedOnChange(diffData.modified)

      console.log('diff编辑器创建完成!')
      // 监听修改后的内容变化
      diffEditorRef.current.getModifiedEditor().onDidChangeModelContent(() => {
        const newValue = diffEditorRef.current.getModifiedEditor().getValue()
        console.log('diff编辑器内容变化，新值长度:', newValue.length)
        
        // 更新diffData中的modified内容
        setDiffData(prev => prev ? { ...prev, modified: newValue } : null)
        
        // 实时更新预览，使用修改后的代码（使用防抖）
        debouncedOnChange(newValue)
      })
    }

    return () => {
      if (diffEditorRef.current) {
        console.log('清理diff编辑器...')
        diffEditorRef.current.dispose()
        diffEditorRef.current = null
        setIsDiffMode(false)
      }
    }
  }, [showDiff, diffData])

  // 普通编辑器初始化
  useEffect(() => {
    if (!showDiff && editorRef.current && !monacoEditorRef.current) {
      // 如果存在diff编辑器，先销毁它
      if (diffEditorRef.current) {
        diffEditorRef.current.dispose()
        diffEditorRef.current = null
      }

      // 配置Monaco编辑器
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: value,
        language: 'liquid',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        cursorStyle: 'line',
        wordWrap: 'on',
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'always',
        disableLayerHinting: true,
        renderLineHighlight: 'all',
        selectOnLineNumbers: true,
        glyphMargin: true,
        useTabStops: false,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        trimAutoWhitespace: true,
        largeFileOptimizations: true,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 17,
          horizontalScrollbarSize: 17,
          arrowSize: 30
        }
      })

      // 监听内容变化
      monacoEditorRef.current.onDidChangeModelContent(() => {
        if (isUpdatingRef.current) return // 避免在程序更新时触发
        
        const newValue = monacoEditorRef.current.getValue()
        debouncedOnChange(newValue)
      })

      // 配置Liquid语法高亮
      monaco.languages.register({ id: 'liquid' })
      monaco.languages.setMonarchTokensProvider('liquid', {
        defaultToken: '',
        tokenPostfix: '.liquid',

        keywords: [
          'if', 'else', 'elsif', 'endif', 'unless', 'endunless',
          'for', 'in', 'endfor', 'break', 'continue',
          'assign', 'capture', 'endcapture', 'case', 'when', 'endcase',
          'comment', 'endcomment', 'raw', 'endraw',
          'include', 'render', 'section', 'endsection',
          'layout', 'paginate', 'endpaginate'
        ],

        operators: [
          '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
          '<>', '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
          '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
          '%=', '<<=', '>>=', '>>>='
        ],

        symbols: /[=><!~?:&|+\-*\/\^%]+/,

        tokenizer: {
          root: [
            // Liquid tags
            [/{%\s*/, { token: 'tag', next: '@liquid_tag' }],
            [/{{/, { token: 'output', next: '@liquid_output' }],
            
            // HTML tags
            [/<[a-zA-Z][a-zA-Z0-9]*/, { token: 'tag.html', next: '@html_tag' }],
            [/<\/[a-zA-Z][a-zA-Z0-9]*/, { token: 'tag.html', next: '@html_tag' }],
            
            // CSS
            [/[{}]/, 'delimiter.bracket.css'],
            [/[;]/, 'delimiter.css'],
            [/[a-zA-Z\-]+(?=\s*:)/, 'attribute.name.css'],
            [/:\s*/, 'delimiter.css', '@css_value'],
            
            // JavaScript
            [/[{}]/, 'delimiter.bracket.js'],
            [/[;]/, 'delimiter.js'],
            [/[a-zA-Z_$][a-zA-Z0-9_$]*/, 'identifier.js'],
            [/[0-9]+/, 'number.js'],
            [/["'`]/, { token: 'string.js', next: '@string_js' }]
          ],

          liquid_tag: [
            [/[a-zA-Z_][a-zA-Z0-9_]*/, {
              cases: {
                '@keywords': 'keyword.liquid',
                '@default': 'identifier.liquid'
              }
            }],
            [/[|]/, 'delimiter.liquid'],
            [/[a-zA-Z_][a-zA-Z0-9_]*/, 'filter.liquid'],
            [/['"]/, { token: 'string.liquid', next: '@string_liquid' }],
            [/[0-9]+/, 'number.liquid'],
            [/[=><!~?:&|+\-*\/\^%]+/, 'operator.liquid'],
            [/%}/, { token: 'tag', next: '@pop' }]
          ],

          liquid_output: [
            [/[|]/, 'delimiter.liquid'],
            [/[a-zA-Z_][a-zA-Z0-9_]*/, 'filter.liquid'],
            [/['"]/, { token: 'string.liquid', next: '@string_liquid' }],
            [/[0-9]+/, 'number.liquid'],
            [/[=><!~?:&|+\-*\/\^%]+/, 'operator.liquid'],
            [/}}/, { token: 'output', next: '@pop' }]
          ],

          html_tag: [
            [/[a-zA-Z_][a-zA-Z0-9_]*/, 'attribute.name.html'],
            [/=/, 'delimiter.html'],
            [/['"]/, { token: 'string.html', next: '@string_html' }],
            [/>/, { token: 'tag.html', next: '@pop' }]
          ],

          string_liquid: [
            [/[^'"]+/, 'string.liquid'],
            [/['"]/, { token: 'string.liquid', next: '@pop' }]
          ],

          string_html: [
            [/[^'"]+/, 'string.html'],
            [/['"]/, { token: 'string.html', next: '@pop' }]
          ],

          string_js: [
            [/[^"'`]+/, 'string.js'],
            [/["'`]/, { token: 'string.js', next: '@pop' }]
          ],

          css_value: [
            [/[^;]+/, 'value.css'],
            [/;/, { token: 'delimiter.css', next: '@pop' }]
          ]
        }
      })
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose()
        monacoEditorRef.current = null
      }
    }
  }, [debouncedOnChange, showDiff])

  // 只在值真正改变时才更新编辑器内容
  useEffect(() => {
    if (monacoEditorRef.current && !isUpdatingRef.current && !showDiff) {
      const currentValue = monacoEditorRef.current.getValue()
      if (value !== currentValue) {
        isUpdatingRef.current = true
        const position = monacoEditorRef.current.getPosition()
        const scrollTop = monacoEditorRef.current.getScrollTop()
        const scrollLeft = monacoEditorRef.current.getScrollLeft()
        
        monacoEditorRef.current.setValue(value)
        
        // 恢复光标位置和滚动位置
        monacoEditorRef.current.setPosition(position)
        monacoEditorRef.current.setScrollTop(scrollTop)
        monacoEditorRef.current.setScrollLeft(scrollLeft)
        
        isUpdatingRef.current = false
      }
    }
  }, [value, showDiff])

  return (
    <div className="editor-wrapper">
      <div className="editor-header">
        <span>
          {showDiff ? '代码对比视图' : 'Liquid 代码编辑器'}
          {isDiffMode && (
            <span className="diff-mode-indicator">
              (实时预览模式)
            </span>
          )}
          {isStreamingCode && (
            <span className="streaming-code-indicator">
              (AI正在实时生成代码... {streamingProgress > 0 ? `${streamingProgress} 字符` : ''})
            </span>
          )}
        </span>
        <div className="editor-controls">
          {isStreamingCode && (
            <button 
              className="stop-streaming-btn"
              onClick={handleStopStreaming}
              title="停止代码生成"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="4" y="4" width="8" height="8" fill="currentColor"/>
              </svg>
              停止生成
            </button>
          )}
          {showDiff ? (
            <>
              <div className="diff-info">
                <span className="diff-tip">💡 右侧代码会实时渲染到预览区域</span>
              </div>
              <button 
                className="diff-btn diff-reject-btn"
                onClick={handleDiffReject}
                title="拒绝更改"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                拒绝
              </button>
              <button 
                className="diff-btn diff-accept-btn"
                onClick={handleDiffAccept}
                title="接受更改"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M13.854 2.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 9.293l6.646-6.647a.5.5 0 0 1 .708 0z" fill="currentColor"/>
                </svg>
                接受
              </button>
            </>
          ) : (
            <>
              <button 
                className="diff-test-btn"
                onClick={handleShowDiff}
                title="测试Diff视图"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L15 8L8 15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                测试Diff
              </button>
              <button 
                className="streaming-test-btn"
                onClick={handleTestStreaming}
                title="测试流式更新"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L15 8L8 15M1 8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                测试流式
              </button>
              <button 
                className="ai-assistant-btn"
                onClick={handleAIChatOpen}
                title="AI 代码助手"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1C4.13 1 1 4.13 1 8s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 4v4M8 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                AI 助手
              </button>
            </>
          )}
        </div>
      </div>
      <div ref={editorRef} className="monaco-editor" />
      
      {/* AI聊天对话框 */}
      <AIChatDialog
        isOpen={isAIChatOpen}
        onClose={handleAIChatClose}
        onSendMessage={handleAISendMessage}
        messages={chatMessages}
        isLoading={isAILoading}
        liquidCode={value}
        productData={productData}
      />
    </div>
  )
}

export default Editor 