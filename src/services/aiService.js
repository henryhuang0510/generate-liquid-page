import { llmService } from './llmService'

// 消息类型定义
export const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

export const ContentType = {
  TEXT: 'text',
  CODE: 'code'
}

// 构建系统提示词
const buildSystemPrompt = () => {
  return `你是一个专业的 Shopify Liquid 模板开发助手。

请遵循以下规则：
1. 只返回有效的 Liquid 代码，不要包含任何解释文字、注释或其他内容
2. 确保代码符合 Shopify Liquid 语法规范
3. 使用适当的过滤器来处理数据
4. 代码应该具有良好的可读性和维护性
5. 无论用户要求优化、修改还是新增功能，都要返回完整的代码
6. 不要只返回新增的部分，要返回包含所有功能的完整代码
7. 如果用户要求新功能，请确保代码能够正确使用商品数据
8. 始终返回一个完整的、可运行的 Liquid 模板
9. 基于用户提供的当前代码进行修改，保留原有功能的同时添加新功能
10. 返回的代码应该是一个完整的模板，可以直接使用

请根据用户的需求和当前代码上下文生成完整的 Liquid 代码。`
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

重要：请基于当前代码和用户需求，返回一个完整的、可运行的 Liquid 模板。不要只返回修改的部分，要返回包含所有功能的完整代码。`

  return {
    role: MessageType.USER,
    content: contextMessage
  }
}

// 解析AI响应
const parseAIResponse = (response) => {
  try {
    console.log('开始解析AI响应:', response)
    
    const content = response.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI响应格式错误：没有content')
    }

    console.log('AI返回的原始内容:', content)

    // 检查是否包含代码块
    const codeBlockMatch = content.match(/```(?:liquid)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      console.log('发现代码块，提取代码')
      return {
        type: ContentType.CODE,
        content: codeBlockMatch[1].trim()
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
    
    if (cleanContent.includes('{{') || cleanContent.includes('{%')) {
      console.log('内容包含Liquid语法，作为代码处理')
      return {
        type: ContentType.CODE,
        content: cleanContent
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

  // 发送消息到AI（非流式）
  async sendMessage(userInput, liquidCode, productData) {
    if (this.isProcessing) {
      throw new Error('正在处理中，请稍候...')
    }

    this.isProcessing = true

    try {
      console.log('发送AI请求:', {
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

      // 调用LLM服务
      const response = await llmService.simpleChat(messages)
      
      console.log('收到AI响应:', response)
      
      // 解析响应
      const parsedResponse = parseAIResponse(response)
      
      console.log('解析结果:', parsedResponse)
      
      return {
        role: MessageType.ASSISTANT,
        type: parsedResponse.type,
        content: parsedResponse.content
      }
    } catch (error) {
      console.error('AI服务错误:', error)
      throw new Error(`AI服务错误: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
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
          })
          
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