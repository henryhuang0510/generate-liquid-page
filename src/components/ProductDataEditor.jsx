import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import * as monaco from 'monaco-editor'
import './ProductDataEditor.css'

const ProductDataEditor = ({ value, onChange }) => {
  const editorRef = useRef(null)
  const monacoEditorRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const isUpdatingRef = useRef(false)

  // 防抖函数
  const debouncedOnChange = useCallback((newData) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      console.log('商品数据已更新:', newData)
      onChange(newData)
    }, 500) // 增加防抖时间到500ms
  }, [onChange])

  // 使用useMemo来避免不必要的重新创建
  const editorValue = useMemo(() => {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  }, [value])

  useEffect(() => {
    if (editorRef.current && !monacoEditorRef.current) {
      // 配置Monaco编辑器用于JSON编辑
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: editorValue,
        language: 'json',
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
        // JSON特定配置
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true
        }
      })

      // 监听内容变化
      monacoEditorRef.current.onDidChangeModelContent(() => {
        if (isUpdatingRef.current) return // 避免在程序更新时触发
        
        const newValue = monacoEditorRef.current.getValue()
        try {
          // 尝试解析JSON，只有成功解析才传递数据
          const parsedValue = JSON.parse(newValue)
          debouncedOnChange(parsedValue)
        } catch (error) {
          // JSON无效时不传递数据，避免渲染错误
          console.log('JSON解析失败，等待有效数据...')
        }
      })

      // 配置JSON验证
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        schemas: [{
          uri: "http://myschema/",
          fileMatch: ["*"],
          schema: {
            type: "object",
            properties: {
              product: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  title: { type: "string" },
                  handle: { type: "string" },
                  description: { type: "string" },
                  price: { type: "number" },
                  vendor: { type: "string" },
                  type: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  variants: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        title: { type: "string" },
                        price: { type: "number" },
                        sku: { type: "string" },
                        available: { type: "boolean" }
                      }
                    }
                  }
                }
              }
            }
          }
        }]
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
  }, [debouncedOnChange, editorValue])

  // 只在值真正改变时才更新编辑器内容
  useEffect(() => {
    if (monacoEditorRef.current && !isUpdatingRef.current) {
      const currentValue = monacoEditorRef.current.getValue()
      if (editorValue !== currentValue) {
        isUpdatingRef.current = true
        const position = monacoEditorRef.current.getPosition()
        const scrollTop = monacoEditorRef.current.getScrollTop()
        const scrollLeft = monacoEditorRef.current.getScrollLeft()
        
        monacoEditorRef.current.setValue(editorValue)
        
        // 恢复光标位置和滚动位置
        monacoEditorRef.current.setPosition(position)
        monacoEditorRef.current.setScrollTop(scrollTop)
        monacoEditorRef.current.setScrollLeft(scrollLeft)
        
        isUpdatingRef.current = false
      }
    }
  }, [editorValue])

  return (
    <div className="product-data-editor-wrapper">
      <div className="product-data-editor-header">
        <span>商品数据编辑器</span>
        <div className="editor-actions">
          <button 
            className="format-btn"
            onClick={() => {
              if (monacoEditorRef.current) {
                monacoEditorRef.current.getAction('editor.action.formatDocument').run()
              }
            }}
          >
            格式化
          </button>
        </div>
      </div>
      <div ref={editorRef} className="monaco-editor" />
    </div>
  )
}

export default ProductDataEditor 