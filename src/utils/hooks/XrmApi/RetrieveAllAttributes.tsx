import { useState, useEffect } from 'react'
import { debugLog, formatId, getWebApiBaseUrl } from '../../global/common';

export function RetrieveAllAttributes(entityname: string, recordid: string | undefined, includeAnnotations: boolean = false): [{ [key: string]: any }, boolean] {

    const [data, setData] = useState<{ [key: string]: any }>({});
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const _recordid = recordid;
    const _entityname = entityname;

    useEffect(() => {
        debugLog("RetrieveAllAttributes");
        if (!_entityname || !_recordid) {
            setData({});
            setIsFetching(false);
            return
        }
        async function retrieveWithAnnotations(entityname: string, recordid: string) {
            const { EntitySetName } = await Xrm.Utility.getEntityMetadata(entityname);
            const response = await fetch(`${getWebApiBaseUrl()}${EntitySetName}(${formatId(recordid)})`, {
                headers: {
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0",
                    Accept: "application/json",
                    Prefer: 'odata.include-annotations="*"'
                }
            });
            return response.json();
        }
        async function fetchData() {
            if (!_entityname || !_recordid) return
            const result = includeAnnotations
                ? await retrieveWithAnnotations(_entityname, _recordid)
                : await Xrm.WebApi.online.retrieveRecord(_entityname, _recordid)
            delete result["@odata.context"]
            delete result["@odata.etag"]
            setData(result);
            setIsFetching(false);
        }
        setIsFetching(true);
        setData({});
        fetchData();

    }, [_entityname, _recordid, includeAnnotations]);

    return [data, isFetching];
}