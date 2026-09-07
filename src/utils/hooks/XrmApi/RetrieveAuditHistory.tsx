import { useCallback, useEffect, useState } from "react";

import { debugLog } from "../../global/common";
import { type AuditRow } from "../../types/AuditHistory";

export const AUDIT_PAGE_CAP = 50;

const FORMATTED_SUFFIX = "@OData.Community.Display.V1.FormattedValue";

function displayValue(entity: any, key: string): string {
    const value = entity?.[key + FORMATTED_SUFFIX] ?? entity?.[key];
    return value === undefined || value === null ? "" : String(value);
}

/**
 * The audit `changedata` column holds old values only, tilde delimited and truncated at 2000
 * characters, so the new values can only come from RetrieveAuditDetails. Xrm.WebApi cannot set the
 * Prefer header the formatted values need, hence the raw fetch.
 */
async function retrieveAuditDetail(auditid: string) {
    const response = await fetch(
        Xrm.Utility.getGlobalContext().getClientUrl() +
            "/api/data/v9.0/audits(" +
            auditid +
            ")/Microsoft.Dynamics.CRM.RetrieveAuditDetails",
        {
            method: "GET",
            headers: {
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                "Content-Type": "application/json; charset=utf-8",
                Accept: "application/json",
                Prefer: 'odata.include-annotations="*"'
            }
        }
    );

    if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(failure?.error?.message ?? `RetrieveAuditDetails failed (${response.status}).`);
    }

    const results = await response.json();
    return results.AuditDetail;
}

export function RetrieveAuditHistory(recordid: string | undefined): [AuditRow[], boolean, string | null, () => void] {
    const [data, setData] = useState<AuditRow[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [launchFlag, setLaunchFlag] = useState<boolean>(false);

    const refresh = useCallback(() => {
        setLaunchFlag((prev) => !prev);
    }, []);

    const _recordid = recordid;

    useEffect(() => {
        debugLog("RetrieveAuditHistory");
        setData([]);
        setError(null);
        if (!_recordid) {
            setIsFetching(false);
            return;
        }

        async function fetchData() {
            try {
                const result = await Xrm.WebApi.online.retrieveMultipleRecords(
                    "audit",
                    `?$select=auditid,createdon,action,_userid_value&$filter=_objectid_value eq ${_recordid}&$orderby=createdon desc&$top=${AUDIT_PAGE_CAP}`
                );

                const details = await Promise.all(
                    result.entities.map((audit: any) => retrieveAuditDetail(audit.auditid))
                );

                setData(
                    result.entities.flatMap((audit: any, index: number) => {
                        const detail = details[index];
                        const oldValue = detail?.OldValue ?? {};
                        const newValue = detail?.NewValue ?? {};

                        // OldValue and NewValue are partial records of the audited entity: the
                        // changed attributes are their keys, minus the annotations and the primary id.
                        const attributes = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].filter(
                            (key) =>
                                !key.includes("@") &&
                                String(oldValue[key]).toLowerCase() !== _recordid &&
                                String(newValue[key]).toLowerCase() !== _recordid
                        );

                        const event = {
                            date: new Date(audit.createdon),
                            dateFormatted: audit[`createdon${FORMATTED_SUFFIX}`] ?? audit.createdon,
                            user: displayValue(audit, "_userid_value"),
                            action: displayValue(audit, "action")
                        };

                        // Deletes, assigns and shares carry no attribute detail: keep the event visible.
                        if (!attributes.length) {
                            return [{ ...event, id: audit.auditid, attribute: "", oldValue: "", newValue: "" }];
                        }

                        return attributes.map((attribute) => ({
                            ...event,
                            id: `${audit.auditid}:${attribute}`,
                            attribute,
                            oldValue: displayValue(oldValue, attribute),
                            newValue: displayValue(newValue, attribute)
                        }));
                    })
                );
            } catch (exception: any) {
                // Reading audit needs the View Audit History privilege: without it this is a 403.
                setError(exception?.message ?? "The audit history could not be retrieved.");
            }
            setIsFetching(false);
        }

        setIsFetching(true);
        fetchData();
    }, [_recordid, launchFlag]);

    return [data, isFetching, error, refresh];
}
