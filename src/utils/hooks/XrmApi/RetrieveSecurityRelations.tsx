import { useState, useEffect } from 'react'
import { debugLog, debugError, formatId } from '../../global/common';

export interface SecurityNode {
    kind: "role" | "team" | "user"
    id: string
    name: string
    /** Roles only. Shared by every business-unit copy of the same logical role. */
    uniqueId?: string
}

export interface SecuritySection {
    title: string
    kind: SecurityNode["kind"]
    items: SecurityNode[]
}

const byName = (a: SecurityNode, b: SecurityNode) => (a.name ?? "").localeCompare(b.name ?? "");

function dedupe(items: SecurityNode[]) {
    return Array.from(new Map(items.map(item => [item.id, item])).values()).sort(byName);
}

function toUsers(records: any[]): SecurityNode[] {
    return (records ?? []).map(record => ({
        kind: "user" as const,
        id: record["systemuserid"],
        name: record["fullname"]
    }));
}

function toTeams(records: any[]): SecurityNode[] {
    return (records ?? []).map(record => ({
        kind: "team" as const,
        id: record["teamid"],
        name: record["name"]
    }));
}

function toRoles(records: any[]): SecurityNode[] {
    return (records ?? []).map(record => ({
        kind: "role" as const,
        id: record["roleid"],
        name: record["name"],
        uniqueId: record["roleidunique"]
    }));
}

/**
 * Every security role is replicated once per business unit: roleid is the per-BU record,
 * roleidunique is shared by all copies. Expanding one roleid only sees that BU's assignments.
 */
async function retrieveRoleSiblingIds(node: SecurityNode, allBusinessUnits: boolean) {
    if (!allBusinessUnits || !node.uniqueId) return [node.id];

    const siblings = await Xrm.WebApi.online.retrieveMultipleRecords("role",
        `?$select=roleid&$filter=roleidunique eq ${formatId(node.uniqueId)}`);

    const ids = siblings.entities.map((role: any) => role["roleid"]);
    return ids.length > 0 ? ids : [node.id];
}

async function retrieveSections(node: SecurityNode, allBusinessUnits: boolean): Promise<SecuritySection[]> {
    switch (node.kind) {
        case "role": {
            // shortcut: one request per business unit. A lambda $filter (systemuserroles_association/any(...))
            // would collapse this to one, but N:N lambda support is unconfirmed - upgrade once probed.
            const roleIds = await retrieveRoleSiblingIds(node, allBusinessUnits);

            const roles = await Promise.all(roleIds.map((roleId: string) =>
                Xrm.WebApi.online.retrieveRecord("role", formatId(roleId),
                    "?$select=name&$expand=systemuserroles_association($select=systemuserid,fullname)," +
                    "teamroles_association($select=teamid,name)")));

            return [
                { title: "Users", kind: "user", items: dedupe(roles.flatMap(role => toUsers(role["systemuserroles_association"]))) },
                { title: "Teams", kind: "team", items: dedupe(roles.flatMap(role => toTeams(role["teamroles_association"]))) }
            ];
        }

        case "team": {
            const team = await Xrm.WebApi.online.retrieveRecord("team", formatId(node.id),
                "?$select=name&$expand=teammembership_association($select=systemuserid,fullname)," +
                "teamroles_association($select=roleid,name,roleidunique)");

            return [
                { title: "Members", kind: "user", items: dedupe(toUsers(team["teammembership_association"])) },
                { title: "Roles", kind: "role", items: dedupe(toRoles(team["teamroles_association"])) }
            ];
        }

        case "user": {
            const user = await Xrm.WebApi.online.retrieveRecord("systemuser", formatId(node.id),
                "?$select=fullname&$expand=systemuserroles_association($select=roleid,name,roleidunique)," +
                "teammembership_association($select=teamid,name)");

            return [
                { title: "Roles", kind: "role", items: dedupe(toRoles(user["systemuserroles_association"])) },
                { title: "Teams", kind: "team", items: dedupe(toTeams(user["teammembership_association"])) }
            ];
        }
    }
}

export function RetrieveSecurityRelations(
    node: SecurityNode | null,
    allBusinessUnits: boolean
): [SecuritySection[], boolean, string | null] {

    const [data, setData] = useState<SecuritySection[]>([]);
    const [isFetching, setFetching] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        debugLog("RetrieveSecurityRelations");

        async function fetchData() {
            if (!node) {
                setFetching(false);
                return;
            }

            try {
                setData(await retrieveSections(node, allBusinessUnits));
            }
            catch (error: any) {
                debugError("RetrieveSecurityRelations", error);
                setError(error?.message ?? "Failed to retrieve security relations.");
            }

            setFetching(false);
        }

        setData([]);
        setError(null);
        setFetching(!!node);
        fetchData();

    }, [node?.kind, node?.id, node?.uniqueId, allBusinessUnits]);

    return [data, isFetching, error];
}
