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

export enum BarStyle {
    None = "None",
    Tint = "Tint",
    Solid = "Solid"
}

export type EnvironmentStyle = {
    color: string;
    label: string;
    barStyle: BarStyle;
    /** 0 means no border. Capped at 10 by the editor. */
    borderWidth: number;
    showLabel: boolean;
};

/** An override only stores what was changed for that one environment, so every field is optional. */
export type EnvironmentOverride = Partial<EnvironmentStyle>;

export type TYPE_EnvironmentTheme = {
    enabled: boolean;
    /** Keyed by organization url: stable, and the thing you can read straight off the address bar. */
    overrides: { [organizationUrl: string]: EnvironmentOverride };
};

export const defaultEnvironmentTheme: TYPE_EnvironmentTheme = {
    enabled: true,
    overrides: {}
};

const environmentTypeStyles: { [key in EnvironmentType]: Pick<EnvironmentStyle, "color" | "label"> } = {
    [EnvironmentType.Production]: { color: "#c62828", label: "PROD" },
    [EnvironmentType.Sandbox]: { color: "#1565c0", label: "SANDBOX" },
    [EnvironmentType.Trial]: { color: "#6a1b9a", label: "TRIAL" },
    [EnvironmentType.Developer]: { color: "#00695c", label: "DEV" },
    [EnvironmentType.Default]: { color: "#616161", label: "DEFAULT" },
    [EnvironmentType.Unknown]: { color: "#c62828", label: "UNKNOWN" }
};

const defaultStyleOptions = {
    barStyle: BarStyle.None,
    borderWidth: 0,
    showLabel: true
};

/** What an environment looks like before anyone overrides it. Also what the editor starts from. */
export function getEnvironmentDefaultStyle(environment: EnvironmentInfo | null): EnvironmentStyle {
    return { ...environmentTypeStyles[environment?.type ?? EnvironmentType.Unknown], ...defaultStyleOptions };
}

/**
 * The detected type is the baseline, the per environment override wins over it. The environment is
 * Unknown while detection is still in flight, which is coloured like Production on purpose.
 */
export function resolveEnvironmentStyle(
    theme: TYPE_EnvironmentTheme,
    environment: EnvironmentInfo | null
): EnvironmentStyle | null {
    if (!theme.enabled) {
        return null;
    }

    return {
        ...getEnvironmentDefaultStyle(environment),
        ...(environment ? theme.overrides[environment.url] : undefined)
    };
}
