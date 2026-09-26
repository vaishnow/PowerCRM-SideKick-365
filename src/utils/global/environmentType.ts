import { debugError } from "./common";

export enum EnvironmentType {
    Production = "Production",
    Sandbox = "Sandbox",
    Trial = "Trial",
    Developer = "Developer",
    Default = "Default",
    Unknown = "Unknown"
}

export type EnvironmentInfo = {
    type: EnvironmentType;
    friendlyName: string;
    uniqueName: string;
    version: string;
    url: string;
};

const organizationTypeMap: { [organizationType: string]: EnvironmentType } = {
    Customer: EnvironmentType.Production,
    Secondary: EnvironmentType.Production,
    CustomerTest: EnvironmentType.Sandbox,
    CustomerFreeTest: EnvironmentType.Sandbox,
    Trial: EnvironmentType.Trial,
    TestDrive: EnvironmentType.Trial,
    EmailTrial: EnvironmentType.Trial,
    Developer: EnvironmentType.Developer,
    Default: EnvironmentType.Default
};

const fetchOptions = {
    method: "GET",
    headers: {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json"
    }
};

/**
 * RetrieveCurrentOrganization is only available from v9.2, unlike the v9.0 endpoint used elsewhere.
 * On failure the environment is reported as Unknown, which is coloured like Production on purpose.
 */
export async function retrieveEnvironment(): Promise<EnvironmentInfo> {
    const globalContext = Xrm.Utility.getGlobalContext();

    try {
        const response = await fetch(
            globalContext.getClientUrl() +
                "/api/data/v9.2/RetrieveCurrentOrganization(AccessType=@p1)?@p1=Microsoft.Dynamics.CRM.EndpointAccessType'Default'",
            fetchOptions
        );
        if (!response.ok) {
            throw new Error(`RetrieveCurrentOrganization returned ${response.status}`);
        }

        const detail = (await response.json())?.Detail;

        return {
            type: organizationTypeMap[detail?.OrganizationType] ?? EnvironmentType.Unknown,
            friendlyName: detail?.FriendlyName ?? globalContext.organizationSettings.uniqueName,
            uniqueName: detail?.UniqueName ?? globalContext.organizationSettings.uniqueName,
            version: detail?.OrganizationVersion ?? globalContext.getVersion(),
            url: globalContext.getClientUrl()
        };
    } catch (error) {
        debugError("retrieveEnvironment", error);

        return {
            type: (globalContext.organizationSettings as any).isTrialOrganization
                ? EnvironmentType.Trial
                : EnvironmentType.Unknown,
            friendlyName: globalContext.organizationSettings.uniqueName,
            uniqueName: globalContext.organizationSettings.uniqueName,
            version: globalContext.getVersion(),
            url: globalContext.getClientUrl()
        };
    }
}

export const STORAGE_EnvironmentTheme = "environmentTheme";

export type EnvironmentStyle = {
    color: string;
    label: string;
};
/** Dataverse cannot distinguish a staging org from any other sandbox, so naming conventions are matched instead. */
export type EnvironmentRule = EnvironmentStyle & {
    id: string;
    match: string;
};

export type TYPE_EnvironmentTheme = {
    enabled: boolean;
    tintPanel: boolean;
    pageBorder: boolean;
    showLabel: boolean;
    types: { [key in EnvironmentType]: EnvironmentStyle };
    rules: EnvironmentRule[];
};

export const defaultEnvironmentTheme: TYPE_EnvironmentTheme = {
    enabled: true,
    tintPanel: true,
    pageBorder: false,
    showLabel: true,
    types: {
        [EnvironmentType.Production]: { color: "#c62828", label: "PROD" },
        [EnvironmentType.Sandbox]: { color: "#1565c0", label: "SANDBOX" },
        [EnvironmentType.Trial]: { color: "#6a1b9a", label: "TRIAL" },
        [EnvironmentType.Developer]: { color: "#00695c", label: "DEV" },
        [EnvironmentType.Default]: { color: "#616161", label: "DEFAULT" },
        [EnvironmentType.Unknown]: { color: "#c62828", label: "UNKNOWN" }
    },
    // "stg" is not contained in "staging", so both are seeded.
    rules: [
        { id: "staging-stg", match: "stg", color: "#546e7a", label: "STAGING" },
        { id: "staging-staging", match: "staging", color: "#546e7a", label: "STAGING" }
    ]
};

/**
 * A matching rule wins over the detected type. The environment is Unknown while the detection
 * request is still in flight, which is coloured like Production on purpose.
 */
export function resolveEnvironmentStyle(
    theme: TYPE_EnvironmentTheme,
    environment: EnvironmentInfo | null
): EnvironmentStyle | null {
    if (!theme.enabled) {
        return null;
    }

    if (environment) {
        const haystack = `${environment.friendlyName} ${environment.uniqueName} ${environment.url}`.toLowerCase();
        const matchedRule = theme.rules.find(
            (rule) => rule.match.trim() !== "" && haystack.includes(rule.match.trim().toLowerCase())
        );
        if (matchedRule) {
            return matchedRule;
        }
    }

    return theme.types[environment?.type ?? EnvironmentType.Unknown];
}
