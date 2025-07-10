import { llmService } from './llmService'
import { parseAndApplyPatch, ContentType } from '../utils/patchApply'

// 消息类型定义
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

// 构建系统提示词
const buildSystemPrompt = () => {
  return `你是一个专业的 Shopify Liquid 模板开发助手。

请严格遵循以下规则：
1. 只返回有效的 unified diff patch 的代码，也不要包含任何解释文字、注释或其他内容
2. patch 不要包含文件名和行号，只用 @@ ... @@ 标记每个修改块
3. 删除的行以 - 开头，新增的行以 + 开头，未变的行以空格开头
4. 每个 @@ ... @@ patch 块内，首尾都要包含保持不变的行（上下文）
5. 每个 patch 包含的上下文需要足够独特，能够唯一定位到修改位置
6. 上下文行必须与原始代码完全一致，包括空格、缩进、换行符
7. 如果原始代码中有空行，patch 中也要保留空行
8. patch 只需包含有变动的部分，不要返回完整代码

下面是一些正确的和错误的 patch 示例：

正确的 patch 示例：
\`\`\`
@@ ... @@
  <div class="product-info">
    <h2>商品详情</h2>
    
-   <p>{{ product.description }}</p>
+   <p class="description">{{ product.description }}</p>
    
    <div class="price">
\`\`\`

错误的 patch 示例：
1. 没有包含修改以 - 或 + 开头的修改
\`\`\`
@@ ... @@
<div class="product-info">
    <h2>商品详情</h2>
   <p>{{ product.description }}</p>
   <p class="description">{{ product.description }}</p>    
<div class="price">
\`\`\`

请根据用户需求和当前代码上下文，生成符合上述格式的 patch。确保上下文行与原始代码完全匹配。`
}

// 构建用户消息，包含当前代码作为上下文
const buildUserMessage = (userInput, liquidCode, productData) => {
  const contextMessage = `
当前完整代码：
\`\`\`liquid
${liquidCode}
\`\`\`

用户需求：${userInput}`

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
