import React, { useState } from 'react'
import { aiService } from '../services/aiService'
import { validateAPIConfig } from '../config/api'

const AITestButton = () => {
  const [testResult, setTestResult] = useState(null)
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      // 检查API配置
      const configValid = validateAPIConfig()
      if (!configValid) {
        setTestResult({
          success: false,
          message: 'API配置不完整，请检查环境变量设置'
        })
        return
      }

      // 测试AI服务连接
      const isHealthy = await aiService.checkServiceHealth()
      
      if (isHealthy) {
        setTestResult({
          success: true,
          message: 'AI服务连接正常！'
        })
      } else {
        setTestResult({
          success: false,
          message: 'AI服务连接失败，请检查网络和API配置'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试失败: ${error.message}`
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="ai-test-container">
      <button 
        className="ai-test-btn"
        onClick={handleTest}
        disabled={isTesting}
      >
        {isTesting ? '测试中...' : '测试 AI 连接'}
      </button>
      
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
          {testResult.message}
        </div>
      )}
      
      <style jsx>{`
        .ai-test-container {
          padding: 16px;
          background: #252525;
          border-radius: 8px;
          margin: 16px 0;
        }
        
        .ai-test-btn {
          background: #007acc;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .ai-test-btn:hover:not(:disabled) {
          background: #005a9e;
        }
        
        .ai-test-btn:disabled {
          background: #333;
          cursor: not-allowed;
        }
        
        .test-result {
          margin-top: 12px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .test-result.success {
          background: #1e3a1e;
          color: #4caf50;
          border: 1px solid #4caf50;
        }
        
        .test-result.error {
          background: #3a1e1e;
          color: #f44336;
          border: 1px solid #f44336;
        }
      `}</style>
    </div>
  )
}

export default AITestButton 