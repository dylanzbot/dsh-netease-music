// 只放宽 subject 大小写 / 结尾标点，对中文描述友好。
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'subject-full-stop': [0],
  },
}
