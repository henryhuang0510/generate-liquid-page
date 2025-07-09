// API配置文件
// 请在这里设置你的API密钥和端点

export const API_CONFIG = {
  // LLM服务配置
  llm: {
    apiHost: import.meta.env.VITE_LLM_API_HOST || 'https://api.deepseek.com',
    apiKey: import.meta.env.VITE_LLM_API_KEY || 'your-api-key-here',
    model: 'doubao-seed-1-6-250615'
  },
  
  // 其他服务配置
  services: {
    // 可以在这里添加其他服务的配置
  }
}

// 检查API配置是否完整
export const validateAPIConfig = () => {
  const { llm } = API_CONFIG
  
  if (!llm.apiKey || llm.apiKey === 'your-api-key-here') {
    console.warn('⚠️ 请设置 VITE_LLM_API_KEY 环境变量')
    return false
  }
  
  if (!llm.apiHost) {
    console.warn('⚠️ 请设置 VITE_LLM_API_HOST 环境变量')
    return false
  }
  
  return true
}

// 获取API配置
export const getAPIConfig = () => {
  return API_CONFIG
} 