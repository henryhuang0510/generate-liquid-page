import { API_CONFIG } from '../config/api'

// API配置类
export class ApiConfig {
  constructor(config) {
    this.baseURL = config.baseURL
    this.headers = config.headers || {}
  }
}

// API类
export class Api {
  constructor(config) {
    this.baseURL = config.baseURL
    this.headers = config.headers || {}
  }

  async post(endpoint, data) {
    const url = `${this.baseURL}${endpoint}`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('API请求失败:', error)
      throw error
    }
  }
}

// 消息类型
export class Message {
  constructor(role, content) {
    this.role = role
    this.content = content
  }
}

// 聊天完成请求类型
export class ChatCompletionRequest {
  constructor(model, messages) {
    this.model = model
    this.messages = messages
  }
}

// 聊天完成响应类型
export class ChatCompletionResponse {
  constructor(choices, usage = null) {
    this.choices = choices
    this.usage = usage
  }
}

// LLM服务类
export class LLMService {
  constructor(config) {
    this.api = new Api(config)
  }

  async chatCompletion(request) {
    return this.api.post('/chat/completions', request)
  }

  async simpleChat(messages, model = null, stream = false) {
    const modelToUse = model || API_CONFIG.llm.model
    const request = {
      model: modelToUse,
      messages: [ ...messages],
      temperature: 0.7,
      stream: stream
    }

    return this.chatCompletion(request)
  }

  async streamChat(messages, model = null, onChunk) {
    const modelToUse = model || API_CONFIG.llm.model
    const request = {
      model: modelToUse,
      messages: [ ...messages],
      temperature: 0.7,
      stream: true
    }

    const url = `${this.api.baseURL}/chat/completions`
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.api.headers
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              onChunk({ done: true })
              return
            }

            try {
              const parsed = JSON.parse(data)
              if (parsed.choices && parsed.choices[0]) {
                onChunk({
                  done: false,
                  content: parsed.choices[0].delta?.content || '',
                  reasoning_content: parsed.choices[0].delta?.reasoning_content || '',
                  choice: parsed.choices[0]
                })
              }
            } catch (e) {
              console.warn('解析流式数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('流式API请求失败:', error)
      throw error
    }
  }
}

// 创建LLM服务实例
export const llmService = new LLMService({
  baseURL: API_CONFIG.llm.apiHost,
  headers: {
    'Authorization': `Bearer ${API_CONFIG.llm.apiKey}`,
  },
})

// 导出类型
export * from './types' 