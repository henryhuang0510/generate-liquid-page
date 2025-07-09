// 消息类型定义
const MessageType = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
}

const ContentType = {
  TEXT: 'text',
  CODE: 'code',
  PATCH: 'patch'
}

// 解析和应用diff patch
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
    
    // 按从后往前的顺序处理hunks，避免索引偏移问题
    for (let hunkIndex = hunks.length - 1; hunkIndex >= 0; hunkIndex--) {
      const hunk = hunks[hunkIndex]
      
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
      
      console.log(`应用hunk ${hunkIndex}，开始位置: ${startIndex}`)
      
      // 应用hunk的修改 - 按顺序处理每个change
      let currentIndex = startIndex
      let contextIndex = 0
      
      for (const change of hunk.changes) {
        if (change.type === 'context') {
          // 验证上下文行是否匹配
          if (resultLines[currentIndex] !== change.line) {
            console.warn(`上下文行不匹配，期望: "${change.line}", 实际: "${resultLines[currentIndex]}"`)
            break
          }
          currentIndex++
          contextIndex++
        } else if (change.type === 'delete') {
          // 删除当前行
          if (resultLines[currentIndex] === change.line) {
            resultLines.splice(currentIndex, 1)
            console.log(`删除行: "${change.line}"`)
          } else {
            console.warn(`删除行不匹配，期望: "${change.line}", 实际: "${resultLines[currentIndex]}"`)
            break
          }
        } else if (change.type === 'add') {
          // 在当前行之前插入新行
          resultLines.splice(currentIndex, 0, change.line)
          console.log(`添加行: "${change.line}"`)
          currentIndex++
        }
      }
    }
    
    const resultCode = resultLines.join('\n')
    console.log('Patch应用完成')
    
    return {
      type: ContentType.PATCH,
      content: resultCode,
      originalPatch: patchContent
    }
    
  } catch (error) {
    console.error('解析patch失败:', error)
    throw new Error(`Patch解析失败: ${error.message}`)
  }
}

// 测试原始代码
const originalCode = `        .slr-btn {
            flex: 1;
            height: 3rem;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 1rem;
        }

        .slr-close-preview {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }`

// 测试patch
const patchContent = `@@ ... @@
        .slr-btn {
            flex: 1;
            height: 3rem;
            font-weight: 500;
-           border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 1rem;
        }

@@ ... @@
        .slr-close-preview {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            cursor: pointer;
            background: rgba(0, 0, 0, 0.5);
-           border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }`

console.log('原始代码:')
console.log(originalCode)

console.log('\nPatch内容:')
console.log(patchContent)

console.log('\n开始应用patch...')
const result = parseAndApplyPatch(patchContent, originalCode)

console.log('\n应用后的代码:')
console.log(result.content)

console.log('\n验证结果:')
const expectedLines = [
    '        .slr-btn {',
    '            flex: 1;',
    '            height: 3rem;',
    '            font-weight: 500;',
    '            border: none;',
    '            cursor: pointer;',
    '            transition: all 0.15s ease;',
    '            font-size: 1rem;',
    '        }',
    '',
    '        .slr-close-preview {',
    '            position: absolute;',
    '            top: 20px;',
    '            right: 20px;',
    '            color: white;',
    '            cursor: pointer;',
    '            background: rgba(0, 0, 0, 0.5);',
    '            width: 40px;',
    '            height: 40px;',
    '            display: flex;',
    '            align-items: center;',
    '            justify-content: center;',
    '        }'
]

const resultLines = result.content.trim().split('\n')
const isCorrect = resultLines.length === expectedLines.length && 
                 resultLines.every((line, index) => line === expectedLines[index])

console.log('Patch应用是否正确:', isCorrect)
if (!isCorrect) {
    console.log('期望结果:')
    console.log(expectedLines.join('\n'))
    console.log('\n实际结果:')
    console.log(resultLines.join('\n'))
} 