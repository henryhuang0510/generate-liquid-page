import { Liquid } from 'liquidjs'

export class LiquidEngine {
  constructor() {
    this.engine = new Liquid({
      cache: false,
      strictFilters: false,
      strictVariables: false
    })
    
    this.setupCustomFilters()
    this.setupCustomTags()
  }

  setupCustomFilters() {
    // Shopify特有的过滤器实现
    
    // img_url 过滤器 - 处理图片URL
    this.engine.registerFilter('img_url', (input, size = 'original') => {
      if (!input) return ''
      
      // 如果是字符串，直接返回
      if (typeof input === 'string') {
        return input
      }
      
      // 如果是对象，处理Shopify图片对象
      if (typeof input === 'object' && input.src) {
        let url = input.src
        
        // 处理尺寸参数
        if (size && size !== 'original') {
          if (url.includes('?')) {
            url += `&width=${size}&height=${size}`
          } else {
            url += `?width=${size}&height=${size}`
          }
        }
        
        return url
      }
      
      return input
    })

    // money 过滤器 - 格式化货币
    this.engine.registerFilter('money', (input, format = '') => {
      if (input === null || input === undefined) return ''
      
      const amount = parseFloat(input) / 100 // Shopify价格以分为单位
      const currency = format || 'USD'
      
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(amount)
    })

    // money_with_currency 过滤器
    this.engine.registerFilter('money_with_currency', (input) => {
      return this.engine.filters.money(input, 'USD')
    })

    // money_without_currency 过滤器
    this.engine.registerFilter('money_without_currency', (input) => {
      if (input === null || input === undefined) return ''
      const amount = parseFloat(input) / 100
      return new Intl.NumberFormat('zh-CN', {
        minimumFractionDigits: 2
      }).format(amount)
    })

    // handleize 过滤器 - 转换为URL友好的格式
    this.engine.registerFilter('handleize', (input) => {
      if (!input) return ''
      
      return input
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    })

    // escape 过滤器 - HTML转义
    this.engine.registerFilter('escape', (input) => {
      if (!input) return ''
      
      return input
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    })

    // escape_once 过滤器
    this.engine.registerFilter('escape_once', (input) => {
      return this.engine.filters.escape(input)
    })

    // default 过滤器 - 提供默认值
    this.engine.registerFilter('default', (input, defaultValue) => {
      if (input === null || input === undefined || input === '') {
        return defaultValue
      }
      return input
    })

    // size 过滤器 - 获取数组或字符串长度
    this.engine.registerFilter('size', (input) => {
      if (Array.isArray(input)) {
        return input.length
      }
      if (typeof input === 'string') {
        return input.length
      }
      if (typeof input === 'object' && input !== null) {
        return Object.keys(input).length
      }
      return 0
    })

    // first 过滤器 - 获取数组第一个元素
    this.engine.registerFilter('first', (input) => {
      if (Array.isArray(input) && input.length > 0) {
        return input[0]
      }
      return input
    })

    // last 过滤器 - 获取数组最后一个元素
    this.engine.registerFilter('last', (input) => {
      if (Array.isArray(input) && input.length > 0) {
        return input[input.length - 1]
      }
      return input
    })

    // join 过滤器 - 数组连接
    this.engine.registerFilter('join', (input, separator = ' ') => {
      if (Array.isArray(input)) {
        return input.join(separator)
      }
      return input
    })

    // split 过滤器 - 字符串分割
    this.engine.registerFilter('split', (input, separator = ' ') => {
      if (typeof input === 'string') {
        return input.split(separator)
      }
      return input
    })

    // upcase 过滤器 - 转大写
    this.engine.registerFilter('upcase', (input) => {
      if (typeof input === 'string') {
        return input.toUpperCase()
      }
      return input
    })

    // downcase 过滤器 - 转小写
    this.engine.registerFilter('downcase', (input) => {
      if (typeof input === 'string') {
        return input.toLowerCase()
      }
      return input
    })

    // capitalize 过滤器 - 首字母大写
    this.engine.registerFilter('capitalize', (input) => {
      if (typeof input === 'string' && input.length > 0) {
        return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase()
      }
      return input
    })

    // truncate 过滤器 - 截断字符串
    this.engine.registerFilter('truncate', (input, length = 50, append = '...') => {
      if (typeof input === 'string' && input.length > length) {
        return input.substring(0, length) + append
      }
      return input
    })

    // strip_html 过滤器 - 移除HTML标签
    this.engine.registerFilter('strip_html', (input) => {
      if (typeof input === 'string') {
        return input.replace(/<[^>]*>/g, '')
      }
      return input
    })

    // strip 过滤器 - 移除首尾空格
    this.engine.registerFilter('strip', (input) => {
      if (typeof input === 'string') {
        return input.trim()
      }
      return input
    })

    // lstrip 过滤器 - 移除左侧空格
    this.engine.registerFilter('lstrip', (input) => {
      if (typeof input === 'string') {
        return input.trimStart()
      }
      return input
    })

    // rstrip 过滤器 - 移除右侧空格
    this.engine.registerFilter('rstrip', (input) => {
      if (typeof input === 'string') {
        return input.trimEnd()
      }
      return input
    })

    // replace 过滤器 - 字符串替换
    this.engine.registerFilter('replace', (input, search, replace) => {
      if (typeof input === 'string') {
        return input.replace(new RegExp(search, 'g'), replace)
      }
      return input
    })

    // replace_first 过滤器 - 替换第一个匹配
    this.engine.registerFilter('replace_first', (input, search, replace) => {
      if (typeof input === 'string') {
        return input.replace(search, replace)
      }
      return input
    })

    // append 过滤器 - 追加字符串
    this.engine.registerFilter('append', (input, append) => {
      if (input !== null && input !== undefined) {
        return input.toString() + append
      }
      return append
    })

    // prepend 过滤器 - 前置字符串
    this.engine.registerFilter('prepend', (input, prepend) => {
      if (input !== null && input !== undefined) {
        return prepend + input.toString()
      }
      return prepend
    })

    // remove 过滤器 - 移除字符串
    this.engine.registerFilter('remove', (input, remove) => {
      if (typeof input === 'string') {
        return input.replace(new RegExp(remove, 'g'), '')
      }
      return input
    })

    // remove_first 过滤器 - 移除第一个匹配
    this.engine.registerFilter('remove_first', (input, remove) => {
      if (typeof input === 'string') {
        return input.replace(remove, '')
      }
      return input
    })

    // slice 过滤器 - 字符串切片
    this.engine.registerFilter('slice', (input, start, length) => {
      if (typeof input === 'string') {
        const startIndex = parseInt(start)
        if (length !== undefined) {
          return input.slice(startIndex, startIndex + parseInt(length))
        }
        return input.slice(startIndex)
      }
      return input
    })

    // where 过滤器 - 数组过滤
    this.engine.registerFilter('where', (input, property, value) => {
      if (Array.isArray(input)) {
        return input.filter(item => {
          if (typeof item === 'object' && item !== null) {
            return item[property] === value
          }
          return false
        })
      }
      return input
    })

    // sort 过滤器 - 数组排序
    this.engine.registerFilter('sort', (input, property) => {
      if (Array.isArray(input)) {
        if (property) {
          return input.sort((a, b) => {
            const aVal = a[property]
            const bVal = b[property]
            if (aVal < bVal) return -1
            if (aVal > bVal) return 1
            return 0
          })
        }
        return input.sort()
      }
      return input
    })

    // uniq 过滤器 - 数组去重
    this.engine.registerFilter('uniq', (input) => {
      if (Array.isArray(input)) {
        return [...new Set(input)]
      }
      return input
    })

    // compact 过滤器 - 移除空值
    this.engine.registerFilter('compact', (input) => {
      if (Array.isArray(input)) {
        return input.filter(item => item !== null && item !== undefined && item !== '')
      }
      return input
    })

    // map 过滤器 - 数组映射
    this.engine.registerFilter('map', (input, property) => {
      if (Array.isArray(input)) {
        return input.map(item => {
          if (typeof item === 'object' && item !== null) {
            return item[property]
          }
          return item
        })
      }
      return input
    })

    // reverse 过滤器 - 数组反转
    this.engine.registerFilter('reverse', (input) => {
      if (Array.isArray(input)) {
        return [...input].reverse()
      }
      return input
    })

    // concat 过滤器 - 数组连接
    this.engine.registerFilter('concat', (input, array) => {
      if (Array.isArray(input) && Array.isArray(array)) {
        return [...input, ...array]
      }
      return input
    })

    // sum 过滤器 - 数组求和
    this.engine.registerFilter('sum', (input) => {
      if (Array.isArray(input)) {
        return input.reduce((sum, item) => {
          const num = parseFloat(item)
          return isNaN(num) ? sum : sum + num
        }, 0)
      }
      return input
    })

    // abs 过滤器 - 绝对值
    this.engine.registerFilter('abs', (input) => {
      const num = parseFloat(input)
      return isNaN(num) ? input : Math.abs(num)
    })

    // ceil 过滤器 - 向上取整
    this.engine.registerFilter('ceil', (input) => {
      const num = parseFloat(input)
      return isNaN(num) ? input : Math.ceil(num)
    })

    // floor 过滤器 - 向下取整
    this.engine.registerFilter('floor', (input) => {
      const num = parseFloat(input)
      return isNaN(num) ? input : Math.floor(num)
    })

    // round 过滤器 - 四舍五入
    this.engine.registerFilter('round', (input) => {
      const num = parseFloat(input)
      return isNaN(num) ? input : Math.round(num)
    })

    // plus 过滤器 - 加法
    this.engine.registerFilter('plus', (input, addend) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(addend)
      if (isNaN(num1) || isNaN(num2)) return input
      return num1 + num2
    })

    // minus 过滤器 - 减法
    this.engine.registerFilter('minus', (input, subtrahend) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(subtrahend)
      if (isNaN(num1) || isNaN(num2)) return input
      return num1 - num2
    })

    // times 过滤器 - 乘法
    this.engine.registerFilter('times', (input, multiplier) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(multiplier)
      if (isNaN(num1) || isNaN(num2)) return input
      return num1 * num2
    })

    // divided_by 过滤器 - 除法
    this.engine.registerFilter('divided_by', (input, divisor) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(divisor)
      if (isNaN(num1) || isNaN(num2) || num2 === 0) return input
      return num1 / num2
    })

    // modulo 过滤器 - 取模
    this.engine.registerFilter('modulo', (input, divisor) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(divisor)
      if (isNaN(num1) || isNaN(num2) || num2 === 0) return input
      return num1 % num2
    })

    // at_least 过滤器 - 最小值
    this.engine.registerFilter('at_least', (input, minimum) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(minimum)
      if (isNaN(num1) || isNaN(num2)) return input
      return Math.max(num1, num2)
    })

    // at_most 过滤器 - 最大值
    this.engine.registerFilter('at_most', (input, maximum) => {
      const num1 = parseFloat(input)
      const num2 = parseFloat(maximum)
      if (isNaN(num1) || isNaN(num2)) return input
      return Math.min(num1, num2)
    })
  }

  setupCustomTags() {
    // 自定义标签实现
    
    // comment 标签 - 忽略注释内容
    this.engine.registerTag('comment', {
      parse: function(tagToken, remainTokens) {
        this.tokens = []
        let token
        while ((token = remainTokens.shift())) {
          if (token.name === 'endcomment') {
            break
          }
          this.tokens.push(token)
        }
      },
      render: function() {
        return '' // 注释内容不输出
      }
    })

    // raw 标签 - 输出原始内容
    this.engine.registerTag('raw', {
      parse: function(tagToken, remainTokens) {
        this.tokens = []
        let token
        while ((token = remainTokens.shift())) {
          if (token.name === 'endraw') {
            break
          }
          this.tokens.push(token)
        }
      },
      render: function() {
        return this.tokens.map(token => token.getText()).join('')
      }
    })

    // liquid 标签 - 用于多行代码块
    this.engine.registerTag('liquid', {
      parse: function(tagToken, remainTokens) {
        this.tokens = []
        let token
        while ((token = remainTokens.shift())) {
          if (token.name === 'endliquid') {
            break
          }
          this.tokens.push(token)
        }
      },
      render: function(context) {
        // 渲染 liquid 标签内的内容
        return this.liquid.renderer.renderTemplates(this.tokens, context)
      }
    })

    // schema 标签 - 忽略schema内容（用于主题设置）
    this.engine.registerTag('schema', {
      parse: function(tagToken, remainTokens) {
        this.tokens = []
        let token
        while ((token = remainTokens.shift())) {
          if (token.name === 'endschema') {
            break
          }
          this.tokens.push(token)
        }
      },
      render: function() {
        return '' // schema内容不输出到HTML
      }
    })
  }

  // 处理数据中的链接，确保有协议头
  processDataLinks(data) {
    if (!data || typeof data !== 'object') return data

    const processedData = JSON.parse(JSON.stringify(data)) // 深拷贝

    const processValue = (value) => {
      if (typeof value === 'string') {
        // 处理协议相对链接 (//example.com)
        if (value.startsWith('//')) {
          return `https:${value}`
        }
        // 处理相对链接，但保留绝对路径
        if (value.startsWith('/') && !value.startsWith('//')) {
          // 这是相对路径，保持原样
          return value
        }
        // 处理没有协议头的完整域名
        if (value.match(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/) && !value.includes('://')) {
          return `https://${value}`
        }
        return value
      } else if (Array.isArray(value)) {
        return value.map(item => processValue(item))
      } else if (typeof value === 'object' && value !== null) {
        const processed = {}
        for (const [key, val] of Object.entries(value)) {
          processed[key] = processValue(val)
        }
        return processed
      }
      return value
    }

    return processValue(processedData)
  }

  async render(template, data) {
    try {
      // 预处理数据，处理链接问题
      const processedData = this.processDataLinks(data)
      
      // 渲染模板
      const renderedHtml = await this.engine.parseAndRender(template, processedData)
      
      // 后处理渲染结果，处理模板中的协议相对链接
      const processedHtml = renderedHtml.replace(
        /(src|href)=["']\/\/([^"']+)["']/g,
        '$1="https://$2"'
      )
      
      return processedHtml
    } catch (error) {
      console.error('Liquid渲染错误:', error)
      throw error
    }
  }
} 