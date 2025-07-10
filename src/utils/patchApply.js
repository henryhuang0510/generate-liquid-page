/**
 * Content type enumeration for AI responses
 */
export const ContentType = {
  TEXT: 'text',
  PATCH: 'patch',
  CODE: 'code'
}

/**
 * Apply an AI-generated unified diff patch to original code.
 * Supports approximate context matching and fuzzy tolerance for formatting issues.
 *
 * @param {string} originalCode - The original Liquid code.
 * @param {string} patchText - The AI-generated patch string (with @@ ... @@ blocks, no line numbers).
 * @returns {string} - The patched code.
 * @throws {Error} - If patch block cannot be applied.
 */
export function parseAndApplyPatch(patchText, originalCode) {
    console.log("================================")
    const originalLines = originalCode.split('\n');
    let workingLines = [...originalLines];
    
    // 兼容两种格式：@@ ... @@ 和 @@ -199,11 +199,11 @@
    const hunkBlocks = patchText.split(/@@[^@]*@@\n/).slice(1).map(block => {
        // 前后空行去掉，防止干扰
      const lines = block.trimEnd().split('\n');
      return lines.map(line => {
        if (line.trim().startsWith('+')) {
            return {type: 'insert', content: line.replace('+', ' ')}
        } else if (line.trim().startsWith('-')) {
            return {type: 'remove', content: line.replace('-', ' ')}
        } else {
            return {type: 'context', content: line.startsWith(' ') ? line.slice(1) : line}
        }
      });
    });
    console.log(`hunkBlocks:`, hunkBlocks)
    for (const hunk of hunkBlocks) {
      // fuzzy find best match index in workingLines
      const context = hunk.filter(line => line.type === 'context' || line.type === 'remove').map(line => line.content);
      const matchIndex = findBestMatchIndex(workingLines, context);
      console.log('匹配 index', matchIndex, workingLines[matchIndex]);
  
      if (matchIndex === -1) {
        console.warn(`Failed to locate matching context block:\n${context.join('\n')}`);
    console.log("================================")

        return;
      }
  
      // build new block (context + additions)
      const newBlock = [];
      for (let line of hunk) {
        if (line.type !== 'remove') {
            newBlock.push(line.content);
        }
      }
      
      // TODO: 替换这里还需要优化，可能context的长度 和匹配的行数不一致
      workingLines.splice(matchIndex, context.length, ...newBlock);
    }
    console.log("================================", workingLines.join('\n'))
    return workingLines.join('\n');
  }
  
  /**
   * Attempts to locate the best fuzzy match for context block within code.
   * Ignores leading/trailing whitespace and allows slight mismatches.
   */
  function findBestMatchIndex(lines, context) {
      const maxOffset = lines.length - context.length;
      console.log(`开始匹配，原始:`,lines, `上下文:`, context, `maxOffset: ${maxOffset}`)
      
      let bestMatchIndex = -1;
      let bestMatchScore = 0;
      
      for (let i = 0; i <= maxOffset; i++) {
        let matchScore = 0;
        let consecutiveMatches = 0;
        let totalMatches = 0;
        let findStart = false;
        
        for (let j = 0; j < context.length; j++) {
          const targetLine = lines[i + j].trim();
          const expectedLine = context[j].trim();
          
          if (targetLine === expectedLine) {
            findStart = true;
            consecutiveMatches++;
            totalMatches++;
            // console.log(`origin line: "${targetLine}", context line: "${expectedLine}"`)
            // console.log(`从第${i}行开始匹配，第${j}行匹配，连续匹配: ${consecutiveMatches}`)
          } else {
            if (findStart) {
            //   console.log(`origin line: "${targetLine}", context line: "${expectedLine}"`)
            //   console.log(`从第${i}行开始匹配，第${j}行不匹配`)
              consecutiveMatches = 0;
            }
          }
        }
        
        // 计算匹配分数：总匹配数 + 连续匹配的奖励分数
        matchScore = totalMatches + (consecutiveMatches * 0.5);
        
        // 如果找到更好的匹配，更新最佳匹配
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatchIndex = i;
          console.log(`找到更好的匹配，索引: ${i}, 分数: ${matchScore}`);
          if(totalMatches === context.length) {
            console.log(`完全匹配，索引: ${i}, 分数: ${matchScore}`);
            return i;
          }
        }
      }
      
      // 只有当匹配分数达到一定阈值时才返回匹配结果
      const minMatchThreshold = context.length * 0.7; // 至少70%的匹配
      if (bestMatchScore >= minMatchThreshold) {
        console.log(`模糊匹配索引: ${bestMatchIndex}, 分数: ${bestMatchScore}`);
        return bestMatchIndex;
      }
      
      console.log(`未找到足够好的匹配，最佳分数: ${bestMatchScore}, 阈值: ${minMatchThreshold}`);
      return -1;
  }
  

// test
const testArray = [
// {
//     name: '基础测试',
//     originalCode: `
//     <div class="container">
//         <h1>Hello</h1>
//     </div>
//     `,
//     patchText: 
//     `@@ ... @@
//     <div class="container">
//     -    <h1>Hello</h1>
//     +    <h1>Hello World</h1>
//     </div>
//     `,
// }, 
// {
//     name: '测试新增',
//     originalCode: `
//     <div class="container">
//         <h1>Hello</h1>
//     </div>
//     `,
//     patchText: 
//     `@@ ... @@
//     <div class="container">
//          <h1>Hello</h1>
//     +    <h1>World</h1>
//     +    <h1>World2</h1>
//     +    <h1>World3</h1>
//     +    <h1>World4</h1>
//     +    <h1>World5</h1>
//     </div>
//     `
// }, {
//     name: '测试缩进不一致',
//     originalCode: `
//     <div class="container">
//         <h1>Hello</h1>
//     </div>
//     `,
//     patchText: 
//     `@@ ... @@
//         <div class="container">
//     -<h1>Hello</h1>
//     + <h1>World</h1>
//     +  <h1>World2</h1>
//     +<h1>World3</h1>`
// }, {
//     name: '测试缩进不一致',
//     originalCode: `
//     <div class="container">
//         <h1>Hello</h1>
//     </div>
//     `,
//     patchText: 
//     `@@ ... @@
//         <div class="container">
//     -<h1>Hello</h1>
//     + <h1>World</h1>
//     +  <h1>World2</h1>
//     +<h1>World3</h1>`
// }, {
//     name: '测试多次修改',
//     originalCode: `
//     <div class="container1">
//         <h1>Hello</h1>
//     </div>
//     <div class="container2">
//         <h1>Hello</h1>
//     </div>
//     <div class="container3">
//         <h1>Hello</h1>
//     </div>
//     <div class="container4">
//         <h1>Hello</h1>
//     </div>
//     `,
//     patchText: 
//     `@@ ... @@
//     <div class="container2">
//     -    <h1>Hello</h1>
//     +    <h1>World</h1>
//     </div>
//     <div class="container3">
//         <h1>Hello</h1>
//     +    <h1>World</h1>
//     </div>`
// }, 
{
    name: '测试多个patch',
    originalCode: 
`       .slr-option-radio {
            display: none;
        }

        .slr-option-btn {
            background: #fff;
            color: #000;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            transition: all 0.15s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            min-width: fit-content;
        }

        .slr-option-btn:hover {
            border-color: #222222;
        }

        .slr-option-radio:checked + .slr-option-btn {
            background: #222222;
            color: #fff;
            border-color: #222222;
        }

        /* 数量选择器 */
        .slr-quantity-group {
            margin-bottom: 1.5rem;
        }

        .slr-quantity-container {
            display: flex;
            align-items: center;
            width: 8rem;
            height: 2.5rem;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
        }

        .slr-quantity-btn {
            width: 2.5rem;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 1.25rem;
        }

        .slr-quantity-btn:first-child {
            border-right: 2px solid #e5e7eb;
        }

        .slr-quantity-btn:last-child {
            border-left: 2px solid #e5e7eb;
        }

        .slr-quantity-input {
            width: 3rem;
            height: 100%;
            text-align: center;
            border: none;
            outline: none;
            font-size: 1rem;
        }

        /* 按钮样式 */
        .slr-button-group {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .slr-btn {
            flex: 1;
            height: 3rem;
            font-weight: 500;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
            font-size: 1rem;
        }

        .slr-btn-primary {
            background: #222222;
            color: #fff;
        }

        .slr-btn-primary:hover {
            background: #000;
        }

        .slr-btn-outline {
            background: #fff;
            color: #222222;
            border: 2px solid #222222;
        }

        .slr-btn-outline:hover {
            background: #222222;
            color: #fff;
        }

        .slr-btn-disabled {
            background: #9ca3af;
            color: #fff;
            cursor: not-allowed;
        }

        /* 服务信息 */
        .slr-service-info {
            display: flex;
            align-items: center;
            gap: 1.5rem;
            font-size: 0.875rem;
            color: #6b7280;
        }

        .slr-service-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        /* Tab 样式 */
        .slr-tab-container {
            margin-top: 3rem;
        }

        .slr-tab-header {
            border-bottom: 1px solid #e5e7eb;
        }

        .slr-tab-nav {
            display: flex;
            border-bottom: 1px solid #e5e7eb;
        }

        .slr-tab-radio {
            display: none;
        }

        .slr-tab-label {
            padding: 1rem 2rem;
            text-align: center;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.15s ease;
        }

        .slr-tab-radio:checked + .slr-tab-label {
            color: #222222;
            border-bottom: 2px solid #222222;
        }

        .slr-tab-content {
            display: none;
            width: 100%;
            padding: 1.5rem;
        }

        .slr-tab-content.active {
            display: block;
        }

        .slr-tab-content-inner {
            max-width: 1280px;
            margin: 0 auto;
        }

        .slr-product-description {
            color: #6b7280;
        }

        .slr-product-description > * + * {
            margin-top: 1rem;
        }

        .slr-no-reviews {
            text-align: center;
            color: #6b7280;
        }

        .slr-no-reviews i {
            font-size: 2.25rem;
            margin-bottom: 1rem;
            display: block;
        }

        /* 图片预览样式 */
        .slr-preview-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }

        .slr-preview-overlay.active {
            display: flex;
        }

        .slr-preview-image {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
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
        }

        /* Remix Icon 修复 */
        :where([class^="ri-"])::before {
            content: "\f3c2";
        }

        /* 数字输入框样式 */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
            .slr-container {
                padding: 0 0.5rem;
            }
            
            .slr-product-layout {
                gap: 1rem;
                padding: 1rem 0;
            }
            
            .slr-button-group {
                flex-direction: column;
            }
            
            .slr-service-info {
                flex-direction: column;
                gap: 0.75rem;
                align-items: flex-start;
            }
            
            .slr-tab-nav {
                flex-direction: column;
            }
            
            .slr-tab-label {
                padding: 0.75rem 1rem;
            }
        }
    </style>
</head>`,
    patchText: 
`@@ ... @@
            .slr-option-btn {
                background: #fff;
                color: #000;
                border: 2px solid #e5e7eb;
-               border-radius: 8px;
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                cursor: pointer;
                min-width: fit-content;
            }

@@ ... @@
            .slr-quantity-container {
                display: flex;
                align-items: center;
                width: 8rem;
                height: 2.5rem;
                border: 2px solid #e5e7eb;
-               border-radius: 8px;
            }

@@ ... @@
            .slr-btn {
                flex: 1;
                height: 3rem;
                font-weight: 500;
-               border-radius: 8px;
                border: none;
                cursor: pointer;
                transition: all 0.15s ease;
                font-size: 1rem;
            }`
}
]

testArray.forEach(test => {
    const result = parseAndApplyPatch(test.patchText, test.originalCode);
    console.log(`${test.name}
        原始代码: ${test.originalCode}
        补丁代码: ${test.patchText}
        结果: ${result}`)
});
