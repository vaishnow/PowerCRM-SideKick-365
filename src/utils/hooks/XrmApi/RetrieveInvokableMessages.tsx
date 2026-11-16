import { useEffect, useState } from 'react'

import { ApiBindingType, type InvokableMessage } from '../../../processes/customApiRunner/types';
import { debugLog } from '../../global/common';

/**
 * Custom APIs plus the other custom SDK messages (legacy Actions).
 * A Custom API also owns an sdkmessage record, so those are filtered out of the second list.
 */
export function RetrieveInvokableMessages(): [InvokableMessage[], boolean] {

    const [data, setData] = useState<InvokableMessage[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        debugLog("RetrieveInvokableMessages");

        async function fetchData() {
            const [customApis, sdkMessages] = await Promise.all([
                Xrm.WebApi.online.retrieveMultipleRecords("customapi",
                    "?$select=customapiid,uniquename,name,displayname,bindingtype,boundentitylogicalname,isfunction&$orderby=uniquename asc"),
                Xrm.WebApi.online.retrieveMultipleRecords("sdkmessage",
                    "?$select=sdkmessageid,name&$filter=customizationlevel eq 1 and isprivate eq false&$orderby=name asc")
            ]);

            const apis: InvokableMessage[] = customApis.entities.map(api => ({
                id: api["customapiid"],
                uniqueName: api["uniquename"],
                displayName: api["displayname"] || api["name"] || api["uniquename"],
                source: "customapi",
                isFunction: !!api["isfunction"],
                bindingType: api["bindingtype"] ?? ApiBindingType.Global,
                boundEntityLogicalName: api["boundentitylogicalname"] || undefined
            }));

            const customApiNames = new Set(apis.map(a => a.uniqueName));
            const messages: InvokableMessage[] = sdkMessages.entities
                .filter(message => !customApiNames.has(message["name"]))
                .map(message => ({
                    id: message["sdkmessageid"],
                    uniqueName: message["name"],
                    displayName: message["name"],
                    source: "sdkmessage" as const,
                    isFunction: false,
                    bindingType: ApiBindingType.Global
                }));

            setData([...apis, ...messages]);
            setIsFetching(false);
        }
        setIsFetching(true);
        setData([]);
        fetchData();

    }, []);

    return [data, isFetching];
}
