# Shopify GraphQL 代理服务器

这是一个用于代理 Shopify GraphQL API 请求的 Express 服务器。

## 环境变量配置

在运行服务器之前，请设置以下环境变量：

### 必需的环境变量

- `SHOPIFY_ACCESS_TOKEN`: 您的 Shopify 访问令牌

### 可选的环境变量

- `PORT`: 服务器端口（默认为 3001）

## 设置步骤

1. 设置环境变量：

```bash
# 设置 Shopify 访问令牌
export SHOPIFY_ACCESS_TOKEN=your_shopify_access_token_here

# 可选：设置端口
export PORT=3001
```

2. 安装依赖：

```bash
npm install
```

3. 启动服务器：

```bash
node server.js
```

## API 接口

### POST /api/shopify/graphql

代理 Shopify GraphQL 请求。

**请求体：**
```json
{
  "shopDomain": "your-shop.myshopify.com",
  "query": "your_graphql_query",
  "variables": {}
}
```

### GET /api/health

健康检查接口。

## 安全注意事项

- 请确保您的 `SHOPIFY_ACCESS_TOKEN` 安全存储，不要提交到版本控制系统
- 建议在生产环境中使用 `.env` 文件或环境变量管理系统
- 定期轮换您的访问令牌 