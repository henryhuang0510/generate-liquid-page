const { exec } = require('child_process')

console.log('🧹 清理可能被占用的端口...')

// 清理端口 3001-3005
const ports = [3001, 3002, 3003, 3004, 3005]

ports.forEach(port => {
  exec(`lsof -ti:${port}`, (error, stdout, stderr) => {
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n')
      pids.forEach(pid => {
        console.log(`🔄 终止进程 ${pid} (端口 ${port})`)
        exec(`kill -9 ${pid}`, (killError) => {
          if (killError) {
            console.log(`❌ 无法终止进程 ${pid}: ${killError.message}`)
          } else {
            console.log(`✅ 成功终止进程 ${pid}`)
          }
        })
      })
    } else {
      console.log(`✅ 端口 ${port} 未被占用`)
    }
  })
})

console.log('✨ 端口清理完成！现在可以启动服务器了。') 