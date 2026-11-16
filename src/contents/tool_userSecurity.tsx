import type { PlasmoCSConfig } from "plasmo";

import UserSecurityProcess from "~processes/userSecurity/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(UserSecurityProcess);

export default () => null;
