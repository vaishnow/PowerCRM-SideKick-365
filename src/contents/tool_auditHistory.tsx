import type { PlasmoCSConfig } from "plasmo";

import AuditHistoryProcess from "~processes/auditHistory/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(AuditHistoryProcess);

export default () => null;
