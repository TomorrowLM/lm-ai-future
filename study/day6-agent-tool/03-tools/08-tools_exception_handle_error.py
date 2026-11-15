from langchain_core.tools import StructuredTool, ToolException


def get_weather(city: str) -> str:
    """获取给定城市的天气。"""
    raise ToolException(f"错误：没有名为{city}的城市。")


def _handle_error(error: ToolException) -> str:
    return f"工具执行期间发生以下错误：`{error}`"


get_weather_tool = StructuredTool.from_function(
    func=get_weather,
    handle_tool_error=_handle_error,
)

response = get_weather_tool.invoke({"city": "foobar"})
print(response)
