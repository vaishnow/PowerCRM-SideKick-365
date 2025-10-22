
export const DECLARATIVE_NET_REQUEST_PREFIX_ID: number = 56850000;

export function getSessionRules(): Promise<chrome.declarativeNetRequest.Rule[] | null> {
    return chrome.declarativeNetRequest.getSessionRules();
}