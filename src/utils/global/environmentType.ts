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
    version: string;
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
            version: detail?.OrganizationVersion ?? globalContext.getVersion()
        };
    } catch (error) {
        debugError("retrieveEnvironment", error);

        return {
            type: (globalContext.organizationSettings as any).isTrialOrganization
                ? EnvironmentType.Trial
                : EnvironmentType.Unknown,
            friendlyName: globalContext.organizationSettings.uniqueName,
            version: globalContext.getVersion()
        };
    }
}

export const STORAGE_EnvironmentTheme = "environmentTheme";
export type TYPE_EnvironmentTheme = {
    enabled: boolean;
    tintPanel: boolean;
    pageBorder: boolean;
    showLabel: boolean;
    colors: { [key in EnvironmentType]: string };
};
export const defaultEnvironmentTheme: TYPE_EnvironmentTheme = {
    enabled: true,
    tintPanel: true,
    pageBorder: false,
    showLabel: true,
    colors: {
        [EnvironmentType.Production]: "#c62828",
        [EnvironmentType.Sandbox]: "#ef6c00",
        [EnvironmentType.Trial]: "#6a1b9a",
        [EnvironmentType.Developer]: "#1565c0",
        [EnvironmentType.Default]: "#616161",
        [EnvironmentType.Unknown]: "#c62828"
    }
};
