import React, { useState } from 'react'

const AIUsageExamples = () => {
  const [isExpanded, setIsExpanded] = useState(false)

  const examples = [
    {
      title: '优化商品价格显示',
      description: '将原始价格格式化为货币格式',
      prompt: '优化商品价格显示，使用货币格式化',
      before: '{{ product.price }}',
      after: '{{ product.price | money }}'
    },
    {
      title: '添加商品变体选择器',
      description: '为多变体商品创建选择器',
      prompt: '添加商品变体选择器，显示价格和库存状态',
      before: '<!-- 无变体选择器 -->',
      after: `{% if product.variants.size > 1 %}
  <select name="id" id="variant-selector">
    {% for variant in product.variants %}
      <option value="{{ variant.id }}" 
              {% if variant == product.selected_or_first_available_variant %}selected{% endif %}>
        {{ variant.title }} - {{ variant.price | money }}
      </option>
    {% endfor %}
  </select>
{% endif %}`
    },
    {
      title: '创建商品图片轮播',
      description: '展示商品的所有图片',
      prompt: '创建商品图片轮播，支持多张图片展示',
      before: '{{ product.featured_image | img_url: "400x400" }}',
      after: `{% if product.images.size > 1 %}
  <div class="product-gallery">
    {% for image in product.images %}
      <img src="{{ image | img_url: '400x400' }}" 
           alt="{{ image.alt | escape }}"
           class="product-image {% if forloop.first %}active{% endif %}">
    {% endfor %}
  </div>
{% else %}
  <img src="{{ product.featured_image | img_url: '400x400' }}" 
       alt="{{ product.title | escape }}">
{% endif %}`
    },
    {
      title: '添加库存状态显示',
      description: '显示商品的库存信息',
      prompt: '添加库存状态显示，包括库存数量和缺货提示',
      before: '<!-- 无库存信息 -->',
      after: `{% if product.available %}
  <p class="stock-status in-stock">
    库存: {{ product.variants.first.inventory_quantity }} 件
  </p>
{% else %}
  <p class="stock-status out-of-stock">暂时缺货</p>
{% endif %}`
    }
  ]

  return (
    <div className="ai-examples-container">
      <button 
        className="examples-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>AI 使用示例</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none"
          className={isExpanded ? 'expanded' : ''}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      
      {isExpanded && (
        <div className="examples-content">
          <p className="examples-intro">
            以下是一些常见的 AI 使用场景，你可以参考这些示例来更好地使用 AI 助手：
          </p>
          
          <div className="examples-list">
            {examples.map((example, index) => (
              <div key={index} className="example-item">
                <h4>{example.title}</h4>
                <p className="description">{example.description}</p>
                
                <div className="code-comparison">
                  <div className="code-section">
                    <h5>优化前</h5>
                    <pre><code>{example.before}</code></pre>
                  </div>
                  
                  <div className="code-section">
                    <h5>优化后</h5>
                    <pre><code>{example.after}</code></pre>
                  </div>
                </div>
                
                <div className="prompt-example">
                  <strong>AI 提示词：</strong>
                  <code>{example.prompt}</code>
                </div>
              </div>
            ))}
          </div>
          
          <div className="usage-tips">
            <h4>使用技巧</h4>
            <ul>
              <li>描述要具体，比如"添加商品变体选择器"而不是"优化代码"</li>
              <li>可以指定特定的功能需求，如"添加库存状态显示"</li>
              <li>AI 会考虑当前的商品数据，生成相应的代码</li>
              <li>生成的代码会立即在预览中显示效果</li>
            </ul>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .ai-examples-container {
          background: #252525;
          border-radius: 8px;
          margin: 16px 0;
          overflow: hidden;
        }
        
        .examples-toggle {
          width: 100%;
          background: #333;
          border: none;
          color: #fff;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        
        .examples-toggle:hover {
          background: #444;
        }
        
        .examples-toggle svg {
          transition: transform 0.2s;
        }
        
        .examples-toggle svg.expanded {
          transform: rotate(180deg);
        }
        
        .examples-content {
          padding: 16px;
        }
        
        .examples-intro {
          color: #ccc;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        
        .examples-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .example-item {
          border: 1px solid #333;
          border-radius: 6px;
          padding: 16px;
          background: #1a1a1a;
        }
        
        .example-item h4 {
          color: #fff;
          margin: 0 0 8px 0;
          font-size: 16px;
        }
        
        .description {
          color: #ccc;
          margin: 0 0 12px 0;
          font-size: 14px;
        }
        
        .code-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .code-section h5 {
          color: #fff;
          margin: 0 0 8px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .code-section pre {
          background: #000;
          border-radius: 4px;
          padding: 8px;
          margin: 0;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .code-section code {
          color: #e6e6e6;
          background: none;
          padding: 0;
        }
        
        .prompt-example {
          background: #333;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 13px;
        }
        
        .prompt-example strong {
          color: #fff;
          margin-right: 8px;
        }
        
        .prompt-example code {
          color: #4caf50;
          background: none;
          padding: 0;
        }
        
        .usage-tips {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #333;
        }
        
        .usage-tips h4 {
          color: #fff;
          margin: 0 0 12px 0;
          font-size: 16px;
        }
        
        .usage-tips ul {
          color: #ccc;
          margin: 0;
          padding-left: 20px;
          line-height: 1.5;
        }
        
        .usage-tips li {
          margin-bottom: 6px;
        }
        
        @media (max-width: 768px) {
          .code-comparison {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

export default AIUsageExamples 