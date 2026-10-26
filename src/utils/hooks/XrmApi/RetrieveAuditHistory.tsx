import { useCallback, useEffect, useState } from "react";

import { debugLog } from "../../global/common";
import { type AuditRow, type AuditSource } from "../../types/AuditHistory";

export const AUDIT_PAGE_SIZES = [25, 50, 100, 250];
export const AUDIT_PAGE_SIZE_DEFAULT = 50;

/** Dataverse pages the audit table with a cookie holding the page number. */
const skiptokenString = (pageNumber: number) =>
    "&$skiptoken=%3Ccookie%20pagenumber%3D%22" + pageNumber + "%22%20%2F%3E";

const FORMATTED_SUFFIX = "@OData.Community.Display.V1.FormattedValue";

const SELECT =
    "auditid,createdon,action,operation,objecttypecode,attributemask,changedata,useradditionalinfo,transactionid,_userid_value,_callinguserid_value";

const GUID_REGEX = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

/**
 * A lookup change carries its target table inside the value, as `entityname,guid`, which is the
 * only place the table is named: changedata has no separate target property. The guid is checked
 * rather than just split on the comma, so a plain text value like "Acme, Inc" stays plain text.
 */
function parseReference(value: string | null | undefined): {
    label: string;
    entityName: string;
    recordId: string;
} {
    if (!value) {
        return { label: "", entityName: "", recordId: "" };
    }

    const separator = value.indexOf(",");
    const candidate = value.slice(separator + 1);
    if (separator === -1 || !GUID_REGEX.test(candidate)) {
        return { label: value, entityName: "", recordId: "" };
    }

    return { label: candidate, entityName: value.slice(0, separator), recordId: candidate };
}

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

/**
 * Each source is its own request, as audit only takes one objecttypecode condition, and the rows
 * are merged newest first so a change on one record sits next to the changes it caused on another.
 * The page applies to every source alike.
 */
export function RetrieveAuditHistory(
    sources: AuditSource[],
    page: number,
    pageSize: number
): [AuditRow[], boolean, string | null, () => void, boolean] {
    const [data, setData] = useState<AuditRow[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState<boolean>(false);
    const [launchFlag, setLaunchFlag] = useState<boolean>(false);

    const refresh = useCallback(() => {
        setLaunchFlag((prev) => !prev);
    }, []);

    // The callers rebuild the array on every render: the effect follows its content instead.
    const _sourcesKey = sources.map((source) => `${source.entityName}|${source.recordId}`).join(",");
    const _page = page;
    const _pageSize = pageSize;

    useEffect(() => {
        debugLog("RetrieveAuditHistory");
        setData([]);
        setError(null);
        setHasMore(false);
        const _sources = _sourcesKey
            ? _sourcesKey.split(",").map((key) => {
                  const [entityName, recordId] = key.split("|");
                  return { entityName, recordId };
              })
            : [];
        if (!_sources.length) {
            setIsFetching(false);
            return;
        }

        async function fetchSource(_entityname: string, _recordid: string) {
            // A retrieve on audit is rejected without exactly one objecttypecode condition
            // at the top level of the filter.
            const result = await Xrm.WebApi.online.retrieveMultipleRecords(
                "audit",
                `?$select=${SELECT}&$filter=objecttypecode eq '${_entityname}' and _objectid_value eq ${_recordid}&$orderby=createdon desc` +
                    skiptokenString(_page + 1),
                _pageSize
            );

            return {
                hasMore: !!result.nextLink,
                rows: result.entities.flatMap((audit: any): AuditRow[] => {
                    // Event level: repeated on every attribute row this audit record fans out to.
                    const event = {
                        date: new Date(audit.createdon),
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
                        userAdditionalInfo: displayValue(audit, "useradditionalinfo"),
                        sourceEntityName: _entityname,
                        sourceRecordId: _recordid
                    };

                    const changedAttributes = parseChangedAttributes(audit.changedata);

                    // Shares, associations and user access change no attribute: keep the event
                    // visible rather than dropping it from the history.
                    if (!changedAttributes.length) {
                        return [
                            {
                                ...event,
                                id: audit.auditid,
                                attribute: "",
                                oldValue: "",
                                newValue: "",
                                oldEntity: "",
                                oldId: "",
                                newEntity: "",
                                newId: ""
                            }
                        ];
                    }

                    return changedAttributes.map((changed) => {
                        const oldReference = parseReference(changed.oldValue);
                        const newReference = parseReference(changed.newValue);

                        return {
                            ...event,
                            id: `${audit.auditid}:${changed.logicalName}`,
                            attribute: changed.logicalName,
                            // oldName and newName carry the label of a choice or lookup; a
                            // lookup without one falls back to its guid rather than the
                            // `entityname,guid` pair, which is not worth reading.
                            oldValue: changed.oldName ?? oldReference.label,
                            newValue: changed.newName ?? newReference.label,
                            oldEntity: oldReference.entityName,
                            oldId: oldReference.recordId,
                            newEntity: newReference.entityName,
                            newId: newReference.recordId
                        };
                    });
                })
            };
        }

        async function fetchData() {
            const results = await Promise.allSettled(
                _sources.map((source) => fetchSource(source.entityName, source.recordId))
            );

            const errors: string[] = [];
            const rows: AuditRow[] = [];
            let more = false;
            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    rows.push(...result.value.rows);
                    more ||= result.value.hasMore;
                } else {
                    // Needs the prvReadAuditSummary privilege: without it this is a 403.
                    errors.push(
                        `${_sources[index].entityName}: ${
                            result.reason?.message ?? "The audit history could not be retrieved."
                        }`
                    );
                }
            });

            // Attribute rows of one audit record share its date: the audit id tiebreak keeps them
            // together, and the sort is stable so their order inside the record is kept.
            rows.sort(
                (a, b) => b.date.getTime() - a.date.getTime() || a.auditid.localeCompare(b.auditid)
            );

            setData(rows);
            setHasMore(more);
            setError(errors.length ? errors.join(" - ") : null);
            setIsFetching(false);
        }

        setIsFetching(true);
        fetchData();
    }, [_sourcesKey, _page, _pageSize, launchFlag]);

    return [data, isFetching, error, refresh, hasMore];
}
