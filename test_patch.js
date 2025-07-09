import { parseAndApplyPatch } from './src/services/aiService.js'

// 测试原始代码
const originalCode = `
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
`

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