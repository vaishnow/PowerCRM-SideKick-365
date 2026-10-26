import type { PlasmoCSConfig } from "plasmo";

import FetchXmlBuilderProcess from "~processes/fetchXmlBuilder/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(FetchXmlBuilderProcess);

export default () => null;
