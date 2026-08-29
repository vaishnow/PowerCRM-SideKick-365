import { useCallback, useEffect, useState } from "react";

import { parseCloudFlowTriggers } from "../../components/workflowExplorer/utils";
import { debugLog } from "../../global/common";
import { type CloudFlowRow } from "../../types/WorkflowExplorer";

const SELECT = "workflowid,name,statecode,statuscode,ismanaged,modifiedon,clientdata";

/**
 * Cloud flows (category 5) always store primaryentity 'none', so they cannot be filtered
 * on the entity server-side. The clientdata is narrowed with contains(), then parsed to
 * confirm the flow really has a Dataverse trigger on entitySetName.
 * Fetching is deferred until enabled, because clientdata runs up to 1MB per row.
 */
export function RetrieveCloudFlows(
    entitySetName: string | undefined,
    enabled: boolean
): [CloudFlowRow[], boolean, () => void] {
    const [data, setData] = useState<CloudFlowRow[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);
    const [launchFlag, setLaunchFlag] = useState<boolean>(false);

    const refresh = useCallback(() => {
        setLaunchFlag((prev) => !prev);
    }, []);

    const _entitySetName = entitySetName;

    useEffect(() => {
        debugLog("RetrieveCloudFlows");
        setData([]);
        if (!_entitySetName || !enabled) {
            setIsFetching(false);
            return;
        }

        async function fetchData() {
            const setName = _entitySetName!;
            const result = await Xrm.WebApi.online.retrieveMultipleRecords(
                "workflow",
                `?$select=${SELECT}&$filter=category eq 5 and type eq 1 and contains(clientdata,'${setName}')&$orderby=name asc`
            );

            const flows = result.entities.reduce<CloudFlowRow[]>((rows, entity) => {
                const { clientdata, ...flow } = entity;
                const triggers = parseCloudFlowTriggers(clientdata, setName);
                if (triggers.length) rows.push({ ...flow, triggers } as CloudFlowRow);
                return rows;
            }, []);

            setData(flows);
            setIsFetching(false);
        }

        setIsFetching(true);
        fetchData();
    }, [_entitySetName, enabled, launchFlag]);

    return [data, isFetching, refresh];
}
