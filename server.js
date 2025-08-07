const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')

const app = express()
const PORT = process.env.PORT || 3001
// 中间件
app.use(cors())
app.use(express.json())

// Shopify GraphQL 代理接口
app.post('/api/shopify/graphql', async (req, res) => {
  try {
    const { shopDomain, query, variables } = req.body
    
    if (!shopDomain || !query) {
      return res.status(400).json({
        error: '缺少必要参数: shopDomain 和 query'
      })
    }

    // 构建 Shopify GraphQL URL
    const shopifyUrl = `https://${shopDomain}/admin/api/2025-04/graphql.json`
    
    // 调用 Shopify GraphQL API
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': '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'
      },
      body: JSON.stringify({
        query,
        variables: variables || {}
      })
    })

    if (!response.ok) {
      throw new Error(`Shopify API 错误: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // 检查 GraphQL 错误
    if (data.errors) {
      console.error('GraphQL 错误:', data.errors)
      return res.status(400).json({
        error: 'GraphQL 查询错误',
        details: data.errors
      })
    }

    res.json(data)
  } catch (error) {
    console.error('代理请求失败:', error)
    res.status(500).json({
      error: '代理请求失败',
      message: error.message
    })
  }
})

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Shopify 代理服务运行正常' })
})

// 启动服务器（带端口冲突处理）
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`🚀 Shopify 代理服务器运行在端口 ${port}`)
    console.log(`📡 GraphQL 代理接口: http://localhost:${port}/api/shopify/graphql`)
    console.log(`💚 健康检查: http://localhost:${port}/api/health`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`⚠️  端口 ${port} 已被占用，尝试端口 ${port + 1}`)
      startServer(port + 1)
    } else {
      console.error('服务器启动失败:', error)
    }
  })

  return server
}

startServer(PORT)

module.exports = app 