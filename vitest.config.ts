import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 所有测试集中在 tests/ 下，按 client / host 分子目录。
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // 默认用 Node 环境（host 侧与纯函数测试）。需要 DOM 的测试文件用
    // 文件头注释 `// @vitest-environment jsdom` 单独切换。
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      reporter: ['text', 'html'],
    },
  },
})
