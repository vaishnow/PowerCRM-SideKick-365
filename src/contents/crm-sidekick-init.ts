import type { PlasmoCSConfig } from "plasmo";

import { EXTENSION_STORAGE_SUFFIX, MESSAGE_SOURCE_Content, MESSAGE_SOURCE_WebPage, PROJECT_PREFIX } from "~utils/global/var";

export const config: PlasmoCSConfig = {
    matches: ["*://*/*"],
    run_at: "document_start"
};

const searchedScripts = ["/uclient/scripts/cdnEndpointCheck.js", "/uclient/scripts/MicrosoftAjax.js"];

window.onload = async () => {
    const isCRMD365 = Array.from(document.scripts).some((script) =>
        searchedScripts.some((src) => script.src.indexOf(src) !== -1)
    );
    console.log("This page is CRM:", isCRMD365);
    if (isCRMD365) {
        // SaveData(chrome.runtime.getURL(""), "extensionUrl");
        storeExtensionId();
        setListener();
    }
};

function storeExtensionId() {
    const id =
        chrome.runtime?.id ?? (chrome.runtime?.getURL ? new URL(chrome.runtime.getURL("")).host : "");
    document.documentElement.setAttribute(PROJECT_PREFIX + EXTENSION_STORAGE_SUFFIX, id);
}

function setListener() {
    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (event.data.source !== MESSAGE_SOURCE_WebPage) return;

        const messageId = event.data.id;

        chrome.runtime.sendMessage({ type: event.data.type, data: event.data.data }, function (response: any) {
            window.postMessage({ id: messageId, source: MESSAGE_SOURCE_Content, response }, "*");
        });
    });

    window.postMessage({ type: `${PROJECT_PREFIX}messageListenerReady`, source: MESSAGE_SOURCE_Content }, "*");
}
