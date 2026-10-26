/** customapifieldtype global choice, also used for legacy action fields after CLR mapping. */
export enum ApiParameterType {
    Boolean = 0,
    DateTime = 1,
    Decimal = 2,
    Entity = 3,
    EntityCollection = 4,
    EntityReference = 5,
    Float = 6,
    Integer = 7,
    Money = 8,
    Picklist = 9,
    String = 10,
    StringArray = 11,
    Guid = 12
}

export enum ApiBindingType {
    Global = 0,
    Entity = 1,
    EntityCollection = 2
}

export type InvokableMessage = {
    id: string;
    uniqueName: string;
    displayName: string;
    /** "customapi" has full typed metadata; "sdkmessage" covers legacy Actions and other custom messages. */
    source: "customapi" | "sdkmessage";
    isFunction: boolean;
    bindingType: ApiBindingType;
    boundEntityLogicalName?: string;
};

export type InvokableParameter = {
    uniqueName: string;
    displayName: string;
    type: ApiParameterType;
    isOptional: boolean;
    logicalEntityName?: string;
};

/** Types with no dedicated input: the user edits raw JSON instead. */
export const JSON_PARAMETER_TYPES = [
    ApiParameterType.Entity,
    ApiParameterType.EntityCollection,
    ApiParameterType.StringArray
];

const CLR_TYPE_MAP: { [clrType: string]: ApiParameterType } = {
    "System.String": ApiParameterType.String,
    "System.String[]": ApiParameterType.StringArray,
    "System.Int32": ApiParameterType.Integer,
    "System.Int64": ApiParameterType.Integer,
    "System.Decimal": ApiParameterType.Decimal,
    "System.Double": ApiParameterType.Float,
    "System.Single": ApiParameterType.Float,
    "System.Boolean": ApiParameterType.Boolean,
    "System.DateTime": ApiParameterType.DateTime,
    "System.Guid": ApiParameterType.Guid,
    "Microsoft.Xrm.Sdk.EntityReference": ApiParameterType.EntityReference,
    "Microsoft.Xrm.Sdk.Entity": ApiParameterType.Entity,
    "Microsoft.Xrm.Sdk.EntityCollection": ApiParameterType.EntityCollection,
    "Microsoft.Xrm.Sdk.Money": ApiParameterType.Money,
    "Microsoft.Xrm.Sdk.OptionSetValue": ApiParameterType.Picklist
};

/**
 * Legacy action fields describe their type with a CLR parser string
 * ("System.String, mscorlib, Version=..."), not the customapifieldtype choice.
 */
export function getTypeFromClrParser(clrParser: string | null | undefined): ApiParameterType {
    const typeName = clrParser?.split(",").at(0)?.trim() ?? "";
    return CLR_TYPE_MAP[typeName] ?? ApiParameterType.String;
}
