class ShopifyService {
  constructor() {
    this.defaultShopDomain = 'shopie-test.myshopify.com'
    this.proxyPort = 3001 // 默认端口
    this.proxyUrl = `http://localhost:${this.proxyPort}/api/shopify/graphql`
  }

  /**
   * 检测代理服务器端口
   * @returns {Promise<number>} 可用的端口
   */
  async detectProxyPort() {
    const ports = [3001, 3002, 3003, 3004, 3005]

    for (const port of ports) {
      try {
        const response = await fetch(`http://localhost:${port}/api/health`, {
          method: 'GET',
          timeout: 1000
        })

        if (response.ok) {
          this.proxyPort = port
          this.proxyUrl = `http://localhost:${port}/api/shopify/graphql`
          console.log(`✅ 检测到代理服务器运行在端口 ${port}`)
          return port
        }
      } catch (error) {
        // 继续尝试下一个端口
        continue
      }
    }

    throw new Error('未找到可用的代理服务器端口')
  }

  /**
   * 调用 Shopify GraphQL API（通过代理）
   * @param {string} query - GraphQL 查询语句
   * @param {object} variables - 查询变量
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} API 响应结果
   */
  async callGraphQL(query, variables = {}, shopDomain = null) {
    try {
      // 确保代理服务器端口已检测
      if (!this.proxyUrl.includes('localhost')) {
        await this.detectProxyPort()
      }

      const domain = shopDomain || this.defaultShopDomain

      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopDomain: domain,
          query,
          variables
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`代理请求失败: ${response.status} - ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      console.log('GraphQL Response:', data)

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
      }

      return data.data
    } catch (error) {
      console.error('Shopify GraphQL 调用失败:', error)
      throw error
    }
  }

  /**
   * 获取商品详情
   * @param {string} productId - 商品ID
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 商品信息
   */
  async getProduct(productId, shopDomain = null) {
    const query = `
      query GetProduct($productId: ID!) {
        product(id: $productId) {
          id
          title
          handle
          status
          description
          options {
            id
            name
            values
          }
          metafields(first: 5) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }
    `

    return this.callGraphQL(query, { productId }, shopDomain)
  }

  /**
   * 更新商品信息
   * @param {string} productId - 商品ID
   * @param {object} input - 要更新的商品信息
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async updateProduct(productId, input, shopDomain = null) {
    const query = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            handle
            status
            description
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      input: {
        id: productId,
        ...input
      }
    }

    return this.callGraphQL(query, variables, shopDomain)
  }

  /**
   * 发布商品（将商品状态设置为 ACTIVE）
   * @param {string} productId - 商品ID
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 发布结果
   */
  async publishProduct(productId, shopDomain = null) {
    return this.updateProduct(productId, { status: 'ACTIVE' }, shopDomain)
  }

  /**
   * 取消发布商品（将商品状态设置为 DRAFT）
   * @param {string} productId - 商品ID
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 取消发布结果
   */
  async unpublishProduct(productId, shopDomain = null) {
    return this.updateProduct(productId, { status: 'DRAFT' }, shopDomain)
  }

  /**
   * 更新商品描述
   * @param {string} productId - 商品ID
   * @param {string} description - 新的商品描述
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async updateProductDescription(productId, description, shopDomain = null) {
    return this.updateProduct(productId, { description }, shopDomain)
  }

  /**
   * 更新商品标题
   * @param {string} productId - 商品ID
   * @param {string} title - 新的商品标题
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async updateProductTitle(productId, title, shopDomain = null) {
    return this.updateProduct(productId, { title }, shopDomain)
  }

  /**
   * 批量更新商品信息
   * @param {string} productId - 商品ID
   * @param {object} updates - 要更新的字段
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async batchUpdateProduct(productId, updates, shopDomain = null) {
    return this.updateProduct(productId, updates, shopDomain)
  }

  /**
   * 获取商品列表
   * @param {number} first - 获取数量
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 商品列表
   */
  async getProducts(first = 10, shopDomain = null) {
    const query = `
      query GetProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              status
              description
              createdAt
              updatedAt
            }
          }
        }
      }
    `

    return this.callGraphQL(query, { first }, shopDomain)
  }

  /**
   * 测试连接
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<boolean>} 连接是否成功
   */
  async testConnection(shopDomain = null) {
    try {
      const query = `
        query {
          shop {
            name
            id
          }
        }
      `

      const result = await this.callGraphQL(query, {}, shopDomain)
      console.log('连接测试结果:', result)
      return !!result?.shop
    } catch (error) {
      console.error('连接测试失败:', error)
      return false
    }
  }

  /**
   * 获取当前主题信息
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 主题信息
   */
  async getCurrentTheme(shopDomain = null) {
    const query = `
      query {
        themes(first: 1, roles: MAIN) {
          edges {
            node {
              id
              name
              role
            }
          }
        }
      }
    `

    return this.callGraphQL(query, {}, shopDomain)
  }

  /**
   * 获取所有主题
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 主题列表
   */
  async getThemes(shopDomain = null) {
    const query = `
      query {
        themes(first: 50) {
          edges {
            node {
              id
              name
              role
              createdAt
              updatedAt
            }
          }
        }
      }
    `

    return this.callGraphQL(query, {}, shopDomain)
  }

  /**
   * 更新主题文件
   * @param {string} themeId - 主题ID
   * @param {Array} files - 要更新的文件数组
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async updateThemeFiles(themeId, files, shopDomain = null) {
    const query = `
      mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      themeId,
      files
    }

    return this.callGraphQL(query, variables, shopDomain)
  }

  /**
   * 发布主题 section 文件
   * @param {string} sectionName - section 名称，例如 'product-page-general'
   * @param {string} liquidCode - Liquid 代码内容
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 发布结果
   */
  async publishSection(sectionName, liquidCode, shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 准备要更新的文件
      const files = [
        {
          filename: `sections/${sectionName}.liquid`,
          body: {
            type: "TEXT",
            value: liquidCode
          }
        }
      ]

      // 3. 更新主题文件
      const result = await this.updateThemeFiles(currentTheme.id, files, shopDomain)

      if (result.themeFilesUpsert.userErrors && result.themeFilesUpsert.userErrors.length > 0) {
        const errors = result.themeFilesUpsert.userErrors.map(error => error.message).join(', ')
        throw new Error(errors)
      }

      return {
        theme: currentTheme,
        files: result.themeFilesUpsert.upsertedThemeFiles,
        success: true
      }
    } catch (error) {
      console.error('Section 发布失败:', error)
      throw error
    }
  }

  /**
   * 更新主题 section 文件
   * @param {string} sectionName - section 名称
   * @param {string} liquidCode - Liquid 代码内容
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async updateSection(sectionName, liquidCode, shopDomain = null) {
    // 更新 section 实际上就是发布 section（upsert 操作）
    return this.publishSection(sectionName, liquidCode, shopDomain)
  }

  /**
   * 获取主题 section 列表
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} section 列表
   */
  async getSections(shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 获取主题文件列表
      const query = `
        query GetThemeFiles($themeId: ID!) {
          theme(id: $themeId) {
            files(first: 100) {
              edges {
                node {
                  filename
                  type
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      `

      const result = await this.callGraphQL(query, { themeId: currentTheme.id }, shopDomain)

      // 过滤出 section 文件
      const sections = result.theme.files.edges
        .filter(edge => edge.node.filename.startsWith('sections/'))
        .map(edge => ({
          id: edge.node.filename,
          name: edge.node.filename.replace('sections/', '').replace('.liquid', ''),
          filename: edge.node.filename,
          type: edge.node.type,
          createdAt: edge.node.createdAt,
          updatedAt: edge.node.updatedAt
        }))

      return {
        theme: currentTheme,
        sections: sections
      }
    } catch (error) {
      console.error('获取 sections 失败:', error)
      throw error
    }
  }

  /**
   * 获取特定 section 内容
   * @param {string} sectionName - section 名称
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} section 内容
   */
  async getSection(sectionName, shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      console.log('themeResult', themeResult);
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 获取特定文件内容
      const query = `
        query GetThemeFile($themeId: ID!, $filename: String!) {
          themeFile(themeId: $themeId, filename: $filename) {
            filename
            type
            content
            createdAt
            updatedAt
          }
        }
      `

      const result = await this.callGraphQL(query, {
        themeId: currentTheme.id,
        filename: `sections/${sectionName}.liquid`
      }, shopDomain)

      return {
        theme: currentTheme,
        section: result.themeFile
      }
    } catch (error) {
      console.error('获取 section 内容失败:', error)
      throw error
    }
  }

  /**
   * 更新模板配置
   * @param {string} templateName - 模板名称，例如 'product'
   * @param {object} templateConfig - 模板配置对象
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 更新结果
   */
  async updateTemplate(templateName, templateConfig, shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 准备要更新的文件
      const files = [
        {
          filename: `templates/${templateName}.json`,
          body: {
            type: "TEXT",
            value: JSON.stringify(templateConfig, null, 2)
          }
        }
      ]

      // 3. 更新主题文件
      const result = await this.updateThemeFiles(currentTheme.id, files, shopDomain)

      if (result.themeFilesUpsert.userErrors && result.themeFilesUpsert.userErrors.length > 0) {
        const errors = result.themeFilesUpsert.userErrors.map(error => error.message).join(', ')
        throw new Error(errors)
      }

      return {
        theme: currentTheme,
        files: result.themeFilesUpsert.upsertedThemeFiles,
        success: true
      }
    } catch (error) {
      console.error('Template 更新失败:', error)
      throw error
    }
  }

  /**
   * 获取模板列表
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 模板列表
   */
  async getTemplates(shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 获取主题文件列表
      const query = `
        query GetThemeFiles($themeId: ID!) {
          theme(id: $themeId) {
            files(first: 100) {
              edges {
                node {
                  filename
                  type
                  createdAt
                  updatedAt
                }
              }
            }
          }
        }
      `

      const result = await this.callGraphQL(query, { themeId: currentTheme.id }, shopDomain)

      // 过滤出模板文件
      const templates = result.theme.files.edges
        .filter(edge => edge.node.filename.startsWith('templates/'))
        .map(edge => ({
          id: edge.node.filename,
          name: edge.node.filename.replace('templates/', '').replace('.json', ''),
          filename: edge.node.filename,
          type: edge.node.type,
          createdAt: edge.node.createdAt,
          updatedAt: edge.node.updatedAt
        }))

      return {
        theme: currentTheme,
        templates: templates
      }
    } catch (error) {
      console.error('获取 templates 失败:', error)
      throw error
    }
  }

  /**
   * 获取特定模板内容
   * @param {string} templateName - 模板名称
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 模板内容
   */
  async getTemplate(templateName, shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 获取特定文件内容
      const query = `
        query GetThemeFile($themeId: ID!, $filename: String!) {
          themeFile(themeId: $themeId, filename: $filename) {
            filename
            type
            content
            createdAt
            updatedAt
          }
        }
      `

      const result = await this.callGraphQL(query, {
        themeId: currentTheme.id,
        filename: `templates/${templateName}.json`
      }, shopDomain)

      return {
        theme: currentTheme,
        template: result.themeFile
      }
    } catch (error) {
      console.error('获取 template 内容失败:', error)
      throw error
    }
  }

  /**
   * 直接将页面 liquid 发布到 template 中
   * @param {string} templateName - 模板名称，例如 'product'
   * @param {string} liquidCode - Liquid 代码内容
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 发布结果
   */
  async publishTemplateLiquid(templateName, liquidCode, shopDomain = null) {
    try {
      // 1. 获取当前主题
      const themeResult = await this.getCurrentTheme(shopDomain)
      console.log('themeResult', themeResult);
      const currentTheme = themeResult.themes.edges[0]?.node

      if (!currentTheme) {
        throw new Error('未找到当前主题')
      }

      // 2. 准备要更新的文件 - 直接发布为 .liquid 模板
      const files = [
        {
          filename: `templates/${templateName}.liquid`,
          body: {
            type: "TEXT",
            value: liquidCode
          }
        }
      ]

      // 3. 更新主题文件
      const result = await this.updateThemeFiles(currentTheme.id, files, shopDomain)

      if (result.themeFilesUpsert.userErrors && result.themeFilesUpsert.userErrors.length > 0) {
        const errors = result.themeFilesUpsert.userErrors.map(error => error.message).join(', ')
        throw new Error(errors)
      }

      return {
        theme: currentTheme,
        files: result.themeFilesUpsert.upsertedThemeFiles,
        success: true
      }
    } catch (error) {
      console.error('Template Liquid 发布失败:', error)
      throw error
    }
  }

  /**
   * 获取主题信息
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 主题信息
   */
  async getTheme(shopDomain = null) {
    const query = `
      query GetThemes {
        themes(first: 1, roles: MAIN) {
          edges {
            node {
              id
              name
              role
            }
          }
        }
      }
    `

    const result = await this.callGraphQL(query, {}, shopDomain)
    return {
      theme: result?.themes?.edges[0]?.node || null
    }
  }

  /**
   * 导入商品
   * @param {object} productSet - 商品数据
   * @param {string} templateSuffix - 模板后缀，例如 'salerio'
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 导入结果
   */
  async importProduct(productSet, templateSuffix = null, shopDomain = null) {
    const query = `
      mutation createProductAsynchronous($productSet: ProductSetInput!, $synchronous: Boolean!) {
        productSet(synchronous: $synchronous, input: $productSet) {
          product {
            id
            handle
            title
            status
          }
          productSetOperation {
            id
            status
            userErrors {
              code
              field
              message
            }
          }
          userErrors {
            code
            field
            message
          }
        }
      }
    `

    // 如果提供了模板后缀，添加到productSet中
    const productSetInput = templateSuffix
      ? { ...productSet, templateSuffix }
      : productSet

    const variables = {
      synchronous: true,
      productSet: productSetInput
    }

    try {
      const result = await this.callGraphQL(query, variables, shopDomain)

      if (result.productSet.userErrors && result.productSet.userErrors.length > 0) {
        const errors = result.productSet.userErrors.map(error => error.message).join(', ')
        throw new Error(errors)
      }

      // 生成商品详情页地址
      const domain = shopDomain || this.defaultShopDomain
      const productUrl = result.productSet.product?.handle ?
        `https://${domain}/products/${result.productSet.product.handle}` :
        null

      return {
        product: result.productSet.product,
        operation: result.productSet.productSetOperation,
        productUrl: productUrl,
        success: true
      }
    } catch (error) {
      console.error('商品导入失败:', error)
      throw error
    }
  }

  /**
   * 获取商品导入操作状态
   * @param {string} operationId - 操作ID
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 操作状态
   */
  async getProductSetOperationStatus(operationId, shopDomain = null) {
    const query = `
      query getProductSetOperation($id: ID!) {
        productSetOperation(id: $id) {
          id
          status
          progress
          userErrors {
            code
            field
            message
          }
        }
      }
    `

    const variables = {
      id: operationId
    }

    try {
      const result = await this.callGraphQL(query, variables, shopDomain)
      return result.productSetOperation
    } catch (error) {
      console.error('获取操作状态失败:', error)
      throw error
    }
  }

  /**
   * 将商品详情数据转换为 productSet 格式
   * @param {object} productData - 商品详情数据（模板渲染时的商品数据）
   * @returns {object} productSet 格式的数据
   */
  convertToProductSet(productData) {
    // 如果已经是正确的productSet格式，直接返回
    if (productData.title && productData.variants && productData.productOptions) {
      return productData
    }

    // 处理模板渲染时的商品数据格式
    const productSet = {
      title: productData.title || '',
      descriptionHtml: productData.description || productData.body_html || '',
      files: [],
      productOptions: [],
      variants: []
    }

    // 从变体中提取选项信息
    const optionValues = [...new Set(productData.variants?.map(v => v.option1).filter(Boolean) || [])]
    const optionName = productData.variants?.[0]?.options?.[0] ? 'Color' : 'Option'

    // 处理变体信息 - 支持多种数据格式
    if (productData.variants && productData.variants.length > 0) {
      productSet.variants = productData.variants.map(variant => ({
        price: variant.price || '0.00',
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
      }))
    }

    // 处理选项信息 - 从变体中提取
    if (optionValues.length > 0) {
      productSet.productOptions = [{
        name: optionName,
        position: 1,
        values: optionValues.map(value => ({
          name: value
        }))
      }]
    }

    // 处理图片信息 - 从变体的featured_image中提取
    if (productData.variants && productData.variants.length > 0) {
      productSet.files = productData.variants.map(variant => ({
        alt: variant.featured_image?.alt || variant.title || '',
        contentType: "IMAGE",
        filename: variant.featured_image?.src?.split('/').pop() || '',
        originalSource: variant.featured_image?.src ?
          (variant.featured_image.src.startsWith('//') ? `https:${variant.featured_image.src}` : variant.featured_image.src) :
          'https://example.com/placeholder.jpg'
      })).filter(file => file.originalSource !== 'https://example.com/placeholder.jpg')
    }

    // 处理其他可能的字段
    if (productData.handle) {
      productSet.handle = productData.handle
    }

    if (productData.published_at) {
      productSet.publishedAt = productData.published_at
    }

    if (productData.template_suffix) {
      productSet.templateSuffix = productData.template_suffix
    }

    return productSet
  }

  /**
   * 从商品详情数据导入商品
   * @param {object} productData - 商品详情数据
   * @param {string} templateSuffix - 模板后缀，例如 'salerio'
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 导入结果
   */
  async importProductFromData(productData, templateSuffix = null, shopDomain = null) {
    // 转换数据格式
    const productSet = this.convertToProductSet(productData)

    // 调用导入方法
    return this.importProduct(productSet, templateSuffix, shopDomain)
  }

  /**
   * 获取 publications 列表
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} publications 列表
   */
  async getPublications(shopDomain = null) {
    const query = `
      query GetPublications($first: Int!) {
        publications(first: $first) {
          nodes {
            id
            name
            supportsFuturePublishing
          }
        }
      }
    `

    return this.callGraphQL(query, { first: 10 }, shopDomain)
  }

  /**
   * 获取 Online Store publication
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} Online Store publication 信息
   */
  async getOnlineStorePublication(shopDomain = null) {
    try {
      const result = await this.getPublications(shopDomain)
      const onlineStorePublication = result.publications.nodes.find(
        pub => pub.name === 'Online Store'
      )
      
      if (!onlineStorePublication) {
        throw new Error('未找到 Online Store publication')
      }
      
      return onlineStorePublication
    } catch (error) {
      console.error('获取 Online Store publication 失败:', error)
      throw error
    }
  }

  /**
   * 发布商品到 Online Store
   * @param {string} productId - 商品ID
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 发布结果
   */
  async publishProductToOnlineStore(productId, shopDomain = null) {
    try {
      // 1. 获取 Online Store publication
      const onlineStorePublication = await this.getOnlineStorePublication(shopDomain)
      
      // 2. 发布商品
      const query = `
        mutation PublishProductToOnlineStore($id: ID!, $publicationId: ID!) {
          publishablePublish(id: $id, input: [{ publicationId: $publicationId }]) {
            publishable {
              ... on Product {
                id
                title
                handle
                status
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const variables = {
        id: productId,
        publicationId: onlineStorePublication.id
      }

      const result = await this.callGraphQL(query, variables, shopDomain)
      
      if (result.publishablePublish.userErrors && result.publishablePublish.userErrors.length > 0) {
        const errors = result.publishablePublish.userErrors.map(error => error.message).join(', ')
        throw new Error(errors)
      }

      return {
        product: result.publishablePublish.publishable,
        publication: onlineStorePublication,
        success: true
      }
    } catch (error) {
      console.error('发布商品到 Online Store 失败:', error)
      throw error
    }
  }

  /**
   * 从 Online Store 取消发布商品
   * @param {string} productId - 商品ID
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 取消发布结果
   */
  async unpublishProductFromOnlineStore(productId, shopDomain = null) {
    try {
      // 1. 获取 Online Store publication
      const onlineStorePublication = await this.getOnlineStorePublication(shopDomain)

      // 2. 取消发布商品
      const query = `
        mutation UnpublishProductFromOnlineStore($id: ID!, $publicationId: ID!) {
          publishableUnpublish(id: $id, publicationId: $publicationId) {
            publishable {
              ... on Product {
                id
                title
                handle
                status
                publishedOnPublication(publicationId: $publicationId)
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const variables = {
        id: productId,
        publicationId: onlineStorePublication.id
      }

      const result = await this.callGraphQL(query, variables, shopDomain)

      if (result.publishableUnpublish.userErrors && result.publishableUnpublish.userErrors.length > 0) {
        const errors = result.publishableUnpublish.userErrors.map(error => error.message).join(', ')
        throw new Error(errors)
      }

      return {
        product: result.publishableUnpublish.publishable,
        publication: onlineStorePublication,
        success: true
      }
    } catch (error) {
      console.error('从 Online Store 取消发布商品失败:', error)
      throw error
    }
  }

  /**
   * 导入商品并发布到 Online Store
   * @param {object} productSet - 商品数据
   * @param {string} templateSuffix - 模板后缀，例如 'salerio'
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 导入和发布结果
   */
  async importAndPublishProduct(productSet, templateSuffix = null, shopDomain = null) {
    try {
      // 1. 导入商品
      const importResult = await this.importProduct(productSet, templateSuffix, shopDomain)

      if (!importResult.success || !importResult.product) {
        throw new Error('商品导入失败')
      }

      // 2. 发布到 Online Store
      const publishResult = await this.publishProductToOnlineStore(importResult.product.id, shopDomain)

      return {
        import: importResult,
        publish: publishResult,
        product: publishResult.product,
        productUrl: importResult.productUrl,
        success: true
      }
    } catch (error) {
      console.error('导入并发布商品失败:', error)
      throw error
    }
  }

  /**
   * 从商品详情数据导入商品并发布到 Online Store
   * @param {object} productData - 商品详情数据
   * @param {string} templateSuffix - 模板后缀，例如 'salerio'
   * @param {string} shopDomain - 店铺域名，可选
   * @returns {Promise<object>} 导入和发布结果
   */
  async importAndPublishProductFromData(productData, templateSuffix = null, shopDomain = null) {
    // 转换数据格式
    const productSet = this.convertToProductSet(productData)

    // 调用导入并发布方法
    return this.importAndPublishProduct(productSet, templateSuffix, shopDomain)
  }
}

export default ShopifyService 