import React, { useState, useEffect, useCallback } from 'react'
import Editor from './components/Editor'
import ProductDataEditor from './components/ProductDataEditor'
import Preview from './components/Preview'
import Publish from './components/Publish'
import AITestButton from './components/AITestButton'
import AIUsageExamples from './components/AIUsageExamples'
import { LiquidEngine } from './utils/liquidEngine'
import { mockData } from './data/mockData'
import './App.css'

function App() {
  const [liquidCode, setLiquidCode] = useState('')
  const [productData, setProductData] = useState(mockData)
  const [renderedHtml, setRenderedHtml] = useState('')
  const [viewMode, setViewMode] = useState('split') // 'code', 'preview', 'split', 'publish'
  const [editorType, setEditorType] = useState('template') // 'template', 'data'
  const [liquidEngine] = useState(new LiquidEngine())
  const [templateType, setTemplateType] = useState('product-page') // 'product-page', 'product-page-section'

  useEffect(() => {
    // 加载默认的productPage.liquid内容
    loadTemplate(templateType)
  }, [templateType])

  const loadTemplate = useCallback(async (type) => {
    let templatePath = ''
    switch (type) {
      case 'product-page-section':
        templatePath = '/src/data/product-page-section.liquid'
        break
      default:
        templatePath = '/src/data/productPage.liquid'
    }

    try {
      const response = await fetch(templatePath)
      if (response.ok) {
        const content = await response.text()
        setLiquidCode(content)
        renderLiquidWithData(content, productData)
      } else {
        throw new Error('Template not found')
      }
    } catch (error) {
      // 如果文件不存在，使用默认内容
      const defaultContent = `{% comment %}
这是一个示例Liquid模板
{% endcomment %}
<div class="product-page">
  <h1>{{ product.title }}</h1>
  <p>价格: {{ product.price | money }}</p>
  <img src="{{ product.featured_image | img_url: '400x400' }}" alt="{{ product.title }}">
</div>`
      setLiquidCode(defaultContent)
      renderLiquidWithData(defaultContent, productData)
    }
  }, [productData])

  const renderLiquidWithData = useCallback(async (code, data) => {
    console.log('App.jsx: renderLiquidWithData被调用，代码长度:', code.length)
    try {
      const html = await liquidEngine.render(code, data)
      console.log('App.jsx: Liquid渲染成功，HTML长度:', html.length)
      setRenderedHtml(html)
    } catch (error) {
      console.error('Liquid渲染错误:', error)
      setRenderedHtml(`<div class="error">渲染错误: ${error.message}</div>`)
    }
  }, [liquidEngine])

  const handleCodeChange = useCallback((newCode) => {
    console.log('App.jsx: handleCodeChange被调用，代码长度:', newCode.length)
    setLiquidCode(newCode)
    renderLiquidWithData(newCode, productData)
  }, [productData, renderLiquidWithData])

  const handleDataChange = useCallback((newData) => {
    setProductData(newData)
    // 直接使用新数据渲染，不依赖状态更新
    renderLiquidWithData(liquidCode, newData)
  }, [liquidCode, renderLiquidWithData])

  const handlePublishSuccess = useCallback((product) => {
    console.log('商品发布成功:', product)
    // 可以在这里添加成功后的处理逻辑
  }, [])

  const handlePublishError = useCallback((error) => {
    console.error('发布失败:', error)
    // 可以在这里添加错误处理逻辑
  }, [])

  // 转换productData为适合Shopify导入的格式
  const convertProductDataForImport = useCallback(() => {
    if (!productData || !productData.product) {
      return null
    }

    const product = productData.product
    
    // 从变体中提取选项信息
    const optionValues = [...new Set(product.variants?.map(v => v.option1).filter(Boolean) || [])]
    const optionName = product.variants?.[0]?.options?.[0] ? 'Color' : 'Option'
    
    // 转换变体数据 - 适配真实的productSet结构
    const variants = product.variants?.map(variant => ({
      price: (variant.price / 100).toFixed(2), // 转换为美元格式
      sku: variant.sku || '',
      file: {
        alt: variant.featured_image?.alt || variant.title || '',
        contentType: "IMAGE",
        filename: variant.featured_image?.src?.split('/').pop() || '',
        originalSource: variant.featured_image?.src ? 
          (variant.featured_image.src.startsWith('//') ? `https:${variant.featured_image.src}` : variant.featured_image.src) : 
          'https://example.com/placeholder.jpg'
      },
      optionValues: [
        {
          name: variant.option1 || variant.title || '',
          optionName: optionName
        }
      ]
    })) || []

    // 转换选项数据 - 从变体中提取
    const productOptions = optionValues.length > 0 ? [{
      name: optionName,
      position: 1,
      values: optionValues.map(value => ({
        name: value
      }))
    }] : []

    // 转换图片数据 - 从变体的featured_image中提取
    const files = product.variants?.map(variant => ({
      alt: variant.featured_image?.alt || variant.title || '',
      contentType: "IMAGE",
      filename: variant.featured_image?.src?.split('/').pop() || '',
      originalSource: variant.featured_image?.src ? 
        (variant.featured_image.src.startsWith('//') ? `https:${variant.featured_image.src}` : variant.featured_image.src) : 
        'https://example.com/placeholder.jpg'
    })).filter(file => file.originalSource !== 'https://example.com/placeholder.jpg') || []

    // 构建适合Shopify导入的商品数据 - 使用真实的productSet结构
    return {
      title: product.title || '',
      descriptionHtml: product.description || product.body_html || '',
      files: files,
      productOptions: productOptions,
      variants: variants
    }
  }, [productData])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Shopify Liquid 页面编辑器</h1>
        <div className="header-controls">
          <div className="template-selector">
            <label htmlFor="templateType">模板类型:</label>
            <select 
              id="templateType"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value)}
            >
              <option value="product-page">商品页面模板</option>
              <option value="product-page-section">商品页面 Section</option>
            </select>
          </div>
          <div className="view-controls">
            <button 
              className={viewMode === 'code' ? 'active' : ''} 
              onClick={() => setViewMode('code')}
            >
              代码
            </button>
            <button 
              className={viewMode === 'preview' ? 'active' : ''} 
              onClick={() => setViewMode('preview')}
            >
              预览
            </button>
            <button 
              className={viewMode === 'split' ? 'active' : ''} 
              onClick={() => setViewMode('split')}
            >
              分屏
            </button>
            <button 
              className={viewMode === 'publish' ? 'active' : ''} 
              onClick={() => setViewMode('publish')}
            >
              发布
            </button>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        {viewMode === 'publish' ? (
          <div className="publish-view">
            <Publish 
              liquidCode={liquidCode}
              productData={convertProductDataForImport()}
              onPublishSuccess={handlePublishSuccess}
              onPublishError={handlePublishError}
            />
          </div>
        ) : (
          <>
            {(viewMode === 'code' || viewMode === 'split') && (
              <div className={`editor-container ${viewMode === 'split' ? 'split' : 'full'}`}>
                <div className="editor-tabs">
                  <button 
                    className={`tab-btn ${editorType === 'template' ? 'active' : ''}`}
                    onClick={() => setEditorType('template')}
                  >
                    模板编辑器
                  </button>
                  <button 
                    className={`tab-btn ${editorType === 'data' ? 'active' : ''}`}
                    onClick={() => setEditorType('data')}
                  >
                    商品数据
                  </button>
                </div>
                <div className="editor-content">
                  {editorType === 'template' ? (
                    <>
                      <Editor 
                        value={liquidCode} 
                        onChange={handleCodeChange}
                        productData={productData}
                      />
                    </>
                  ) : (
                    <ProductDataEditor 
                      value={productData} 
                      onChange={handleDataChange}
                    />
                  )}
                </div>
              </div>
            )}
            
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div className={`preview-container ${viewMode === 'split' ? 'split' : 'full'}`}>
                <Preview html={renderedHtml} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App 