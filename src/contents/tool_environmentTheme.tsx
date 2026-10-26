import type { PlasmoCSConfig } from "plasmo";

import EnvironmentThemeProcess from "~processes/environmentTheme/tool";
import { buildGetRootContainer } from "~utils/global/toolContentAbstract";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};
export const getRootContainer = buildGetRootContainer(EnvironmentThemeProcess);

export default () => null;
