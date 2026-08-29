import { debugError, getBapEnvironmentId } from "../../global/common";
import { CloudFlowMessage, type CloudFlowTrigger } from "../../types/WorkflowExplorer";

/** workflow.category values, verified against the workflow_category option set. */
export const enum ProcessCategory {
    Workflow = 0,
    Dialog = 1,
    BusinessRule = 2,
    Action = 3,
    BusinessProcessFlow = 4,
    ModernFlow = 5
}

/** Categories displayed as their own tab. 6 (Desktop Flow), 7 (AI Flow) and 9000
 * (Web Client API Flow) are excluded: they carry primaryentity 'none' and cannot be
 * returned by an entity-filtered query. */
export const PROCESS_CATEGORY_TABS: { label: string; category: ProcessCategory }[] = [
    { label: "Workflows", category: ProcessCategory.Workflow },
    { label: "Dialogs", category: ProcessCategory.Dialog },
    { label: "Business Rules", category: ProcessCategory.BusinessRule },
    { label: "Actions", category: ProcessCategory.Action },
    { label: "Business Process Flows", category: ProcessCategory.BusinessProcessFlow }
];

/** Categories using the classic process designer. */
const CLASSIC_DESIGNER_CATEGORIES: number[] = [
    ProcessCategory.Workflow,
    ProcessCategory.Action,
    ProcessCategory.BusinessProcessFlow
];

/** workflow.statecode: 0 Draft, 1 Activated, 2 Suspended. */
export function isProcessEnabled(statecode: number) {
    return statecode === 1;
}

/** sdkmessageprocessingstep.statecode: 0 Enabled, 1 Disabled. */
export function isPluginStepEnabled(statecode: number) {
    return statecode === 0;
}

export const CLOUD_FLOW_MESSAGE_LABEL: { [message: number]: string } = {
    [CloudFlowMessage.Create]: "Create",
    [CloudFlowMessage.Update]: "Update",
    [CloudFlowMessage.Delete]: "Delete"
};

export function getCloudFlowMakerUrl(workflowid: string) {
    const environmentId = getBapEnvironmentId();
    return environmentId
        ? `https://make.powerautomate.com/environments/${environmentId}/flows/${workflowid}/details`
        : null;
}

export function getClassicDesignerUrl(category: number, workflowid: string) {
    return CLASSIC_DESIGNER_CATEGORIES.includes(category)
        ? `${Xrm.Utility.getGlobalContext().getClientUrl()}/sfa/workflow/edit.aspx?id=${workflowid}`
        : null;
}

/**
 * Extracts the Dataverse triggers of a cloud flow that target entitySetName.
 * Cloud flows store primaryentity 'none', so the entity link only exists inside
 * the flow definition. Match is best-effort by nature.
 */
export function parseCloudFlowTriggers(clientdata: string | null, entitySetName: string): CloudFlowTrigger[] {
    if (!clientdata || !entitySetName) return [];

    let clientDefinition: any;
    try {
        clientDefinition = JSON.parse(clientdata);
        // clientdata is sometimes double-encoded.
        if (typeof clientDefinition === "string") clientDefinition = JSON.parse(clientDefinition);
    } catch (e: any) {
        debugError("parseCloudFlowTriggers: unparseable clientdata.", e?.message);
        return [];
    }

    const triggers = clientDefinition?.properties?.definition?.triggers;
    if (!triggers) return [];

    return Object.values<any>(triggers)
        .map((trigger) => readSubscriptionRequest(trigger?.inputs?.parameters))
        .filter((trigger): trigger is CloudFlowTrigger => trigger?.entityname === entitySetName);
}

/** Reads the Dataverse subscription parameters, flattened or nested. */
function readSubscriptionRequest(parameters: any): CloudFlowTrigger | null {
    if (!parameters) return null;

    const read = (field: string) =>
        parameters.subscriptionRequest?.[field] ?? parameters[`subscriptionRequest/${field}`] ?? null;

    const entityname = read("entityname");
    if (!entityname) return null;

    return {
        entityname,
        message: read("message"),
        scope: read("scope"),
        filteringattributes: read("filteringattributes")
    };
}

/** Reads the FormattedValue annotation of a column, falling back to the raw value. */
export function formatted(row: any, field: string): string {
    return row[`${field}@OData.Community.Display.V1.FormattedValue`] ?? row[field] ?? "";
}

export function getProcessStateColor(statecode: number) {
    if (statecode === 1) return "success.main";
    if (statecode === 2) return "warning.main";
    return "text.disabled";
}

export function getPluginStepStateColor(statecode: number) {
    return statecode === 0 ? "success.main" : "text.disabled";
}

export function formatBoolean(value: boolean | undefined) {
    return value ? "Yes" : "No";
}
