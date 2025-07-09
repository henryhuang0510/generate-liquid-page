import { llmService } from './llmService'

// 消息类型定义
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

export const ContentType = {
  TEXT: 'text',
  CODE: 'code',
  PATCH: 'patch'
}

// 构建系统提示词
const buildSystemPrompt = () => {
  return `你是一个专业的 Shopify Liquid 模板开发助手。

请严格遵循以下规则：
1. 只返回有效的 Git diff patch，不要包含任何解释文字、注释或其他内容
2. patch 不要包含文件名和行号，只用 @@ ... @@ 标记每个修改块
3. 每个 @@ ... @@ patch 块内，首尾都要包含保持不变的行（上下文），中间为修改内容
4. 删除的行以 - 开头，新增的行以 + 开头，未变的行以空格开头
5. patch 必须包含所有需要的修改
6. patch 应该可以通过上下文唯一定位到原始代码的修改位置
7. patch 只需包含有变动的部分，不要返回完整代码
8. patch 示例：

\`\`\`
@@ ... @@
 保持不变的行
- 被删除的行
+ 新增的行
 保持不变的行

\`\`\`

请根据用户需求和当前代码上下文，生成符合上述格式的 patch。`
}

// 构建用户消息，包含当前代码作为上下文
const buildUserMessage = (userInput, liquidCode, productData) => {
  const productInfo = productData?.product ? `
商品信息：
- 标题: ${productData.product.title}
- 价格: ${productData.product.price}
- 描述: ${productData.product.description?.substring(0, 200)}...
- 变体数量: ${productData.product.variants?.length || 0}
` : '无商品数据'

  const contextMessage = `
当前完整代码：
\`\`\`liquid
${liquidCode}
\`\`\`

${productInfo}

用户需求：${userInput}

重要：请基于当前代码和用户需求，返回一个只包含 patch 块的 Git diff patch。每个 patch 块首尾都要有保持不变的行，中间为修改内容，不要包含文件名和行号。patch 示例：

\`\`\`
@@ ... @@
 保持不变的行
- 被删除的行
+ 新增的行
 保持不变的行
\`\`\`

请确保 patch 可以唯一定位并正确修改原始代码。`

  return {
    role: MessageType.USER,
    content: contextMessage
  }
}

// 解析和应用diff patch
export const parseAndApplyPatch = (patchContent, originalCode) => {
  try {
    console.log('开始解析patch:', patchContent)
    console.log('原始代码长度:', originalCode.length)
    
    // 分割多个patch块 - 修复分割逻辑
    const patchBlocks = patchContent
      .split(/(?=@@\s*\.\.\.\s*@@)/)
      .filter(block => block.trim() && block.includes('@@'))
    
    console.log('发现patch块数量:', patchBlocks.length)
    
    let resultCode = originalCode
    let appliedChanges = 0
    
    for (const patchBlock of patchBlocks) {
      if (!patchBlock.trim()) continue
      
      console.log('处理patch块:', patchBlock.substring(0, 100) + '...')
      
      // 解析单个patch块
      const parsedPatch = parseSinglePatch(patchBlock)
      if (parsedPatch) {
        console.log('解析成功，变化数量:', parsedPatch.changes.length)
        console.log('变化详情:', parsedPatch.changes.map(c => `${c.type}: ${c.content || c.newLine}`))
        
        // 应用patch到代码
        const appliedResult = applyPatchToCode(resultCode, parsedPatch)
        if (appliedResult.success) {
          resultCode = appliedResult.code
          appliedChanges++
          console.log('成功应用patch，修改行数:', parsedPatch.changes.length)
        } else {
          console.warn('应用patch失败:', appliedResult.error)
        }
      } else {
        console.warn('解析patch块失败')
      }
    }
    
    console.log('总共应用了', appliedChanges, '个patch块')
    
    return {
      type: ContentType.PATCH,
      content: resultCode,
      appliedChanges
    }
  } catch (error) {
    console.error('解析patch失败:', error)
    return {
      type: ContentType.TEXT,
      content: '抱歉，解析patch时出现错误。请重试。'
    }
  }
}

// 解析单个patch块
const parseSinglePatch = (patchBlock) => {
  try {
    console.log('解析patch块:', patchBlock)
    
    // 分割patch内容
    const lines = patchBlock.split('\n')
    const changes = []
    
    console.log('patch行数:', lines.length)
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      console.log(`行${i}: "${line}"`)
      
      // 跳过空行和@@行
      if (!line.trim() || line.includes('@@')) {
        console.log('跳过行:', line)
        continue
      }
      
      if (line.startsWith(' ')) {
        // 保持不变的行
        const content = line.substring(1)
        changes.push({
          type: 'context',
          content: content,
          originalLine: content
        })
        console.log('添加上下文行:', content)
      } else if (line.startsWith('-')) {
        // 删除的行
        const content = line.substring(1)
        changes.push({
          type: 'delete',
          content: content,
          originalLine: content
        })
        console.log('添加删除行:', content)
      } else if (line.startsWith('+')) {
        // 新增的行
        const content = line.substring(1)
        changes.push({
          type: 'add',
          content: content,
          newLine: content
        })
        console.log('添加新增行:', content)
      }
    }
    
    // 修复：保留所有上下文行，不要过滤掉
    console.log('过滤后的变化:', changes.length)
    console.log('变化详情:', changes.map(c => `${c.type}: "${c.content || c.newLine}"`))
    
    return {
      changes: changes
    }
  } catch (error) {
    console.error('解析单个patch失败:', error)
    return null
  }
}

// 应用patch到代码
const applyPatchToCode = (originalCode, patch) => {
  try {
    const lines = originalCode.split('\n')
    const changes = patch.changes
    
    // 找到匹配的位置
    const matchPosition = findPatchPosition(lines, changes)
    console.log('matchPosition', matchPosition)
    
    if (matchPosition === -1) {
      return {
        success: false,
        error: '无法找到匹配的位置'
      }
    }
    
    // 应用修改 - 修复顺序问题
    const newLines = [...lines]
    let offset = 0
    
    // 按照patch中的顺序处理变化
    for (const change of changes) {
      if (change.type === 'context') {
        // 上下文行，跳过
        continue
      }
      
      const currentIndex = matchPosition + offset
      console.log(`处理${change.type}操作，位置: ${currentIndex}, 内容: ${change.content || change.newLine}`)
      
      if (change.type === 'delete') {
        // 删除行
        if (currentIndex < newLines.length) {
          console.log(`删除第${currentIndex}行: ${newLines[currentIndex]}`)
          newLines.splice(currentIndex, 1)
          offset -= 1
        }
      } else if (change.type === 'add') {
        // 新增行 - 在删除位置后新增
        const addPosition = currentIndex + 1
        console.log(`在第${addPosition}行前新增: ${change.newLine}`)
        newLines.splice(addPosition, 0, change.newLine)
        offset += 1
      }
    }
    
    return {
      success: true,
      code: newLines.join('\n')
    }
  } catch (error) {
    console.error('应用patch失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 在代码中查找patch匹配位置
const findPatchPosition = (lines, changes) => {
  console.log('findPatchPosition', {lines, changes})
  
  // 直接查找删除行的位置
  const deleteChanges = changes.filter(change => change.type === 'delete')
  if (deleteChanges.length > 0) {
    const firstDeleteLine = deleteChanges[0].content.trim()
    console.log('第一个删除行:', firstDeleteLine)
    
    // 在原始代码中查找这个删除行
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === firstDeleteLine) {
        console.log(`找到删除行位置: ${i}`)
        return i
      }
    }
  }
  
  // 如果没有删除行，使用上下文行查找
  const contextLines = changes
    .filter(change => change.type === 'context')
    .map(change => change.content.trim())
    .filter(line => line.length > 0)
  
  console.log('contextLines', contextLines)
  
  if (contextLines.length === 0) {
    // 如果既没有上下文也没有删除行，返回开头
    return 0
  }
  
  // 使用上下文行查找位置
  return findContextInCode(lines, contextLines)
}

// 在代码中查找上下文
const findContextInCode = (lines, contextLines) => {
  if (contextLines.length === 0) return 0
  
  // 尝试不同的匹配策略
  const strategies = [
    // 策略1: 精确匹配（去除缩进）
    () => findExactMatch(lines, contextLines),
    // 策略2: 模糊匹配（忽略空白字符）
    () => findFuzzyMatch(lines, contextLines),
    // 策略3: 部分匹配（匹配部分上下文）
    () => findPartialMatch(lines, contextLines)
  ]
  
  for (const strategy of strategies) {
    const position = strategy()
    if (position !== -1) {
      return position
    }
  }
  
  return -1
}

// 精确匹配（去除缩进）
const findExactMatch = (lines, contextLines) => {
  for (let i = 0; i <= lines.length - contextLines.length; i++) {
    let match = true
    for (let j = 0; j < contextLines.length; j++) {
      const lineContent = lines[i + j].trim()
      const contextContent = contextLines[j].trim()
      if (lineContent !== contextContent) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  return -1
}

// 模糊匹配（忽略空白字符）
const findFuzzyMatch = (lines, contextLines) => {
  for (let i = 0; i <= lines.length - contextLines.length; i++) {
    let match = true
    for (let j = 0; j < contextLines.length; j++) {
      const lineContent = lines[i + j].replace(/\s+/g, ' ').trim()
      const contextContent = contextLines[j].replace(/\s+/g, ' ').trim()
      if (lineContent !== contextContent) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  return -1
}

// 部分匹配（匹配部分上下文）
const findPartialMatch = (lines, contextLines) => {
  // 如果上下文太长，只使用前几行和后几行
  const maxContextLines = 3
  const usedContextLines = contextLines.length > maxContextLines 
    ? [...contextLines.slice(0, Math.ceil(maxContextLines/2)), ...contextLines.slice(-Math.floor(maxContextLines/2))]
    : contextLines
  
  return findExactMatch(lines, usedContextLines)
}

// 在代码中查找指定行
const findLinesInCode = (lines, targetLines) => {
  for (let i = 0; i <= lines.length - targetLines.length; i++) {
    let match = true
    for (let j = 0; j < targetLines.length; j++) {
      const lineContent = lines[i + j].trim()
      const targetContent = targetLines[j].trim()
      if (lineContent !== targetContent) {
        match = false
        break
      }
    }
    if (match) {
      return i
    }
  }
  return -1
}

// 解析AI响应
const parseAIResponse = (response, originalCode = '') => {
  try {
    console.log('开始解析AI响应:', response)
    
    const content = response.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI响应格式错误：没有content')
    }

    console.log('AI返回的原始内容:', content)

    // 检查是否包含diff patch代码块
    const diffBlockMatch = content.match(/```(?:diff)?\s*([\s\S]*?)```/)
    if (diffBlockMatch) {
      const diffContent = diffBlockMatch[1].trim()
      console.log('发现diff代码块，提取patch')
      
      // 检查是否是有效的diff格式 - 只要包含@@就认为是patch
      if (diffContent.includes('@@ ... @@')) {
        console.log('确认是diff patch格式，开始解析和应用')
        console.log("diffContent", diffContent, originalCode);
        return parseAndApplyPatch(diffContent, originalCode)
      }
    }

    // 如果没有代码块，检查是否整个内容都是代码
    const trimmedContent = content.trim()
    
    // 去掉可能的代码块标记
    let cleanContent = trimmedContent
      .replace(/^```liquid\s*/i, '')  // 去掉开头的 ```liquid
      .replace(/^```\s*/i, '')        // 去掉开头的 ```
      .replace(/\s*```$/i, '')        // 去掉结尾的 ```
      .trim()
    
    // 检查是否是diff格式 - 只要包含@@就认为是patch
    if (cleanContent.includes('@@')) {
      console.log('内容包含diff格式，作为patch处理')
      return parseAndApplyPatch(cleanContent, originalCode)
    }

    // 否则作为文本返回
    console.log('作为文本内容处理')
    return {
      type: ContentType.TEXT,
      content: cleanContent
    }
  } catch (error) {
    console.error('解析AI响应失败:', error)
    console.error('原始响应:', response)
    return {
      type: ContentType.TEXT,
      content: '抱歉，处理响应时出现错误。请重试。'
    }
  }
}

// AI服务类
export class AIService {
  constructor() {
    this.isProcessing = false
  }

  // 流式发送消息到AI
  async streamMessage(userInput, liquidCode, productData, onChunk, onComplete) {
    if (this.isProcessing) {
      throw new Error('正在处理中，请稍候...')
    }

    this.isProcessing = true

    try {
      console.log('发送流式AI请求:', {
        userInput,
        liquidCodeLength: liquidCode.length,
        hasProductData: !!productData
      })

      // 构建消息
      const systemPrompt = buildSystemPrompt()
      const userMessage = buildUserMessage(userInput, liquidCode, productData)

      const messages = [
        {
          role: MessageType.SYSTEM,
          content: systemPrompt
        },
        userMessage
      ]

      let fullContent = ''
      let isCodeBlock = false
      let codeContent = ''

      // 调用流式LLM服务
      await llmService.streamChat(messages, null, (chunk) => {
        if (chunk.done) {
          // 流式响应完成
          console.log('流式响应完成')
          
          // 解析最终内容
          const parsedResponse = parseAIResponse({
            choices: [{
              message: {
                content: fullContent
              }
            }]
          }, liquidCode)
          console.log("@@@@@@", parsedResponse);

          const finalResponse = {
            role: MessageType.ASSISTANT,
            type: parsedResponse.type,
            content: parsedResponse.content
          }
          
          onComplete(finalResponse)
          return
        }

        // 处理流式内容
        const content = chunk.content
        fullContent += content

        // 检测代码块开始和结束
        if (content.includes('```')) {
          isCodeBlock = !isCodeBlock
          if (isCodeBlock) {
            codeContent = ''
          }
        }

        if (isCodeBlock) {
          codeContent += content
        }

        // 发送流式块
        onChunk({
          content: content,
          fullContent: fullContent,
          isCodeBlock: isCodeBlock,
          codeContent: codeContent
        })
      })

    } catch (error) {
      console.error('流式AI服务错误:', error)
      throw new Error(`AI服务错误: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }

  // 检查服务是否可用
  async checkServiceHealth() {
    try {
      // 发送一个简单的测试消息
      const testMessage = {
        role: MessageType.USER,
        content: '测试连接'
      }
      
      await llmService.simpleChat([testMessage])
      return true
    } catch (error) {
      console.error('AI服务健康检查失败:', error)
      return false
    }
  }
}

// 创建AI服务实例
export const aiService = new AIService()

// 测试方法 - 赋值到window上
window.testParseAndApplyPatch = () => {
  console.log('=== parseAndApplyPatch 测试 ===')
  
  // 测试用例1: 简单的文本替换
  const testCase1 = {
    name: '简单文本替换',
    originalCode: `<!DOCTYPE html>
<html>
<head>
  <title>测试页面</title>
</head>
<body>
  <h1>欢迎来到我的网站</h1>
  <p>这是一个测试段落。</p>
</body>
</html>`,
    patchContent: `@@ ... @@
  <h1>欢迎来到我的网站</h1>
- <p>这是一个测试段落。</p>
+ <p>这是一个更新后的段落。</p>
  </body>
</html>`
  }
  
  // 测试用例2: 多行修改
  const testCase2 = {
    name: '多行修改',
    originalCode: `{% if product %}
  <div class="product-card">
    <h2>{{ product.title }}</h2>
    <p>{{ product.description }}</p>
    <span class="price">{{ product.price }}</span>
  </div>
{% endif %}`,
    patchContent: `@@ ... @@
  <div class="product-card">
    <h2>{{ product.title }}</h2>
-   <p>{{ product.description }}</p>
+   <p>{{ product.description | truncate: 100 }}</p>
    <span class="price">{{ product.price }}</span>
+   <button class="add-to-cart">添加到购物车</button>
  </div>
@@ ... @@`
  }
  
  // 测试用例3: 缩进不同的情况
  const testCase3 = {
    name: '缩进不同的情况',
    originalCode: `function test() {
  console.log("hello");
  return true;
}`,
    patchContent: `@@ ... @@
function test() {
-  console.log("hello");
+  console.log("world");
  return true;
}`
  }
  
  // 测试用例4: 多个patch块
  const testCase4 = {
    name: '多个patch块',
    originalCode: `<!DOCTYPE html>
<html>
<head>
  <title>页面标题</title>
</head>
<body>
  <header>
    <nav>导航</nav>
  </header>
  <main>
    <h1>主标题</h1>
    <p>内容段落</p>
  </main>
  <footer>
    <p>页脚</p>
  </footer>
</body>
</html>`,
    patchContent: `@@ ... @@
  <header>
-   <nav>导航</nav>
+   <nav>主导航</nav>
  </header>
@@ ... @@
  <main>
    <h1>主标题</h1>
-   <p>内容段落</p>
+   <p>更新的内容段落</p>
  </main>
@@ ... @@`
  }
  
  const testCases = [testCase1, testCase2, testCase3, testCase4]
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- 测试用例 ${index + 1}: ${testCase.name} ---`)
    console.log('原始代码:')
    console.log(testCase.originalCode)
    console.log('\nPatch内容:')
    console.log(testCase.patchContent)
    
    try {
      const result = parseAndApplyPatch(testCase.patchContent, testCase.originalCode)
      console.log('\n结果:')
      console.log('类型:', result.type)
      console.log('应用了', result.appliedChanges, '个patch块')
      console.log('修改后的代码:')
      console.log(result.content)
    } catch (error) {
      console.error('测试失败:', error)
    }
  })
  
  console.log('\n=== 测试完成 ===')
}

// 快速测试单个用例的方法
window.testSinglePatch = (originalCode, patchContent) => {
  console.log('=== 单个Patch测试 ===')
  console.log('原始代码:')
  console.log(originalCode)
  console.log('\nPatch内容:')
  console.log(patchContent)
  
  try {
    const result = parseAndApplyPatch(patchContent, originalCode)
    console.log('\n结果:')
    console.log('类型:', result.type)
    console.log('应用了', result.appliedChanges, '个patch块')
    console.log('修改后的代码:')
    console.log(result.content)
    return result
  } catch (error) {
    console.error('测试失败:', error)
    return null
  }
}

// 测试LLM返回的典型patch格式
window.testLLMPatch = () => {
  const originalCode = `{% if product %}
  <div class="product-card">
    <h2>{{ product.title }}</h2>
    <p>{{ product.description }}</p>
    <span class="price">{{ product.price }}</span>
  </div>
{% endif %}`

  const llmPatch = `@@ ... @@
  <div class="product-card">
    <h2>{{ product.title }}</h2>
-   <p>{{ product.description }}</p>
+   <p>{{ product.description | truncate: 100 }}</p>
    <span class="price">{{ product.price }}</span>
+   <button class="add-to-cart" onclick="addToCart({{ product.id }})">添加到购物车</button>
  </div>
@@ ... @@`

  return window.testSinglePatch(originalCode, llmPatch)
}

// 简单测试用例
window.testSimplePatch = () => {
  const originalCode = `function test() {
  console.log("hello");
  return true;
}`

  const patchContent = `@@ ... @@
function test() {
-  console.log("hello");
+  console.log("world");
  return true;
}`

  return window.testSinglePatch(originalCode, patchContent)
}

// 强制刷新测试
window.testForceRefresh = () => {
  console.log('=== 强制刷新测试 ===')
  
  const originalCode = `function test() {
  console.log("hello");
  return true;
}`

  const patchContent = `@@ ... @@
function test() {
-  console.log("hello");
+  console.log("world");
  return true;
}`

  console.log('原始代码:')
  console.log(originalCode)
  console.log('\nPatch内容:')
  console.log(patchContent)
  
  try {
    const result = parseAndApplyPatch(patchContent, originalCode)
    console.log('\n结果:')
    console.log('类型:', result.type)
    console.log('应用了', result.appliedChanges, '个patch块')
    console.log('修改后的代码:')
    console.log(result.content)
    return result
  } catch (error) {
    console.error('测试失败:', error)
    return null
  }
}

// 全新测试函数 - 验证最新代码
window.testNewVersion = () => {
  console.log('=== 全新版本测试 ===', new Date().toISOString())
  
  const originalCode = `function test() {
  console.log("hello");
  return true;
}`

  const patchContent = `@@ ... @@
function test() {
-  console.log("hello");
+  console.log("world");
  return true;
}`

  console.log('原始代码:')
  console.log(originalCode)
  console.log('\nPatch内容:')
  console.log(patchContent)
  
  try {
    const result = parseAndApplyPatch(patchContent, originalCode)
    console.log('\n结果:')
    console.log('类型:', result.type)
    console.log('应用了', result.appliedChanges, '个patch块')
    console.log('修改后的代码:')
    console.log(result.content)
    return result
  } catch (error) {
    console.error('测试失败:', error)
    return null
  }
}

console.log('测试方法已加载到window对象:')
console.log('- window.testParseAndApplyPatch() - 运行所有测试用例')
console.log('- window.testSinglePatch(originalCode, patchContent) - 测试单个patch')
console.log('- window.testLLMPatch() - 测试LLM典型patch格式')
console.log('- window.testSimplePatch() - 测试简单patch')
console.log('- window.testForceRefresh() - 强制刷新测试')
console.log('- window.testNewVersion() - 全新版本测试')