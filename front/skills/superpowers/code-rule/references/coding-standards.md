# 项目编码规范

## 一、通用规范

1. 文件内容编码统一采用 UTF-8
2. 变量命名：驼峰式，例：defaultConfig
3. class 命名：小写字母+连字符
4. 业务相关命名使用中文拼音首字母相连，其余使用英文单词，例：数据采集 → sjcj、首页 → home
5. 注释解释"为什么"，而非"做了什么"
6. 文本缩进 2 个空格
7. 提交前格式化代码
8. 文件/模块名简洁描述功能业务，例：org-manage、edit-cur-dept、personnel-list
9. 数据为空时用 `--` 表示

## 二、Vue 规范

1. 文件结构顺序：`<template>` → `<script>` → `<style lang="scss">`
2. 文件名使用短横线命名，例：`user-profile.vue`
3. 组件名使用 PascalCase，例：`UserProfile`
4. Props 定义必须使用驼峰命名、指定类型、添加注释
   ```javascript
   props: {
     userInfo: {
       type: Object,
       required: true,
       default: () => ({})
     }
   }
   ```
5. 自动化测试 ID 格式：`模块名-功能描述-类型`
   ```html
   <input id="login-username-input" />
   <button id="xxts-xxlb-search-btn">搜索</button>
   ```
6. 生命周期钩子顺序：name → props → data → computed → watch → created → mounted → methods

## 三、HTML 规范

1. 优先使用语义化元素（header、nav、h1 等）
2. 保持代码简洁
3. 重要图片添加 alt 属性
4. 表格内重要信息添加 title 属性
5. HTML 注释格式：`<!--<div></div>-->`
6. input/button 必须添加测试用 id

## 四、CSS / SCSS / LESS 规范

1. 减少 ID 选择器，避免 !important（公共样式除外）
2. 避免覆盖样式，尽量不使用行内样式
3. 多浏览器兼容时，标准属性写在底部
4. z-index ≤ 150（公共样式和提示框除外），禁止使用 999~9999
5. "0"值省略单位，例：`padding: 0 20px`
6. 每个声明以分号结束
7. 保持盒模型一致，不随意修改
8. 不改变元素默认行为
9. 不重复声明可继承样式，使用属性缩写
10. 能用英文时不用数字，例：`nth-child(odd)`
11. 颜色使用十六进制（透明效果用 rgba）
12. CSS 注释格式：`/* color: #ffffff; */`
13. **禁止**使用 `max-height`
14. **禁止**在 HTML 中使用 style

## 五、JavaScript 规范

1. 避免多余逗号，例：`var arr = [1, 2, 3]`
2. 方法封装实现代码重用，避免副作用
3. 使用严格条件判断符
4. 语句以分号结束（使用 ESLint 除外）
5. 布尔变量以 `is` 开头，例：isArray
6. 变量声明统一放在函数起始位置
7. 条件判断使用多个 if，少用 if-else if-else
8. 推荐定义变量：`var a = 1, y = 2`
9. 推荐数组写法：`var array = [1, 2, 3]`
10. 推荐对象写法：
    ```javascript
    var object = { a: 1, b: 2 }
    ```
11. 循环优先使用 forEach / map
    ```javascript
    array.forEach(function(value, index, array) {
      console.log(value)
    })
    ```
12. 尽可能减少第三方库使用

## 六、注释规范

1. 文件注释（文件最前面）：
   ```javascript
   /**
    * @author : 作者
    * @date : 时间
    * @module : 模块名
    * @description : 模块描述
    * @version : 版本号
    */
   ```
2. 单行注释：`// `（注释符后加空格）
3. 多行注释：`/* ... */`（结束符前留空格）
4. TODO 标记：未实现功能必须标注
   ```javascript
   // TODO 未处理分页
   ```
5. 文档注释：
   ```javascript
   /**
    * 方法说明
    * @method 方法名
    * @for 所属类名
    * @param {类型} 参数名 参数说明
    * @return {类型} 返回值说明
    */
   ```

## 七、项目结构

```
src/
├── components/    # 公共组件
├── utils/         # 工具方法
├── api/           # 接口定义
└── styles/        # 全局样式
```
