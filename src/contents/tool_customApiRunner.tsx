import type { PlasmoCSConfig } from "plasmo";

import CustomApiRunnerProcess from "~processes/customApiRunner/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(CustomApiRunnerProcess);

export default () => null;
