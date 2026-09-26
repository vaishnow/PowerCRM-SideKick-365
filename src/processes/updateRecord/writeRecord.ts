import { formatId } from "../../utils/global/common";
import type { ActiveUser } from "../../utils/types/ActiveUser";

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

const API_BASE = "/api/data/v9.0/";

function buildHeaders(settings: WriteSettings): Record<string, string> {
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

async function rejectFromResponse(response: Response): Promise<never> {
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

function rejectFromThrown(error: any): Promise<never> {
    return Promise.reject({
        errorCode: 0,
        message: String(error?.message ?? error),
        raw: String(error?.stack ?? error)
    });
}

function getSetUrl(setName: string | undefined) {
    if (!setName) {
        return null;
    }
    return Xrm.Utility.getGlobalContext().getClientUrl() + API_BASE + setName;
}

export function writeCreate(
    entityName: string,
    setName: string | undefined,
    data: any,
    settings: WriteSettings
): Promise<{ id: string }> {
    if (settings.method === "legacy") {
        return Xrm.WebApi.online.createRecord(entityName, data) as any;
    }

    const url = getSetUrl(setName);
    if (!url) {
        return rejectFromThrown(new Error(`Entity set name not resolved yet for ${entityName}.`));
    }

    return fetch(url, {
        method: "POST",
        headers: buildHeaders(settings),
        body: JSON.stringify(data)
    }).then(async (response) => {
        if (!response.ok) return rejectFromResponse(response);

        const id = /\(([^)]+)\)\s*$/.exec(response.headers.get("OData-EntityId") ?? "")?.[1];
        if (!id) {
            return rejectFromThrown(new Error("Record created but its id could not be read from OData-EntityId."));
        }
        return { id: formatId(id) };
    }, rejectFromThrown);
}

export function writeUpdate(
    entityName: string,
    setName: string | undefined,
    recordId: string,
    data: any,
    settings: WriteSettings
): Promise<void> {
    if (settings.method === "legacy") {
        return Xrm.WebApi.online.updateRecord(entityName, recordId, data) as any;
    }

    const url = getSetUrl(setName);
    if (!url) {
        return rejectFromThrown(new Error(`Entity set name not resolved yet for ${entityName}.`));
    }

    return fetch(`${url}(${formatId(recordId)})`, {
        method: "PATCH",
        // "If-Match: *" keeps this an update: a bare PATCH is an upsert and would create the record.
        headers: { ...buildHeaders(settings), "If-Match": "*" },
        body: JSON.stringify(data)
    }).then(async (response) => {
        if (!response.ok) return rejectFromResponse(response);
    }, rejectFromThrown);
}
