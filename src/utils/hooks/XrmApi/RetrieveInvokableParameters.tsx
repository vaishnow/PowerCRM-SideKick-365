import { useEffect, useState } from 'react'

import { getTypeFromClrParser, type InvokableMessage, type InvokableParameter } from '../../../processes/customApiRunner/types';
import { debugLog } from '../../global/common';

export function RetrieveInvokableParameters(message: InvokableMessage | null): [InvokableParameter[], boolean] {

    const [data, setData] = useState<InvokableParameter[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(false);

    useEffect(() => {
        debugLog("RetrieveInvokableParameters");
        if (!message) {
            setData([]);
            setIsFetching(false);
            return;
        }

        async function fetchCustomApiParameters(customApiId: string) {
            const result = await Xrm.WebApi.online.retrieveMultipleRecords("customapirequestparameter",
                `?$select=uniquename,name,displayname,type,isoptional,logicalentityname&$filter=_customapiid_value eq ${customApiId}&$orderby=uniquename asc`);

            return result.entities.map<InvokableParameter>(parameter => ({
                uniqueName: parameter["uniquename"],
                displayName: parameter["displayname"] || parameter["uniquename"],
                type: parameter["type"],
                isOptional: !!parameter["isoptional"],
                logicalEntityName: parameter["logicalentityname"] || undefined
            }));
        }

        /** Legacy actions: sdkmessage -> sdkmessagepair -> sdkmessagerequest -> sdkmessagerequestfield. */
        async function fetchSdkMessageParameters(sdkMessageId: string) {
            const pairs = await Xrm.WebApi.online.retrieveMultipleRecords("sdkmessagepair",
                `?$select=sdkmessagepairid&$filter=_sdkmessageid_value eq ${sdkMessageId}`);
            const pairId = pairs.entities.at(0)?.["sdkmessagepairid"];
            if (!pairId) return [];

            const requests = await Xrm.WebApi.online.retrieveMultipleRecords("sdkmessagerequest",
                `?$select=sdkmessagerequestid&$filter=_sdkmessagepairid_value eq ${pairId}`);
            const requestId = requests.entities.at(0)?.["sdkmessagerequestid"];
            if (!requestId) return [];

            const fields = await Xrm.WebApi.online.retrieveMultipleRecords("sdkmessagerequestfield",
                `?$select=name,clrparser,optional,position&$filter=_sdkmessagerequestid_value eq ${requestId}&$orderby=position asc`);

            return fields.entities.map<InvokableParameter>(field => ({
                uniqueName: field["name"],
                displayName: field["name"],
                type: getTypeFromClrParser(field["clrparser"]),
                isOptional: !!field["optional"]
            }));
        }

        async function fetchData() {
            if (!message) return;
            const parameters = message.source === "customapi"
                ? await fetchCustomApiParameters(message.id)
                : await fetchSdkMessageParameters(message.id);
            setData(parameters);
            setIsFetching(false);
        }
        setIsFetching(true);
        setData([]);
        fetchData();

    }, [message]);

    return [data, isFetching];
}
