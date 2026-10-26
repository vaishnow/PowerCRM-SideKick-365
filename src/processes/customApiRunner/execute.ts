import { formatId } from "../../utils/global/common";
import {
    buildHeaders,
    getApiUrl,
    rejectFromResponse,
    rejectFromThrown,
    type WriteSettings
} from "../../utils/global/dataverseRequest";
import { ApiBindingType, ApiParameterType, type InvokableMessage, type InvokableParameter } from "./types";

/** The parameter a bound custom API generates for its record; it travels in the URL, not the body. */
const BOUND_TARGET_PARAMETER = "Target";

/** Function parameters travel in the URL as aliases, so each value needs its OData literal form. */
function formatAliasValue(type: ApiParameterType, value: any): string {
    switch (type) {
        case ApiParameterType.String:
            return `'${String(value).replace(/'/g, "''")}'`;
        case ApiParameterType.Guid:
        case ApiParameterType.Boolean:
        case ApiParameterType.Integer:
        case ApiParameterType.Decimal:
        case ApiParameterType.Float:
        case ApiParameterType.Money:
        case ApiParameterType.Picklist:
            return String(value);
        case ApiParameterType.DateTime:
            return String(value);
        default:
            return JSON.stringify(value);
    }
}

function getOperationPath(message: InvokableMessage, setName: string | undefined, recordId: string) {
    // Bound operations use the fully qualified name appended to the entity set.
    if (message.bindingType === ApiBindingType.Entity) {
        if (!setName || !recordId) return null;
        return `${setName}(${formatId(recordId)})/Microsoft.Dynamics.CRM.${message.uniqueName}`;
    }
    if (message.bindingType === ApiBindingType.EntityCollection) {
        if (!setName) return null;
        return `${setName}/Microsoft.Dynamics.CRM.${message.uniqueName}`;
    }
    return message.uniqueName;
}

export function executeMessage(
    message: InvokableMessage,
    parameters: InvokableParameter[],
    values: { [uniqueName: string]: any },
    setName: string | undefined,
    recordId: string,
    settings: WriteSettings
): Promise<any> {
    const path = getOperationPath(message, setName, recordId);
    if (!path) {
        return rejectFromThrown(
            new Error(`${message.uniqueName} is bound to ${message.boundEntityLogicalName}; select a record first.`)
        );
    }

    // The bound record is already in the URL, so it must not be repeated in the payload.
    const payloadParameters = parameters.filter(
        (parameter) =>
            !(message.bindingType === ApiBindingType.Entity && parameter.uniqueName === BOUND_TARGET_PARAMETER) &&
            values[parameter.uniqueName] !== undefined &&
            values[parameter.uniqueName] !== null
    );

    if (message.isFunction) {
        const aliases = payloadParameters.map((parameter, index) => ({
            parameter,
            alias: `@p${index + 1}`
        }));
        const signature = aliases.map(({ parameter, alias }) => `${parameter.uniqueName}=${alias}`).join(",");
        const query = aliases
            .map(
                ({ parameter, alias }) =>
                    `${alias}=${encodeURIComponent(formatAliasValue(parameter.type, values[parameter.uniqueName]))}`
            )
            .join("&");

        const url = `${getApiUrl()}${path}(${signature})${query ? "?" + query : ""}`;
        return send(url, "GET", undefined, settings);
    }

    const body = Object.fromEntries(
        payloadParameters.map((parameter) => [parameter.uniqueName, values[parameter.uniqueName]])
    );
    return send(`${getApiUrl()}${path}`, "POST", JSON.stringify(body), settings);
}

function send(url: string, method: "GET" | "POST", body: string | undefined, settings: WriteSettings): Promise<any> {
    return fetch(url, { method, headers: buildHeaders(settings), body }).then(async (response) => {
        if (!response.ok) return rejectFromResponse(response);

        // Actions without response properties answer 204 No Content.
        const raw = await response.text();
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return raw;
        }
    }, rejectFromThrown);
}
