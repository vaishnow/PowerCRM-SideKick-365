import { useState, useEffect } from 'react'
import { debugLog, formatId } from '../../global/common';
import type { ActiveUser } from '../../types/ActiveUser';
import { ConvertToActiveUserObject } from './RetrieveActiveUsersWithSecurityRoles';

export interface UserWithSecurity {
    record: any,
    user: ActiveUser,
    teams: { teamid: string, name: string }[]
}

export function RetrieveUserWithRolesAndTeams(systemuserid: string | null): [UserWithSecurity | null, boolean] {

    const [data, setData] = useState<UserWithSecurity | null>(null);
    const [isFetching, setFetching] = useState<boolean>(true);

    useEffect(() => {
        debugLog("RetrieveUserWithRolesAndTeams");

        async function fetchData() {
            if (!systemuserid) {
                setFetching(false);
                return;
            }

            const record = await Xrm.WebApi.online.retrieveRecord("systemuser", formatId(systemuserid),
                "?$select=systemuserid,fullname,internalemailaddress,domainname,azureactivedirectoryobjectid," +
                "entityimage_url,accessmode,applicationid,isdisabled,islicensed,_businessunitid_value" +
                "&$expand=systemuserroles_association($select=roleid,name,roleidunique)," +
                "teammembership_association($select=teamid,name)");

            const user = await ConvertToActiveUserObject(record);

            const teams = (record.teammembership_association as any[])?.map((team: any) => {
                return {
                    teamid: team["teamid"],
                    name: team["name"],
                }
            }) ?? [];

            setData({ record, user, teams });
            setFetching(false);
        }

        setData(null);
        setFetching(true);
        fetchData();

    }, [systemuserid]);

    return [data, isFetching];
}
