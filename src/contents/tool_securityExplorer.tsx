import type { PlasmoCSConfig } from "plasmo";

import SecurityExplorerProcess from "~processes/securityExplorer/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(SecurityExplorerProcess);

export default () => null;
