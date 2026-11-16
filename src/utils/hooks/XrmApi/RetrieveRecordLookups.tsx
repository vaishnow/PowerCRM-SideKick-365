import { useEffect, useState } from "react";

import { debugLog } from "../../global/common";

export type RecordLookup = {
    /** The `_x_value` column the lookup sits in, without the decoration. */
    attribute: string;
    entityName: string;
    recordId: string;
    name: string;
};

const LOOKUP_VALUE = /^_(.+)_value$/;
const FORMATTED_SUFFIX = "@OData.Community.Display.V1.FormattedValue";
const LOOKUP_ENTITY_SUFFIX = "@Microsoft.Dynamics.CRM.lookuplogicalname";

/**
 * Every populated lookup on one record: target table and display name included. A raw fetch
 * because lookuplogicalname only comes back under an explicit Prefer header, and it is the only
 * place the target of a polymorphic lookup (customerid, ownerid) is stated per record - attribute
 * metadata just lists every possible target.
 */
export function RetrieveRecordLookups(
    entitysetname: string | undefined,
    recordid: string | undefined
): [RecordLookup[], boolean] {
    const [data, setData] = useState<RecordLookup[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    const _entitysetname = entitysetname;
    const _recordid = recordid;

    useEffect(() => {
        debugLog("RetrieveRecordLookups");
        setData([]);
        if (!_entitysetname || !_recordid) {
            setIsFetching(false);
            return;
        }

        async function fetchData() {
            const response = await fetch(
                `${Xrm.Utility.getGlobalContext().getClientUrl()}/api/data/v9.0/${_entitysetname}(${_recordid})`,
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
                // Only costs the shortcut menu, so the tool stays usable without it.
                setData([]);
                setIsFetching(false);
                return;
            }

            const record = await response.json();

            setData(
                Object.keys(record)
                    .map((key) => {
                        const attribute = key.match(LOOKUP_VALUE)?.[1];
                        const recordId = record[key];
                        // No lookuplogicalname means no table to open the record in.
                        const entityName = record[key + LOOKUP_ENTITY_SUFFIX];
                        if (!attribute || !recordId || !entityName) {
                            return null;
                        }
                        return {
                            attribute,
                            entityName,
                            recordId,
                            name: record[key + FORMATTED_SUFFIX] ?? recordId
                        };
                    })
                    .filter((lookup): lookup is RecordLookup => !!lookup)
                    .sort((a, b) => a.attribute.localeCompare(b.attribute))
            );
            setIsFetching(false);
        }

        setIsFetching(true);
        fetchData();
    }, [_entitysetname, _recordid]);

    return [data, isFetching];
}
