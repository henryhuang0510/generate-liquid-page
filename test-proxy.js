const fetch = require('node-fetch')

async function detectProxyPort() {
  const ports = [3001, 3002, 3003, 3004, 3005]
  
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        method: 'GET',
        timeout: 1000
      })
      
      if (response.ok) {
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

async function testProxy() {
  console.log('🧪 测试代理服务器...')
  
  try {
    // 检测代理服务器端口
    const port = await detectProxyPort()
    
    // 测试健康检查
    console.log('1. 测试健康检查...')
    const healthResponse = await fetch(`http://localhost:${port}/api/health`)
    const healthData = await healthResponse.json()
    console.log('健康检查结果:', healthData)
    
    // 测试 GraphQL 代理
    console.log('2. 测试 GraphQL 代理...')
    const graphqlResponse = await fetch(`http://localhost:${port}/api/shopify/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shopDomain: 'shopie-test.myshopify.com',
        query: `
          query {
            shop {
              name
              id
            }
          }
        `
      })
    })
    
    const graphqlData = await graphqlResponse.json()
    console.log('GraphQL 代理结果:', graphqlData)
    
    if (graphqlData.data?.shop) {
      console.log('✅ 代理服务器工作正常！')
    } else {
      console.log('❌ 代理服务器可能有问题')
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

// 运行测试
testProxy() 