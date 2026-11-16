import { useState, useEffect } from 'react'
import { debugLog, formatId } from '../../global/common';

export interface UserPrivilege {
    privilegeId: string
    name: string
    depth: string
}

export const PRIVILEGE_DEPTH_ORDER = ["Basic", "Local", "Deep", "Global"];

export function RetrieveUserPrivileges(systemuserid: string | null): [UserPrivilege[], boolean, string | null] {

    const [data, setData] = useState<UserPrivilege[]>([]);
    const [isFetching, setFetching] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        debugLog("RetrieveUserPrivileges");

        async function fetchData() {
            if (!systemuserid) {
                setFetching(false);
                return;
            }

            const response = await fetch(Xrm.Utility.getGlobalContext().getClientUrl() + "/api/data/v9.0/systemusers(" + formatId(systemuserid) + ")/Microsoft.Dynamics.CRM.RetrieveUserPrivileges", {
                method: "GET",
                headers: {
                    "OData-MaxVersion": "4.0",
                    "OData-Version": "4.0",
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json"
                }
            });

            if (!response.ok) {
                const failure = await response.json().catch(() => null);
                setError(failure?.error?.message ?? `RetrieveUserPrivileges failed (${response.status}).`);
                setFetching(false);
                return;
            }

            const results = await response.json();

            const highestByPrivilege = new Map<string, UserPrivilege>();
            (results.RolePrivileges as any[])?.forEach((rolePrivilege: any) => {
                const privilege: UserPrivilege = {
                    privilegeId: rolePrivilege["PrivilegeId"],
                    name: rolePrivilege["PrivilegeName"],
                    depth: rolePrivilege["Depth"],
                };
                const existing = highestByPrivilege.get(privilege.privilegeId);
                if (!existing || PRIVILEGE_DEPTH_ORDER.indexOf(privilege.depth) > PRIVILEGE_DEPTH_ORDER.indexOf(existing.depth)) {
                    highestByPrivilege.set(privilege.privilegeId, privilege);
                }
            });

            const privileges = Array.from(highestByPrivilege.values());

            // RetrieveUserPrivileges does not always populate PrivilegeName, so fill the gaps from the privilege table.
            if (privileges.some((privilege) => !privilege.name)) {
                const names = await Xrm.WebApi.online.retrieveMultipleRecords("privilege", "?$select=privilegeid,name");
                const nameById = new Map<string, string>(
                    names.entities.map((privilege: any) => [privilege["privilegeid"], privilege["name"]])
                );
                privileges.forEach((privilege) => {
                    privilege.name = privilege.name || nameById.get(privilege.privilegeId) || privilege.privilegeId;
                });
            }

            setData(privileges.sort((a, b) => a.name.localeCompare(b.name)));
            setFetching(false);
        }

        setData([]);
        setError(null);
        setFetching(true);
        fetchData();

    }, [systemuserid]);

    return [data, isFetching, error];
}
