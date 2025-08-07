import React, { useState, useEffect } from 'react'
import ShopifyService from '../utils/shopifyService'
import './Publish.css'

const Publish = ({ liquidCode, onPublishSuccess, onPublishError, productData = null }) => {
  const [mode, setMode] = useState('publish') // 'publish' 或 'import'
  const [shopDomain, setShopDomain] = useState('shopie-test.myshopify.com')
  const [sectionName, setSectionName] = useState('salerio_product_page')
  const [templateName, setTemplateName] = useState('product.salerio')
  const [themeId, setThemeId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [publishStatus, setPublishStatus] = useState(null)
  const [currentTheme, setCurrentTheme] = useState(null)

  // 商品导入相关状态
  const [templateSuffix, setTemplateSuffix] = useState('salerio')
  const [importStatus, setImportStatus] = useState(null)
  const [importedProduct, setImportedProduct] = useState(null)
  const [productUrl, setProductUrl] = useState(null)

  const shopifyService = new ShopifyService()

  // 当主题信息加载后，自动填充主题ID
  useEffect(() => {
    if (currentTheme && !themeId) {
      console.log("当前主题id",currentTheme)
      setThemeId(currentTheme.id)
    }
  }, [currentTheme, themeId])

  // 测试连接
  const testConnection = async () => {
    if (!shopDomain) {
      alert('请输入店铺域名')
      return
    }

    setIsLoading(true)
    setConnectionStatus(null)
    
    try {
      const isConnected = await shopifyService.testConnection(shopDomain)
      setConnectionStatus(isConnected ? 'success' : 'error')
      
      if (isConnected) {
        // 如果连接成功，自动获取主题信息
        await loadThemeData()
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('连接测试失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 加载主题数据
  const loadThemeData = async () => {
    if (!shopDomain) {
      alert('请输入店铺域名')
      return
    }

    setIsLoading(true)
    try {
      const themeResult = await shopifyService.getTheme(shopDomain)
      setCurrentTheme(themeResult.theme)
      if (themeResult.theme) {
        setThemeId(themeResult.theme.id)
      }
    } catch (error) {
      console.error('加载主题数据失败:', error)
      alert('加载主题数据失败，请检查店铺域名和权限')
    } finally {
      setIsLoading(false)
    }
  }

  // 发布主题更新（section + template）
  const publishTheme = async () => {
    if (!shopDomain) {
      alert('请输入店铺域名')
      return
    }

    if (!themeId) {
      alert('请输入主题ID')
      return
    }

    if (!sectionName || !liquidCode) {
      alert('请输入 section 名称和 Liquid 代码')
      return
    }

    setIsLoading(true)
    setPublishStatus(null)
    
    try {
      // 构建模板JSON内容
      const templateJson = {
        sections: {
          main: {
            type: sectionName,
            settings: {}
          }
        },
        order: ["main"]
      }

      const result = await shopifyService.publishTemplateLiquid(
        templateName,
        liquidCode,
        shopDomain
      )
      
      setPublishStatus('success')
      await loadThemeData() // 重新加载数据
      
      if (onPublishSuccess) {
        onPublishSuccess(result)
      }
      
      alert('主题发布成功！Section 和模板都已更新。')
    } catch (error) {
      setPublishStatus('error')
      console.error('主题发布失败:', error)
      
      if (onPublishError) {
        onPublishError(error)
      }
      
      alert(`主题发布失败: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 导入商品
  const importProduct = async () => {
    if (!shopDomain) {
      alert('请输入店铺域名')
      return
    }

    if (!productData) {
      alert('没有商品数据可导入')
      return
    }

    setIsLoading(true)
    setImportStatus(null)
    setImportedProduct(null)
    setProductUrl(null)
    
    try {
      const result = await shopifyService.importAndPublishProductFromData(
        productData,
        templateSuffix,
        shopDomain
      )
      
      setImportStatus('success')
      console.log(result)
      setImportedProduct(result.product)
      setProductUrl(result.productUrl)
      
      alert('商品导入并发布成功！')
    } catch (error) {
      setImportStatus('error')
      console.error('商品导入并发布失败:', error)
      alert(`商品导入并发布失败: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 生成商品链接
  const generateProductLink = (handle) => {
    if (!shopDomain || !handle) return ''
    return `https://${shopDomain}/products/${handle}`
  }

  // 预览商品数据
  const previewProductData = () => {
    if (!productData) return null
    
    const productSet = shopifyService.convertToProductSet(productData)
    return (
      <div className="theme-info">
        <h3>商品数据预览</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>商品标题:</strong> {productSet.title || '未设置'}
          </div>
          <div className="info-item">
            <strong>商品描述:</strong> 
            <div className="description-preview">
              {productSet.descriptionHtml ? 
                productSet.descriptionHtml.substring(0, 100) + (productSet.descriptionHtml.length > 100 ? '...' : '') : 
                '未设置'
              }
            </div>
          </div>
          <div className="info-item">
            <strong>变体数量:</strong> {productSet.variants?.length || 0}
          </div>
          <div className="info-item">
            <strong>选项数量:</strong> {productSet.productOptions?.length || 0}
          </div>
          <div className="info-item">
            <strong>图片数量:</strong> {productSet.files?.length || 0}
          </div>
          {productSet.productOptions?.length > 0 && (
            <div className="info-item">
              <strong>选项详情:</strong>
              <div className="description-preview">
                {productSet.productOptions.map(option => 
                  `${option.name}: ${option.values?.map(v => v.name).join(', ')}`
                ).join('; ')}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="publish-container">
      <h2>Shopify 主题管理</h2>
      
      {/* 模式选择器 */}
      <div className="publish-mode-selector">
        <button 
          className={`mode-btn ${mode === 'publish' ? 'active' : ''}`}
          onClick={() => setMode('publish')}
        >
          📝 发布主题
        </button>
        <button 
          className={`mode-btn ${mode === 'import' ? 'active' : ''}`}
          onClick={() => setMode('import')}
        >
          📦 导入并发布商品
        </button>
      </div>

      {/* 发布主题模式 */}
      {mode === 'publish' && (
        <div className="publish-form">
          <div className="form-group">
            <label htmlFor="shopDomain">店铺域名:</label>
            <input
              type="text"
              id="shopDomain"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="例如: shopie-test.myshopify.com"
            />
            <small className="help-text">输入您的 Shopify 店铺域名</small>
          </div>

          <div className="form-group">
            <label htmlFor="themeId">主题ID:</label>
            <input
              type="text"
              id="themeId"
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              placeholder="例如: gid://shopify/OnlineStoreTheme/140128157894"
            />
            <small className="help-text">主题ID会自动填充，也可以手动修改</small>
          </div>

          <div className="form-group">
            <label htmlFor="sectionName">Section 名称:</label>
            <input
              type="text"
              id="sectionName"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="例如: salerio_product_page"
            />
            <small className="help-text">这将是您的 section 文件名（不含 .liquid 扩展名）</small>
          </div>

          <div className="form-group">
            <label htmlFor="templateName">模板名称:</label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="例如: product.salerio"
            />
            <small className="help-text">这将是您的模板文件名（不含 .json 扩展名）</small>
          </div>

          <div className="button-group">
            <button 
              onClick={testConnection}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              {isLoading ? '测试中...' : '测试连接'}
            </button>

            <button 
              onClick={loadThemeData}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              {isLoading ? '加载中...' : '加载主题数据'}
            </button>
          </div>

          {connectionStatus && (
            <div className={`status-message ${connectionStatus}`}>
              {connectionStatus === 'success' ? '✅ 连接成功！' : '❌ 连接失败，请检查配置'}
            </div>
          )}

          {currentTheme && (
            <div className="theme-info">
              <h3>当前主题信息</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>主题名称:</strong> {currentTheme.name}
                </div>
                <div className="info-item">
                  <strong>主题角色:</strong> 
                  <span className={`status ${currentTheme.role?.toLowerCase()}`}>
                    {currentTheme.role === 'MAIN' ? '主主题' : currentTheme.role}
                  </span>
                </div>
                <div className="info-item">
                  <strong>主题ID:</strong> {currentTheme.id}
                </div>
              </div>
            </div>
          )}

          <div className="action-buttons">
            <button 
              onClick={publishTheme}
              disabled={isLoading || !liquidCode || !shopDomain || !themeId}
              className="btn btn-primary"
            >
              {isLoading ? '发布中...' : '🚀 发布主题'}
            </button>
          </div>

          {publishStatus && (
            <div className={`status-message ${publishStatus}`}>
              {publishStatus === 'success' && '✅ 主题发布成功！'}
              {publishStatus === 'error' && '❌ 发布失败，请查看控制台错误信息'}
            </div>
          )}

          {!liquidCode && (
            <div className="warning-message">
              ⚠️ 请先输入 Liquid 代码才能发布主题
            </div>
          )}
        </div>
      )}

      {/* 导入商品模式 */}
      {mode === 'import' && (
        <div className="publish-form">
          <div className="form-group">
            <label htmlFor="importShopDomain">店铺域名:</label>
            <input
              type="text"
              id="importShopDomain"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              placeholder="例如: shopie-test.myshopify.com"
            />
            <small className="help-text">输入您的 Shopify 店铺域名</small>
          </div>

          <div className="form-group">
            <label htmlFor="templateSuffix">模板后缀:</label>
            <input
              type="text"
              id="templateSuffix"
              value={templateSuffix}
              onChange={(e) => setTemplateSuffix(e.target.value)}
              placeholder="例如: salerio"
            />
            <small className="help-text">选择生效的商品页面模板后缀</small>
          </div>

          <div className="button-group">
            <button 
              onClick={testConnection}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              {isLoading ? '测试中...' : '测试连接'}
            </button>
          </div>

          {connectionStatus && (
            <div className={`status-message ${connectionStatus}`}>
              {connectionStatus === 'success' ? '✅ 连接成功！' : '❌ 连接失败，请检查配置'}
            </div>
          )}

          {/* 商品数据预览 */}
          {previewProductData()}

          <div className="action-buttons">
            <button 
              onClick={importProduct}
              disabled={isLoading || !productData || !shopDomain}
              className="btn btn-success"
            >
              {isLoading ? '导入并发布中...' : '📦 导入并发布商品'}
            </button>
          </div>

          {importStatus && (
            <div className={`status-message ${importStatus}`}>
              {importStatus === 'success' && '✅ 商品导入并发布成功！'}
              {importStatus === 'error' && '❌ 导入并发布失败，请查看控制台错误信息'}
            </div>
          )}

          {!productData && (
            <div className="warning-message">
              ⚠️ 没有商品数据可导入，请先提供商品详情数据
            </div>
          )}

          {importedProduct && (
            <div className="theme-info">
              <h3>导入的商品信息</h3>
              <div className="info-grid">
                <div className="info-item">
                  <strong>商品标题:</strong> {importedProduct.title}
                </div>
                <div className="info-item">
                  <strong>商品Handle:</strong> {importedProduct.handle}
                </div>
                <div className="info-item">
                  <strong>商品状态:</strong> 
                  <span className={`status ${importedProduct.status?.toLowerCase()}`}>
                    {importedProduct.status === 'ACTIVE' ? '已发布' : '草稿'}
                  </span>
                </div>
                <div className="info-item">
                  <strong>商品链接:</strong> 
                  {productUrl ? (
                    <a 
                      href={productUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="product-link"
                    >
                      {productUrl}
                    </a>
                  ) : (
                    <span>链接生成中...</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Publish 