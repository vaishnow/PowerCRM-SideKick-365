import type { PlasmoCSConfig } from "plasmo";

import FormFlagsProcess from "~processes/formFlags/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(FormFlagsProcess);

export default () => null;
