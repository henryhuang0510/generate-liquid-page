// Jest 设置文件
global.console = {
  ...console,
  // 在测试中禁用某些console输出
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} 