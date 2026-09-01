import { useCallback, useState } from "react";

import { debugLog } from "../../global/common";

export type FetchXmlError = {
    message: string;
    errorCode?: number;
    raw?: string;
};

export type FetchXmlExecution = {
    execute: (entityname: string, fetchXML: string) => void;
    rows: any[];
    isFetching: boolean;
    error: FetchXmlError | null;
    durationMs: number | null;
};

/**
 * Button-triggered counterpart to RetrieveRecordsByFetchXML: a tester needs an explicit trigger,
 * an error it can display, and the request duration. Query strings are built the same way, the
 * Web API encodes them downstream.
 */
export function ExecuteFetchXML(): FetchXmlExecution {
    const [rows, setRows] = useState<any[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [error, setError] = useState<FetchXmlError | null>(null);
    const [durationMs, setDurationMs] = useState<number | null>(null);

    const execute = useCallback(async (entityname: string, fetchXML: string) => {
        debugLog("ExecuteFetchXML", entityname);

        setIsFetching(true);
        setError(null);
        setRows([]);
        setDurationMs(null);

        const start = performance.now();
        try {
            const results = await Xrm.WebApi.retrieveMultipleRecords(entityname, "?fetchXml=" + fetchXML);
            setDurationMs(Math.round(performance.now() - start));
            setRows(results.entities);
        } catch (e: any) {
            setDurationMs(Math.round(performance.now() - start));
            setError({ message: e?.message ?? String(e), errorCode: e?.errorCode, raw: e?.raw });
        }
        setIsFetching(false);
    }, []);

    return { execute, rows, isFetching, error, durationMs };
}
