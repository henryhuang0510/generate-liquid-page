// 消息类型
export class Message {
  constructor(role, content) {
    this.role = role
    this.content = content
  }
}

// 聊天完成请求
export class ChatCompletionRequest {
  constructor(model, messages, tools = null) {
    this.model = model
    this.messages = messages
    if (tools) {
      this.tools = tools
    }
  }
}

// 聊天完成响应
export class ChatCompletionResponse {
  constructor(choices, usage = null) {
    this.choices = choices
    this.usage = usage
  }
}

// API配置
export class ApiConfig {
  constructor(config) {
    this.baseURL = config.baseURL
    this.headers = config.headers || {}
  }
} 