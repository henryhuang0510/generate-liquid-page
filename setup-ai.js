#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('🤖 AI 代码助手配置向导')
console.log('========================\n')

// 检查是否已存在 .env 文件
const envPath = path.join(__dirname, '.env')
const envExists = fs.existsSync(envPath)

if (envExists) {
  console.log('⚠️  检测到已存在的 .env 文件')
  rl.question('是否要覆盖现有配置？(y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      startSetup()
    } else {
      console.log('配置已取消')
      rl.close()
    }
  })
} else {
  startSetup()
}

function startSetup() {
  console.log('\n📋 配置步骤：')
  console.log('1. 访问 https://platform.deepseek.com/ 注册账号')
  console.log('2. 在控制台中创建 API 密钥')
  console.log('3. 将密钥复制到下面的输入框中\n')

  rl.question('请输入你的 DeepSeek API 密钥: ', (apiKey) => {
    if (!apiKey.trim()) {
      console.log('❌ API 密钥不能为空')
      rl.close()
      return
    }

    rl.question('请输入 API 端点 (默认: https://api.deepseek.com): ', (apiHost) => {
      const host = apiHost.trim() || 'https://api.deepseek.com'
      
      // 生成 .env 文件内容 - 使用 Vite 环境变量格式
      const envContent = `# AI服务配置
VITE_LLM_API_KEY=${apiKey.trim()}
VITE_LLM_API_HOST=${host}

# 其他配置
VITE_ENV=development
`

      try {
        // 写入 .env 文件
        fs.writeFileSync(envPath, envContent)
        
        console.log('\n✅ 配置完成！')
        console.log('📁 .env 文件已创建')
        console.log('🔑 API 密钥已保存')
        console.log('🌐 API 端点: ' + host)
        
        console.log('\n🚀 下一步：')
        console.log('1. 重启开发服务器: npm run dev')
        console.log('2. 在编辑器中点击 "测试 AI 连接" 按钮')
        console.log('3. 开始使用 AI 代码助手功能！')
        
        console.log('\n📖 更多信息请查看 AI_FEATURE_README.md')
        
      } catch (error) {
        console.error('❌ 写入配置文件失败:', error.message)
      }
      
      rl.close()
    })
  })
}

// 处理 Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n配置已取消')
  rl.close()
}) 