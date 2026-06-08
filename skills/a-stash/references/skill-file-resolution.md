# 子技能文件定位规则

当 `/superpowers` 已经确定要进入某个子技能时，使用这份参考规则来读取对应的 `SKILL.md`。

## 固定目录

`/superpowers` 的子技能文件位于当前工作区内的固定目录：`skills/superpowers/skills/`。

这里要区分两层含义：

1. **逻辑定位路径**：始终是工作区内相对路径 `skills/superpowers/skills/<skill-name>/SKILL.md`
2. **工具调用路径**：如果当前读取工具要求绝对路径，就先用“当前工作区根目录 + 逻辑定位路径”拼接出唯一绝对路径，再直接读取该文件

## 读取顺序

当已经确定子技能后，读取规则必须按下面顺序执行：

1. 先确定唯一逻辑定位路径：`skills/superpowers/skills/<skill-name>/SKILL.md`
2. 如果工具支持相对路径，就直接读取这个相对路径
3. 如果工具要求绝对路径，就用当前工作区根目录拼接出唯一绝对路径后直接读取，不要先搜索
4. 不要先用绝对路径、盘符路径或全局 glob 搜索来“找文件”，例如 `c:\Users\...\skills\**/SKILL.md`
5. 不要先做“搜索所有 SKILL.md 再筛选”的冗余步骤；已知技能名时，应直接读取目标文件
6. 如果直接读取失败，再明确告知用户“未能读取该子技能规则”，并说明将采用的最接近兜底流程

## 示例

已经确定使用 `brainstorming` 时：

1. 逻辑定位路径是：`skills/superpowers/skills/brainstorming/SKILL.md`
2. 如果工具要求绝对路径，而当前工作区根目录是 `c:\Users\liming\.copilot`，则应直接读取：`c:\Users\liming\.copilot\skills\superpowers\skills\brainstorming\SKILL.md`

这仍然属于“直接读取目标文件”，不属于“先搜索文件”。

## 常见错误

以下行为是错误的：

1. 用户已经指定子技能，模型却先去搜索绝对路径或全局 `SKILL.md` 列表，而不是直接读取目标文件
2. 工具明明要求绝对路径，模型却把相对路径读取失败误判成“文件不存在”
3. 把“绝对路径搜索不到”或“相对路径未直接命中”表述成“子技能不存在”