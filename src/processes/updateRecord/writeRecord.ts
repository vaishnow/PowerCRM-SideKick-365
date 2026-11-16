import { formatId } from "../../utils/global/common";
import {
    buildHeaders,
    getApiUrl,
    rejectFromResponse,
    rejectFromThrown,
    type WriteSettings
} from "../../utils/global/dataverseRequest";

export { defaultWriteSettings, type WriteSettings } from "../../utils/global/dataverseRequest";

function getSetUrl(setName: string | undefined) {
    if (!setName) {
        return null;
    }
    return getApiUrl() + setName;
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

export function writeDelete(
    entityName: string,
    setName: string | undefined,
    recordId: string,
    settings: WriteSettings
): Promise<void> {
    if (settings.method === "legacy") {
        return Xrm.WebApi.online.deleteRecord(entityName, recordId) as any;
    }

    const url = getSetUrl(setName);
    if (!url) {
        return rejectFromThrown(new Error(`Entity set name not resolved yet for ${entityName}.`));
    }

    return fetch(`${url}(${formatId(recordId)})`, {
        method: "DELETE",
        headers: buildHeaders(settings)
    }).then(async (response) => {
        if (!response.ok) return rejectFromResponse(response);
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
