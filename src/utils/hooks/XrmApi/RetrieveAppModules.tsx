import { useState, useEffect } from 'react'
import { debugLog, debugError } from '../../global/common';

export interface AppModule {
    appModuleId: string
    appModuleIdUnique: string
    name: string
}

export function RetrieveAppModules(): [AppModule[], boolean] {

    const [data, setData] = useState<AppModule[]>([]);
    const [isFetching, setFetching] = useState<boolean>(true);

    useEffect(() => {
        debugLog("RetrieveAppModules");

        async function fetchData() {
            try {
                const result = await Xrm.WebApi.online.retrieveMultipleRecords("appmodule",
                    "?$select=appmoduleid,appmoduleidunique,name&$orderby=name asc");

                setData(result.entities.map((appModule: any) => ({
                    appModuleId: appModule["appmoduleid"],
                    appModuleIdUnique: appModule["appmoduleidunique"],
                    name: appModule["name"]
                })));
            }
            catch (error) {
                debugError("RetrieveAppModules", error);
                setData([]);
            }

            setFetching(false);
        }

        setData([]);
        setFetching(true);
        fetchData();

    }, []);

    return [data, isFetching];
}
