// 测试 patch 解析功能
const parseAndApplyPatch = (patchContent, originalCode) => {
  try {
    console.log('开始解析patch:', patchContent)
    
    // 解析diff patch
    const lines = patchContent.split('\n')
    const hunks = []
    let currentHunk = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // 匹配标准hunk头部 @@ -oldStart,oldCount +newStart,newCount @@
      const standardHunkMatch = line.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/)
      // 匹配简化hunk头部 @@ ... @@
      const simplifiedHunkMatch = line.match(/^@@ \.\.\. @@/)
      
      if (standardHunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk)
        }
        currentHunk = {
          oldStart: parseInt(standardHunkMatch[1]),
          oldCount: parseInt(standardHunkMatch[2]),
          newStart: parseInt(standardHunkMatch[3]),
          newCount: parseInt(standardHunkMatch[4]),
          changes: [],
          isSimplified: false
        }
        continue
      }
      
      if (simplifiedHunkMatch) {
        if (currentHunk) {
          hunks.push(currentHunk)
        }
        currentHunk = {
          oldStart: 0,
          oldCount: 0,
          newStart: 0,
          newCount: 0,
          changes: [],
          isSimplified: true
        }
        continue
      }
      
      if (currentHunk) {
        if (line.startsWith(' ')) {
          // 保持不变的行
          currentHunk.changes.push({ type: 'context', line: line.substring(1) })
        } else if (line.startsWith('-')) {
          // 删除的行
          currentHunk.changes.push({ type: 'delete', line: line.substring(1) })
        } else if (line.startsWith('+')) {
          // 添加的行
          currentHunk.changes.push({ type: 'add', line: line.substring(1) })
        }
      }
    }
    
    if (currentHunk) {
      hunks.push(currentHunk)
    }
    
    console.log('解析到的hunks:', hunks)
    
    // 应用patch到原始代码
    const originalLines = originalCode.split('\n')
    let resultLines = [...originalLines]
    
    for (const hunk of hunks) {
      // 在原始代码中查找匹配的上下文
      const contextLines = hunk.changes.filter(c => c.type === 'context').map(c => c.line)
      
      if (contextLines.length === 0) {
        console.warn('Hunk没有上下文行，跳过')
        continue
      }
      
      // 查找上下文在原始代码中的位置
      let startIndex = -1
      for (let i = 0; i <= resultLines.length - contextLines.length; i++) {
        let match = true
        for (let j = 0; j < contextLines.length; j++) {
          if (resultLines[i + j] !== contextLines[j]) {
            match = false
            break
          }
        }
        if (match) {
          startIndex = i
          break
        }
      }
      
      if (startIndex === -1) {
        console.warn('无法找到匹配的上下文，跳过hunk')
        continue
      }
      
      // 应用hunk的修改
      let deleteCount = 0
      let addLines = []
      let contextIndex = 0
      
      // 重新构建修改后的代码块
      const newLines = []
      for (const change of hunk.changes) {
        if (change.type === 'context') {
          newLines.push(change.line)
          contextIndex++
        } else if (change.type === 'delete') {
          deleteCount++
          // 跳过删除的行
        } else if (change.type === 'add') {
          addLines.push(change.line)
          newLines.push(change.line)
        }
      }
      
      // 替换匹配的上下文部分
      resultLines.splice(startIndex, contextLines.length, ...newLines)
    }
    
    const resultCode = resultLines.join('\n')
    console.log('Patch应用完成')
    
    return {
      type: 'PATCH',
      content: resultCode,
      originalPatch: patchContent
    }
    
  } catch (error) {
    console.error('解析patch失败:', error)
    throw new Error(`Patch解析失败: ${error.message}`)
  }
}

// 测试简化patch格式
const testSimplifiedPatchFormat = () => {
  const originalCode = `{% comment %} 商品页面模板 {% endcomment %}
<div class="product-container">
  <h1>{{ product.title }}</h1>
  <p>{{ product.description }}</p>
  <div class="price">{{ product.price }}</div>
</div>`

  // 这是prompt中定义的简化格式
  const simplifiedPatch = `@@ ... @@
 {% comment %} 商品页面模板 {% endcomment %}
 <div class="product-container">
   <h1>{{ product.title }}</h1>
+  <div class="product-image">
+    <img src="{{ product.featured_image | img_url: 'medium' }}" alt="{{ product.title }}">
+  </div>
   <p>{{ product.description }}</p>
   <div class="price">{{ product.price }}</div>
 </div>`

  try {
    console.log('测试简化patch格式解析...')
    const result = parseAndApplyPatch(simplifiedPatch, originalCode)
    console.log('简化patch格式测试结果:', result)
    return result
  } catch (error) {
    console.error('简化patch格式测试失败:', error)
    return null
  }
}

// 测试标准patch格式
const testStandardPatchFormat = () => {
  const originalCode = `{% comment %} 商品页面模板 {% endcomment %}
<div class="product-container">
  <h1>{{ product.title }}</h1>
  <p>{{ product.description }}</p>
  <div class="price">{{ product.price }}</div>
</div>`

  const standardPatch = `--- a/template.liquid
+++ b/template.liquid
@@ -1,5 +1,7 @@
 {% comment %} 商品页面模板 {% endcomment %}
 <div class="product-container">
   <h1>{{ product.title }}</h1>
+  <div class="product-image">
+    <img src="{{ product.featured_image | img_url: 'medium' }}" alt="{{ product.title }}">
+  </div>
   <p>{{ product.description }}</p>
   <div class="price">{{ product.price }}</div>
 </div>`

  try {
    console.log('测试标准patch格式解析...')
    const result = parseAndApplyPatch(standardPatch, originalCode)
    console.log('标准patch格式测试结果:', result)
    return result
  } catch (error) {
    console.error('标准patch格式测试失败:', error)
    return null
  }
}

// 运行测试
console.log('=== 测试简化patch格式 ===')
testSimplifiedPatchFormat()

console.log('\n=== 测试标准patch格式 ===')
testStandardPatchFormat() 