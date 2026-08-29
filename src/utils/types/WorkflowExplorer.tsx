type Formatted<K extends string> = {
    [P in `${K}@OData.Community.Display.V1.FormattedValue`]?: string;
};

export type ManagedProperty = {
    Value: boolean;
    CanBeChanged: boolean;
    ManagedPropertyLogicalName: string;
};

export interface ProcessRow
    extends Formatted<"category" | "statecode" | "statuscode" | "type" | "mode" | "scope" | "runas" | "modifiedon"> {
    workflowid: string;
    name: string;
    category: number;
    statecode: number;
    statuscode: number;
    type: number;
    mode: number;
    scope: number;
    runas: number;
    ondemand: boolean;
    triggeroncreate: boolean;
    triggerondelete: boolean;
    triggeronupdateattributelist: string | null;
    description: string | null;
    ismanaged: boolean;
    iscustomizable?: ManagedProperty;
    modifiedon: string;
}

export interface PluginStepRow
    extends Formatted<
        "stage" | "mode" | "statecode" | "statuscode" | "sdkmessageid" | "eventhandler" | "impersonatinguserid"
    > {
    sdkmessageprocessingstepid: string;
    name: string;
    stage: number;
    mode: number;
    rank: number;
    statecode: number;
    statuscode: number;
    filteringattributes: string | null;
    _eventhandler_value: string | null;
    _sdkmessageid_value: string;
    _impersonatinguserid_value: string | null;
    iscustomizable?: ManagedProperty;
}

/** Message values found in a cloud flow's Dataverse trigger. */
export const enum CloudFlowMessage {
    Create = 1,
    Update = 2,
    Delete = 3
}

export type CloudFlowTrigger = {
    entityname: string;
    message: CloudFlowMessage | number | null;
    scope: number | null;
    filteringattributes: string | null;
};

export interface CloudFlowRow extends Formatted<"statecode" | "statuscode" | "modifiedon"> {
    workflowid: string;
    name: string;
    statecode: number;
    statuscode: number;
    ismanaged: boolean;
    modifiedon: string;
    /** Dataverse triggers of this flow that target the selected entity. */
    triggers: CloudFlowTrigger[];
}
