import { useCallback, useEffect, useState } from "react";

import { debugLog } from "../../global/common";
import { type PluginStepRow } from "../../types/WorkflowExplorer";

const SELECT =
    "sdkmessageprocessingstepid,name,stage,mode,rank,statecode,statuscode,filteringattributes,_eventhandler_value,_sdkmessageid_value,_impersonatinguserid_value,iscustomizable";

export function RetrievePluginSteps(entityname: string): [PluginStepRow[], boolean, () => void] {
    const [data, setData] = useState<PluginStepRow[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [launchFlag, setLaunchFlag] = useState<boolean>(false);

    const refresh = useCallback(() => {
        setLaunchFlag((prev) => !prev);
    }, []);

    const _entityname = entityname;

    useEffect(() => {
        debugLog("RetrievePluginSteps");
        setData([]);
        if (!_entityname) {
            setIsFetching(false);
            return;
        }

        async function fetchData() {
            const result = await Xrm.WebApi.online.retrieveMultipleRecords(
                "sdkmessageprocessingstep",
                `?$select=${SELECT}&$expand=sdkmessagefilterid($select=primaryobjecttypecode)&$filter=sdkmessagefilterid/primaryobjecttypecode eq '${_entityname}'&$orderby=name asc`
            );
            setData(result.entities as PluginStepRow[]);
            setIsFetching(false);
        }

        setIsFetching(true);
        fetchData();
    }, [_entityname, launchFlag]);

    return [data, isFetching, refresh];
}
