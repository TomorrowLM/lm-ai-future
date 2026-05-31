// import { helloWorldTool, handleHelloWorldTool } from "../server/base/hello-world/index.js";
import { swaggerGetModelTool, handleSwaggerGetModelTool } from "../server/base/swagger/index.js";
// export const tools = [helloWorldTool, swaggerGetModelTool, createApiTool, createUiTool];
export const tools = [swaggerGetModelTool];
export async function dispatchTool(request) {
    switch (request.params.name) {
        // case helloWorldTool.name:
        //   return handleHelloWorldTool(request);
        case swaggerGetModelTool.name:
            return handleSwaggerGetModelTool(request);
        // case createApiTool.name:
        //   return handleCreateApiTool(request);
        // case createUiTool.name:
        //   return handleCreateUiTool(request);
        default:
            return undefined;
    }
}
