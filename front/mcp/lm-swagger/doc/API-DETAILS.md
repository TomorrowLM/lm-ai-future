# 接口详细信息

## 📋 基本信息

- **接口名称**: 检查任务分页查询
- **API 路径**: `/dsb/yqarw/api/yqa/urban/checkplan/task/page`
- **请求方式**: `POST`
- **操作 ID**: `pageUsingPOST_11`
- **标签**: 城市管理-检查任务接口

---

## 📥 请求参数

### 请求体 Schema (UrbanCheckPlanTaskPageReq)

| 参数名 | 类型 | 必须 | 说明 |
|--------|------|------|------|
| checkDateEnd | string | 否 | 检查时间范围-结束 |
| checkDateStart | string | 否 | 检查时间范围-开始 |
| keyword | string | 否 | 关键词（名称/检查人） |
| overdue | boolean | 否 | 是否逾期 |
| pageNo | integer | 否 | 页码 |
| pageSize | integer | 否 | 每页大小 |
| source | integer | 否 | 来源:10=城管,20=序化 |
| status | integer | 否 | 状态:10=进行中,20=已完成,30=已取消 |
| type | integer | 否 | 类型:10=环境卫生 |

### 请求示例

```json
{
  "checkDateEnd": "",
  "checkDateStart": "",
  "keyword": "",
  "overdue": false,
  "pageNo": 0,
  "pageSize": 0,
  "source": 0,
  "status": 0,
  "type": 0
}
```

---

## 📤 响应参数

### 响应状态

| 状态码 | 说明 |
|--------|------|
| 200 | OK |
| 201 | Created |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |

### 响应体 Schema (PageResult«UrbanCheckPlanTaskPageRes»)

| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | integer | 状态码 |
| count | integer | 总数 |
| datas | array | 数据列表 |
| └─ address | string | 地址 |
| └─ checkDate | string(date-time) | 检查时间 |
| └─ eventCount | integer | 事件数量 |
| └─ handlerPersonNames | array[string] | 处理人名称数组 |
| └─ id | integer | ID |
| ─ name | string | 名称 |
| ─ status | integer | 状态 |
| ─ statusName | string | 状态名称 |
| └─ type | integer | 类型 |
| └─ typeName | string | 类型名称 |
| traceId | string | 追踪ID |

### 响应示例

```json
{
  "code": 0,
  "count": 0,
  "datas": [
    {
      "address": "",
      "checkDate": "",
      "eventCount": 0,
      "handlerPersonNames": [],
      "id": 0,
      "name": "",
      "status": 0,
      "statusName": "",
      "type": 0,
      "typeName": "",
      "traceId": ""
    }
  ],
  "traceId": ""
}
```

---

## 🔧 数据来源

- **提取方式**: 从 Swagger JSON 数据解析（非 HTML 页面解析）
- **数据源**: `/dsb/yqarw/api/v3/api-docs?group=任务管理`
- **提取时间**: 2026-05-23
- **OpenAPI 版本**: 3.0.3

---

##  说明

此文档是通过解析 Swagger/OpenAPI 3.0.3 规范自动生成的，包含了：
1. 接口的基本信息（名称、路径、方法）
2. 完整的请求参数定义（包括类型、是否必须、说明）
3. 完整的响应参数定义（包括嵌套对象的属性）
4. 请求和响应的示例数据

相比直接解析 HTML 页面，这种方式更准确、更可靠，因为：
- ✅ 数据来源于 API 规范，不是渲染后的页面
- ✅ 包含完整的类型定义和说明
- ✅ 自动解析 `$ref` 引用，展开嵌套对象
- ✅ 支持递归展开复杂的数据结构
