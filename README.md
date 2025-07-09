# Shopify 主题发布工具

一个用于发布 Shopify 主题 Section 和 Template 的工具，支持通过 Node.js 代理服务器解决跨域问题。

## 功能特性

- 🚀 一键发布 Shopify 主题
- 📝 同时更新 Section 和 Template 文件
- 🔒 通过代理服务器解决跨域问题
- 🎨 简洁直观的用户界面
- ✅ 实时连接测试和状态反馈
- 🔄 自动端口冲突处理

## 系统架构

```
前端 (React) → Node.js 代理服务器 → Shopify GraphQL API
```

## 安装和运行

### 1. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd src && npm install
```

或者使用一键安装：

```bash
npm run install-all
```

### 2. 启动服务

```bash
# 启动完整服务（前端 + 后端，自动清理端口）
npm start
```

或者分别启动：

```bash
# 清理端口冲突
npm run cleanup

# 启动后端代理服务器
npm run server

# 启动前端开发服务器
npm run frontend
```

### 3. 访问应用

- 前端界面：http://localhost:5173
- 后端代理：http://localhost:3001 (或自动分配的端口)
- 健康检查：http://localhost:3001/api/health

## 端口冲突解决方案

如果遇到端口冲突，系统会自动处理：

1. **自动端口分配**：如果默认端口 3001 被占用，系统会自动尝试 3002、3003 等端口
2. **端口清理**：使用 `npm run cleanup` 清理可能被占用的端口
3. **动态检测**：前端会自动检测代理服务器的实际运行端口

### 手动清理端口

```bash
# 清理端口 3001-3005
npm run cleanup

# 或者手动终止进程
lsof -ti:3001 | xargs kill -9
```

## 配置说明

### Shopify 访问令牌

在 `server.js` 中配置您的 Shopify 访问令牌：

```javascript
'X-Shopify-Access-Token': 'your_access_token_here'
```

### 默认店铺域名

在 `src/utils/shopifyService.js` 中配置默认店铺域名：

```javascript
this.defaultShopDomain = 'your-shop.myshopify.com'
```

## 使用说明

### 1. 输入店铺信息

- **店铺域名**：例如 `shopie-test.myshopify.com`
- **主题ID**：会自动填充，也可以手动修改

### 2. 配置文件信息

- **Section 名称**：例如 `salerio_product_page`
- **模板名称**：例如 `product.salerio`

### 3. 测试连接

点击"测试连接"按钮验证与 Shopify 的连接。

### 4. 发布主题

输入 Liquid 代码后，点击"🚀 发布主题"按钮。

## API 接口

### GraphQL 代理接口

```
POST /api/shopify/graphql
```

请求体：
```json
{
  "shopDomain": "your-shop.myshopify.com",
  "query": "GraphQL查询语句",
  "variables": {}
}
```

### 健康检查接口

```
GET /api/health
```

## 文件结构

```
example/
├── server.js              # Node.js 代理服务器
├── start.js               # 启动脚本
├── cleanup-ports.js       # 端口清理脚本
├── test-proxy.js          # 代理测试脚本
├── package.json           # 后端依赖
├── README.md              # 说明文档
└── src/                   # 前端代码
    ├── components/
    │   ├── Publish.jsx    # 发布组件
    │   └── Publish.css    # 样式文件
    └── utils/
        └── shopifyService.js  # Shopify 服务
```

## 注意事项

1. **跨域问题**：前端不能直接调用 Shopify GraphQL API，需要通过代理服务器
2. **访问令牌**：确保您的 Shopify 访问令牌有足够的权限
3. **店铺域名**：使用完整的店铺域名，包含 `.myshopify.com`
4. **主题ID**：确保主题ID格式正确，通常以 `gid://shopify/OnlineStoreTheme/` 开头
5. **端口冲突**：系统会自动处理端口冲突，无需手动干预

## 故障排除

### 连接失败

1. 检查店铺域名是否正确
2. 验证访问令牌是否有效
3. 确认代理服务器是否正常运行
4. 运行 `npm run test-proxy` 测试代理服务器

### 发布失败

1. 检查主题ID是否正确
2. 验证 Liquid 代码语法
3. 查看控制台错误信息

### 端口冲突

1. 运行 `npm run cleanup` 清理端口
2. 重新启动服务 `npm start`
3. 检查是否有其他应用占用端口

## 开发

### 开发模式

```bash
# 后端开发模式（自动重启）
npm run dev

# 前端开发模式
npm run frontend
```

### 构建生产版本

```bash
npm run build
```

### 测试代理服务器

```bash
npm run test-proxy
```

## 许可证

MIT License 