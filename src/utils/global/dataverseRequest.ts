import type { ActiveUser } from "../types/ActiveUser";
import { formatId } from "./common";

export const API_BASE = "/api/data/v9.0/";

export type WriteSettings = {
    method: "legacy" | "new";
    bypassCustomSync: boolean;
    bypassCustomAsync: boolean;
    suppressDuplicateDetection: boolean;
    suppressFlows: boolean;
    impersonateUser: ActiveUser | null;
};

export const defaultWriteSettings: WriteSettings = {
    method: "legacy",
    bypassCustomSync: false,
    bypassCustomAsync: false,
    suppressDuplicateDetection: false,
    suppressFlows: false,
    impersonateUser: null
};

export function getApiUrl() {
    return Xrm.Utility.getGlobalContext().getClientUrl() + API_BASE;
}

export function buildHeaders(settings: WriteSettings): Record<string, string> {
    const headers: Record<string, string> = {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json"
    };

    const businessLogic = [
        settings.bypassCustomSync ? "CustomSync" : null,
        settings.bypassCustomAsync ? "CustomAsync" : null
    ]
        .filter(Boolean)
        .join(",");
    if (businessLogic) {
        headers["MSCRM.BypassBusinessLogicExecution"] = businessLogic;
    }
    if (settings.suppressDuplicateDetection) {
        headers["MSCRM.SuppressDuplicateDetection"] = "true";
    }
    if (settings.suppressFlows) {
        headers["MSCRM.SuppressCallbackRegistrationExpanderJob"] = "true";
    }

    const user = settings.impersonateUser;
    if (user) {
        const isOnPrem = (Xrm.Utility.getGlobalContext() as any).isOnPremises();
        if (!isOnPrem && user.azureObjectId) {
            headers["CallerObjectId"] = user.azureObjectId;
        } else {
            headers["MSCRMCallerID"] = formatId(user.systemuserid);
        }
    }

    return headers;
}

/** Normalizes a failed Response into the { errorCode, message, raw } shape Xrm.WebApi rejects with. */
export async function rejectFromResponse(response: Response): Promise<never> {
    const raw = await response.text();
    let code: string | undefined;
    let message: string | undefined;
    try {
        const body = JSON.parse(raw);
        code = body?.error?.code;
        message = body?.error?.message;
    } catch {
        // non-JSON body (HTML error page, proxy response): keep raw as-is
    }
    const parsed = code ? (code.startsWith("0x") ? parseInt(code, 16) : Number(code)) : response.status;
    return Promise.reject({
        errorCode: Number.isFinite(parsed) ? parsed : response.status,
        message: message ?? response.statusText ?? "Unknown error",
        raw
    });
}

export function rejectFromThrown(error: any): Promise<never> {
    return Promise.reject({
        errorCode: 0,
        message: String(error?.message ?? error),
        raw: String(error?.stack ?? error)
    });
}
