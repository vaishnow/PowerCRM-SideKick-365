import { useCallback, useEffect, useState } from "react";

import { debugLog } from "../../global/common";
import { type AuditRow } from "../../types/AuditHistory";

export const AUDIT_PAGE_CAP = 50;

const FORMATTED_SUFFIX = "@OData.Community.Display.V1.FormattedValue";

const SELECT =
    "auditid,createdon,action,operation,objecttypecode,attributemask,changedata,useradditionalinfo,transactionid,_userid_value,_callinguserid_value";

type ChangedAttribute = {
    logicalName: string;
    oldValue?: string;
    newValue?: string;
    /** Resolved labels for choices and lookups: absent on plain text columns. */
    oldName?: string;
    newName?: string;
};

function displayValue(entity: any, key: string): string {
    const value = entity?.[key + FORMATTED_SUFFIX] ?? entity?.[key];
    return value === undefined || value === null ? "" : String(value);
}

/**
 * changedata holds the whole change set of an audit record as JSON, labels included, so no
 * RetrieveAuditDetails call per record is needed. It is absent from the documented Web API audit
 * type and rejected by some environments, hence the guard rather than a bare JSON.parse.
 */
function parseChangedAttributes(changedata: string | undefined): ChangedAttribute[] {
    if (!changedata) {
        return [];
    }
    try {
        return JSON.parse(changedata)?.changedAttributes ?? [];
    } catch {
        debugLog("RetrieveAuditHistory: unparsable changedata", changedata);
        return [];
    }
}

export function RetrieveAuditHistory(
    entityname: string | undefined,
    recordid: string | undefined
): [AuditRow[], boolean, string | null, () => void] {
    const [data, setData] = useState<AuditRow[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [launchFlag, setLaunchFlag] = useState<boolean>(false);

    const refresh = useCallback(() => {
        setLaunchFlag((prev) => !prev);
    }, []);

    const _entityname = entityname;
    const _recordid = recordid;

    useEffect(() => {
        debugLog("RetrieveAuditHistory");
        setData([]);
        setError(null);
        if (!_entityname || !_recordid) {
            setIsFetching(false);
            return;
        }

        async function fetchData() {
            try {
                // A retrieve on audit is rejected without exactly one objecttypecode condition
                // at the top level of the filter.
                const result = await Xrm.WebApi.online.retrieveMultipleRecords(
                    "audit",
                    `?$select=${SELECT}&$filter=objecttypecode eq '${_entityname}' and _objectid_value eq ${_recordid}&$orderby=createdon desc&$top=${AUDIT_PAGE_CAP}`
                );

                setData(
                    result.entities.flatMap((audit: any) => {
                        // Event level: repeated on every attribute row this audit record fans out to.
                        const event = {
                            date: new Date(audit.createdon),
                            dateFormatted: audit[`createdon${FORMATTED_SUFFIX}`] ?? audit.createdon,
                            user: displayValue(audit, "_userid_value"),
                            userId: audit._userid_value ?? "",
                            action: displayValue(audit, "action"),
                            auditid: audit.auditid,
                            operation: displayValue(audit, "operation"),
                            objectTypeCode: displayValue(audit, "objecttypecode"),
                            attributeMask: displayValue(audit, "attributemask"),
                            changeData: displayValue(audit, "changedata"),
                            transactionId: displayValue(audit, "transactionid"),
                            callingUser: displayValue(audit, "_callinguserid_value"),
                            callingUserId: audit._callinguserid_value ?? "",
                            userAdditionalInfo: displayValue(audit, "useradditionalinfo")
                        };

                        const changedAttributes = parseChangedAttributes(audit.changedata);

                        // Shares, associations and user access change no attribute: keep the event
                        // visible rather than dropping it from the history.
                        if (!changedAttributes.length) {
                            return [{ ...event, id: audit.auditid, attribute: "", oldValue: "", newValue: "" }];
                        }

                        return changedAttributes.map((changed) => ({
                            ...event,
                            id: `${audit.auditid}:${changed.logicalName}`,
                            attribute: changed.logicalName,
                            // oldName and newName carry the label of a choice or lookup; plain
                            // columns only have the raw value.
                            oldValue: changed.oldName ?? changed.oldValue ?? "",
                            newValue: changed.newName ?? changed.newValue ?? ""
                        }));
                    })
                );
            } catch (exception: any) {
                // Needs the prvReadAuditSummary privilege: without it this is a 403.
                setError(exception?.message ?? "The audit history could not be retrieved.");
            }
            setIsFetching(false);
        }

        setIsFetching(true);
        fetchData();
    }, [_entityname, _recordid, launchFlag]);

    return [data, isFetching, error, refresh];
}
