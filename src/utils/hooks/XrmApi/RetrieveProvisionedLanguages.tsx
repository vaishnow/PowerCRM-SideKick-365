import { useState, useEffect } from 'react'
import { debugLog } from '../../global/common';

export interface ProvisionedLanguage {
    localeid: number
    name: string
}

export function RetrieveProvisionedLanguages(): [ProvisionedLanguage[], boolean] {

    const [data, setData] = useState<ProvisionedLanguage[]>([]);
    const [isFetching, setFetching] = useState<boolean>(true);

    useEffect(() => {
        debugLog("RetrieveProvisionedLanguages");

        async function fetchData() {
            const response = await fetch(Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.0/RetrieveProvisionedLanguages", {
                method: "GET",
                headers: {
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0",
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                setData([]);
                setFetching(false);
                return;
            }

            const results = await response.json();
            const lcids: number[] = results.RetrieveProvisionedLanguages ?? [];

            // languagelocale is not readable in every org, so fall back to the raw LCIDs as labels.
            try {
                const locales = await Xrm.WebApi.online.retrieveMultipleRecords("languagelocale",
                    "?$select=localeid,name&$filter=" + lcids.map(lcid => `localeid eq ${lcid}`).join(" or ") + "&$orderby=name asc");

                const nameByLocaleId = new Map<number, string>(
                    locales.entities.map((locale: any) => [locale["localeid"], locale["name"]])
                );
                setData(lcids.map(lcid => ({ localeid: lcid, name: nameByLocaleId.get(lcid) ?? String(lcid) })));
            }
            catch {
                setData(lcids.map(lcid => ({ localeid: lcid, name: String(lcid) })));
            }

            setFetching(false);
        }

        setData([]);
        setFetching(true);
        fetchData();

    }, []);

    return [data, isFetching];
}
