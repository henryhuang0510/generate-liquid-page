import { llmService } from './llmService'
import { parseAndApplyPatch, ContentType } from '../utils/patchApply'

// 消息类型定义
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

const buildSystemPrompt = () => {
  return `You are a professional Shopify Liquid template development assistant. Based on user requirements and the current code context, you will generate patches that conform to the unified diff format described above.

When generating code, strictly follow these rules:

1. Only return a valid unified diff patch. Do not include any explanatory text, comments, or other content.

2. The patch must not include filenames or line numbers. Use only @@ ... @@ to mark each diff block.

3. **Lines to be removed start with -, added lines start with +, and unchanged lines start with a space.**

4. Within each @@ ... @@ block, **include 3 to 5 lines of unchanged code before and after the changes as context.**

5. The context within each patch must be sufficiently unique to unambiguously locate the modification position.

6. Context lines must match the original code exactly — including content, spaces, indentation, line breaks, and order.

7. Always prioritize high-level diffs:

- Don’t just make minimal single-line edits.

- Generate more complete and understandable diffs.

- Include enough context to clearly convey the logic of the changes.

- This significantly improves the success rate of applying patches and reduces edit errors.

8. The generated UI code should look modern and clean, with strong focus on mobile responsiveness and user experience best practices.

Below are examples of correct and incorrect patches:

- Bad example (minimal single-line edit without high-level context):
\`\`\`
@@ ... @@
-def factorial(n):
+def factorial(number):
-    if n == 0:
+    if number == 0:
         return 1
     else:
-        return n * factorial(n-1)
+        return number * factorial(number-1)
\`\`\`

- Better high-level patch example (generates a more complete diff):
\`\`\`
@@ ... @@
-def factorial(n):
-    if n == 0:
-        return 1
-    else:
-        return n * factorial(n-1)
+def factorial(number):
+    if number == 0:
+        return 1
+    else:
+        return number * factorial(number-1)
\`\`\`

- Corret patch example:
\`\`\`
@@ ... @@
<div class="product-info">
    <h2>title</h2>
+   <p>{{ product.description }}</p>
+   <p class="description">{{ product.description }}</p>    
<div class="price">
\`\`\`


- Incorrect patch example:

1.Missing - or + to indicate changes
\`\`\`
@@ ... @@
<div class="product-info">
   <h2>title</h2>
   <p>{{ product.description }}</p>
   <p class="description">{{ product.description }}</p>    
<div class="price">
\`\`\`
2.Missing context before and after the changes
\`\`\`
@@ ... @@
+<div class="product-info">
+   <h2>title</h2>
+   <p>{{ product.description }}</p>
+   <p class="description">{{ product.description }}</p>    
+<div class="price">
\`\`\`
3.Incorrect context(<body> is not in the original code)
Original code:
\`\`\`
<div class="product-info">
   <h2>title</h2>
   <p>{{ product.description }}</p>
   <p class="description">{{ product.description }}</p>    
</div>
\`\`\`
Diff:
\`\`\`
@@ ... @@
<div class="product-info">
   <h2>title</h2>
-   <p>{{ product.description }}</p>
-   <p class="description">{{ product.description }}</p>    
-</div>
+  <p>{{ product.price }}</p>
<body>
\`\`\`
Please generate patches that strictly follow the format above based on the user's request and current code context. Ensure all context lines exactly match the original code, and prioritize high-level diffs to improve patching success.
`
}

// // 构建系统提示词
// const buildSystemPrompt = () => {
//   return `你是一个专业的 Shopify Liquid 模板开发助手。你将根据用户需求和当前代码上下文，生成符合上述格式的 patch。

// 生成代码时请严格遵循以下规则：
// 1. 只返回有效的 unified diff patch 的代码，也不要包含任何解释文字、注释或其他内容
// 2. patch 不要包含文件名和行号，只用 @@ ... @@ 标记每个修改块
// 3. **删除的行以 - 开头，新增的行以 + 开头，未变的行以空格开头**
// 4. 每个 @@ ... @@ patch 块内，首尾都要包含 3- 5 行保持不变的代码（上下文）
// 5. 每个 patch 包含的上下文需要足够独特，能够唯一定位到修改位置
// 6. 上下文行必须与原始代码完全一致，包括空格、缩进、换行符
// 7. **优先生成 high level diff**
// - 不要只做最小化的单行修改，而是生成更完整、更容易理解的 diff
// - 包含足够的上下文，让修改的逻辑更清晰可见
// - 这样可以显著提高 diff 应用的成功率，减少编辑错误
// 8. 生成好看的现代化UI，符合用户体验最佳事件，**保证移动端的适配**

// 下面是一些正确的和错误的 patch 示例：

// 没有应用 high level diff 的错误示例（只做了最小化的单行修改）：
// \`\`\`
// @@ ... @@
// -def factorial(n):
// +def factorial(number):
// -    if n == 0:
// +    if number == 0:
//          return 1
//      else:
// -        return n * factorial(n-1)
// +        return number * factorial(number-1)
// \`\`\`

// 更好的 high level patch 示例（生成更完整的 diff）：
// \`\`\`
// @@ ... @@
// -def factorial(n):
// -    if n == 0:
// -        return 1
// -    else:
// -        return n * factorial(n-1)
// +def factorial(number):
// +    if number == 0:
// +        return 1
// +    else:
// +        return number * factorial(number-1)
// \`\`\`

// 正确的 patch 示例：
// \`\`\`
// @@ ... @@
// <div class="product-info">
//     <h2>商品详情</h2>
// +   <p>{{ product.description }}</p>
// +   <p class="description">{{ product.description }}</p>    
// <div class="price">
// \`\`\`


// 错误的 patch 示例：
// 1. 没有包含修改以 - 或 + 开头的修改
// \`\`\`
// @@ ... @@
// <div class="product-info">
//    <h2>商品详情</h2>
//    <p>{{ product.description }}</p>
//    <p class="description">{{ product.description }}</p>    
// <div class="price">
// \`\`\`

// 请根据用户需求和当前代码上下文，生成符合上述格式的 patch。确保上下文行与原始代码完全匹配，并优先使用 high level diff 来提高成功率。`
// }

// 构建用户消息，包含当前代码作为上下文
const buildUserMessage = (userInput, liquidCode, productData) => {
  const contextMessage = `
Current complete code:
\`\`\`liquid
${liquidCode}
\`\`\`

User requirements:${userInput}`

  return {
    role: MessageType.USER,
    content: contextMessage
  }
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

    // 检查是否包含diff patch代码块 - 支持多个diff块
    const diffBlockMatches = content.match(/```(?:diff)?\s*([\s\S]*?)```/g)
    if (diffBlockMatches && diffBlockMatches.length > 0) {
      console.log('发现', diffBlockMatches.length, '个diff代码块')
      
      let currentCode = originalCode
      let totalAppliedChanges = 0
      
      // 处理每个diff块
      for (let i = 0; i < diffBlockMatches.length; i++) {
        const diffBlock = diffBlockMatches[i]
        // 提取diff内容（去掉```标记）
        const diffContent = diffBlock.replace(/```(?:diff)?\s*/, '').replace(/\s*```$/, '').trim()
        
        console.log(`处理第${i + 1}个diff块:`, diffContent.substring(0, 100) + '...')
        
        // 检查是否是有效的diff格式 - 只要包含@@就认为是patch
        if (diffContent.includes('@@ ... @@')) {
          console.log(`确认第${i + 1}个diff块是patch格式，开始解析和应用`)
          
          try {
            const patchedCode = parseAndApplyPatch(diffContent, currentCode)
            currentCode = patchedCode
            totalAppliedChanges += 1
            console.log(`第${i + 1}个patch应用成功`)
          } catch (error) {
            console.warn(`第${i + 1}个diff块解析失败:`, error.message)
          }
        } else {
          console.log(`第${i + 1}个diff块不是patch格式，跳过`)
        }
      }
      
      if (totalAppliedChanges > 0) {
        console.log(`总共应用了${totalAppliedChanges}个patch块`)
        return {
          type: ContentType.PATCH,
          content: currentCode,
          appliedChanges: totalAppliedChanges
        }
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
      try {
        const patchedCode = parseAndApplyPatch(cleanContent, originalCode)
        return {
          type: ContentType.PATCH,
          content: patchedCode,
          appliedChanges: 1
        }
      } catch (error) {
        console.warn('patch解析失败，作为文本处理:', error.message)
        return {
          type: ContentType.TEXT,
          content: cleanContent
        }
      }
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
          codeContent: codeContent,
          reasoning_content: chunk.reasoning_content || null
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
