import type { PlasmoCSConfig } from "plasmo";

import WorkflowExplorerProcess from "~processes/workflowExplorer/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(WorkflowExplorerProcess);

export default () => null;
