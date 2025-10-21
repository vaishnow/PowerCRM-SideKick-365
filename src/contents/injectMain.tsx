import { unstable_ClassNameGenerator as ClassNameGenerator } from "@mui/material/className";
import type { PlasmoCSConfig, PlasmoCSUIJSXContainer, PlasmoRender } from "plasmo";
import { createRoot } from "react-dom/client";

import { MainScreen } from "~processes/main";
import { ProcessButton } from "~utils/global/.processClass";
import { waitForElm } from "~utils/global/common";
import { DRAWER_CONTAINER_ID, MESSAGE_SOURCE_Content, PROJECT_PREFIX } from "~utils/global/var";
import XrmObserver from "~utils/global/XrmObserver";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    world: "MAIN"
};

const searchedScripts = ["/uclient/scripts/cdnEndpointCheck.js", "/uclient/scripts/MicrosoftAjax.js"];
var messageListenerReady = false;

const onMessage = (event: MessageEvent) => {
    if (event.data?.source === MESSAGE_SOURCE_Content && event.data?.type === `${PROJECT_PREFIX}messageListenerReady`) {
        messageListenerReady = true;
        window.removeEventListener("message", onMessage);
    }
};
window.addEventListener("message", onMessage);

export const getRootContainer = () =>
    new Promise((resolve) => {
        const checkAndResolve = () => {
            const mainContent = document.querySelector("#mainContent");
            const isCRMD365 = Array.from(document.scripts).some((script) =>
                searchedScripts.some((src) => script.src.includes(src))
            );

            if (mainContent && isCRMD365 && messageListenerReady) {
                const drawerContainer = document.createElement("div");
                drawerContainer.id = ProcessButton.prefixId + DRAWER_CONTAINER_ID;
                mainContent.append(drawerContainer);
                observer.disconnect();
                resolve(drawerContainer);
            }
        };

        checkAndResolve();

        const observer = new MutationObserver(checkAndResolve);
        observer.observe(document.body, { childList: true, subtree: true });
    });

export const render: PlasmoRender<PlasmoCSUIJSXContainer> = async ({
    createRootContainer // This creates the default root container
}) => {
    const rootContainer = await createRootContainer();

    const root = createRoot(rootContainer, {
        identifierPrefix: ProcessButton.prefixId
    });
    root.render(<MainScreen />);
};

const fileName = "d365-sidekick";

// function initExtension() {
//     waitForElm(document, "#mainContent", { infiniteWait: true }).then((mainNode) => {
//         const drawerContainer = document.createElement("div");
//         drawerContainer.setAttribute("id", ProcessButton.prefixId + DRAWER_CONTAINER_ID);
//         mainNode?.append(drawerContainer);

//         const root = createRoot(drawerContainer, {
//             identifierPrefix: ProcessButton.prefixId
//         });
//         root.render(<MainScreen />);
//     });

//     new XrmObserver();
// }

// setTimeout(async () => {
//     const isCRMD365 = Array.from(document.scripts).some((script) =>
//         searchedScripts.some((src) => script.src.indexOf(src) !== -1)
//     );
//     console.log("This page is CRM:", isCRMD365);
//     if (isCRMD365) {
//         if (window.top && window.top.window === window) {
//             var loading = setInterval(() => {
//                 if (!!window.top.Xrm) {
//                     clearInterval(loading);
//                     initExtension();
//                 }
//             }, 1000);
//         }
//     }
// }, 2000);

ClassNameGenerator.configure((componentName) => `${PROJECT_PREFIX}${componentName.replace("Mui", "")}`);

export default () => null;
