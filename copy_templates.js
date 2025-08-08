const fs = require('fs');
const path = require('path');

// 模板映射关系
const templateMapping = {
  'src/data/patPage/index.liquid': 'baby.liquid',
  'src/data/foodPage/index.liquid': 'food.liquid',
  'src/data/homePage/index.liquid': 'home.liquid',
  'src/data/infantPage/index.liquid': 'clothes.liquid',
  'src/data/jewelryPage/index.liquid': 'jewelry.liquid',
  'src/data/productPage/index.liquid': 'electronics.liquid'
};

// 确保目标目录存在
const targetDir = 'upload_templates';
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`创建目录: ${targetDir}`);
}

// 复制并重命名文件
let successCount = 0;
let errorCount = 0;

for (const [sourcePath, targetName] of Object.entries(templateMapping)) {
  try {
    const targetPath = path.join(targetDir, targetName);
    
    // 检查源文件是否存在
    if (!fs.existsSync(sourcePath)) {
      console.log(`❌ 源文件不存在: ${sourcePath}`);
      errorCount++;
      continue;
    }
    
    // 复制文件
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ 已复制: ${sourcePath} -> ${targetPath}`);
    successCount++;
    
  } catch (error) {
    console.log(`❌ 复制失败 ${sourcePath}: ${error.message}`);
    errorCount++;
  }
}

// 创建 beauty.liquid 和 default_template.liquid（如果需要的话）
// 这里我们使用 electronics.liquid 作为 beauty.liquid 的模板
try {
  const beautySource = 'src/data/productPage/index.liquid';
  const beautyTarget = path.join(targetDir, 'beauty.liquid');
  
  if (fs.existsSync(beautySource)) {
    fs.copyFileSync(beautySource, beautyTarget);
    console.log(`✅ 已复制: ${beautySource} -> ${beautyTarget}`);
    successCount++;
  }
} catch (error) {
  console.log(`❌ 复制 beauty.liquid 失败: ${error.message}`);
  errorCount++;
}

// 创建 default_template.liquid（使用 home.liquid 作为默认模板）
try {
  const defaultSource = 'src/data/homePage/index.liquid';
  const defaultTarget = path.join(targetDir, 'default_template.liquid');
  
  if (fs.existsSync(defaultSource)) {
    fs.copyFileSync(defaultSource, defaultTarget);
    console.log(`✅ 已复制: ${defaultSource} -> ${defaultTarget}`);
    successCount++;
  }
} catch (error) {
  console.log(`❌ 复制 default_template.liquid 失败: ${error.message}`);
  errorCount++;
}

// 创建 pet.liquid（使用 food.liquid 作为宠物模板）
try {
  const petSource = 'src/data/foodPage/index.liquid';
  const petTarget = path.join(targetDir, 'pet.liquid');
  
  if (fs.existsSync(petSource)) {
    fs.copyFileSync(petSource, petTarget);
    console.log(`✅ 已复制: ${petSource} -> ${petTarget}`);
    successCount++;
  }
} catch (error) {
  console.log(`❌ 复制 pet.liquid 失败: ${error.message}`);
  errorCount++;
}

console.log('\n📊 复制完成统计:');
console.log(`✅ 成功: ${successCount} 个文件`);
console.log(`❌ 失败: ${errorCount} 个文件`);

// 显示最终结果
console.log('\n📁 upload_templates 目录中的文件:');
try {
  const files = fs.readdirSync(targetDir);
  files.forEach(file => {
    console.log(`  - ${file}`);
  });
} catch (error) {
  console.log(`无法读取目录内容: ${error.message}`);
} 