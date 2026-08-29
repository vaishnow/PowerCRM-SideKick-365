import DesignServicesIcon from "@mui/icons-material/DesignServices";
import LaunchIcon from "@mui/icons-material/Launch";
import { type GridColDef } from "@mui/x-data-grid";

import { type CloudFlowRow, type PluginStepRow, type ProcessRow } from "../../../types/WorkflowExplorer";
import { type DetailField } from "../../DetailTooltip";
import {
    CLOUD_FLOW_MESSAGE_LABEL,
    formatBoolean,
    formatted,
    getClassicDesignerUrl,
    getCloudFlowMakerUrl,
    getPluginStepStateColor,
    getProcessStateColor
} from "../utils";
import { buildActionsColumn, NameCell, StateDot } from "./cells";

const STATE_COLUMN_WIDTH = 20;
const EXTRA_COLUMN_WIDTH = 105;

function processDetailFields(row: ProcessRow): DetailField[] {
    return [
        ["Category", formatted(row, "category")],
        ["State", formatted(row, "statecode")],
        ["Status", formatted(row, "statuscode")],
        ["Mode", formatted(row, "mode")],
        ["Scope", formatted(row, "scope")],
        ["Run As", formatted(row, "runas")],
        ["On Demand", formatBoolean(row.ondemand)],
        ["On Create", formatBoolean(row.triggeroncreate)],
        ["On Delete", formatBoolean(row.triggerondelete)],
        ["On Update", row.triggeronupdateattributelist || "No"],
        ["Description", row.description || "-"],
        ["Managed", formatBoolean(row.ismanaged)],
        ["Customizable", formatBoolean(row.iscustomizable?.Value)],
        ["Modified On", formatted(row, "modifiedon")],
        ["Id", row.workflowid]
    ];
}

function cloudFlowDetailFields(row: CloudFlowRow): DetailField[] {
    return [
        ["State", formatted(row, "statecode")],
        ["Status", formatted(row, "statuscode")],
        ["Triggers", cloudFlowTriggerLabel(row)],
        [
            "Filtering Attributes",
            row.triggers
                .map((trigger) => trigger.filteringattributes)
                .filter((a) => a)
                .join(", ") || "-"
        ],
        ["Managed", formatBoolean(row.ismanaged)],
        ["Modified On", formatted(row, "modifiedon")],
        ["Id", row.workflowid]
    ];
}

function pluginStepDetailFields(row: PluginStepRow): DetailField[] {
    return [
        ["Message", formatted(row, "sdkmessageid")],
        ["Stage", formatted(row, "stage")],
        ["Mode", formatted(row, "mode")],
        ["Rank", String(row.rank)],
        ["State", formatted(row, "statecode")],
        ["Status", formatted(row, "statuscode")],
        ["Handler", formatted(row, "eventhandler")],
        ["Impersonating User", formatted(row, "impersonatinguserid") || "-"],
        ["Filtering Attributes", row.filteringattributes || "-"],
        ["Customizable", formatBoolean(row.iscustomizable?.Value)],
        ["Id", row.sdkmessageprocessingstepid]
    ];
}

function cloudFlowTriggerLabel(row: CloudFlowRow) {
    return (
        row.triggers
            .map((trigger) =>
                trigger.message !== null ? CLOUD_FLOW_MESSAGE_LABEL[trigger.message] ?? String(trigger.message) : "?"
            )
            .join(", ") || "-"
    );
}

/** Columns for the five classic process tabs. The extra column is the one attribute
 * worth surfacing next to the name for that category; everything else is on hover. */
export function processColumns(extraField: "mode" | "scope"): GridColDef[] {
    return [
        {
            field: "statecode",
            headerName: "",
            width: STATE_COLUMN_WIDTH,
            minWidth: STATE_COLUMN_WIDTH,
            disableColumnMenu: true,
            resizable: false,
            renderCell: (params) => (
                <StateDot
                    color={getProcessStateColor(params.row.statecode)}
                    label={formatted(params.row, "statecode")}
                />
            )
        },
        {
            field: "name",
            headerName: "Name",
            flex: 1,
            minWidth: 140,
            renderCell: (params) => <NameCell name={params.row.name} fields={processDetailFields(params.row)} />
        },
        {
            field: extraField,
            headerName: extraField === "mode" ? "Mode" : "Scope",
            width: EXTRA_COLUMN_WIDTH,
            valueGetter: (_value, row) => formatted(row, extraField)
        },
        buildActionsColumn("workflow", (row: ProcessRow) => [
            {
                label: "Open in classic designer",
                url: getClassicDesignerUrl(row.category, row.workflowid),
                icon: <DesignServicesIcon />
            }
        ])
    ];
}

export function cloudFlowColumns(): GridColDef[] {
    return [
        {
            field: "statecode",
            headerName: "",
            width: STATE_COLUMN_WIDTH,
            minWidth: STATE_COLUMN_WIDTH,
            disableColumnMenu: true,
            resizable: false,
            renderCell: (params) => (
                <StateDot
                    color={getProcessStateColor(params.row.statecode)}
                    label={formatted(params.row, "statecode")}
                />
            )
        },
        {
            field: "name",
            headerName: "Name",
            flex: 1,
            minWidth: 140,
            renderCell: (params) => <NameCell name={params.row.name} fields={cloudFlowDetailFields(params.row)} />
        },
        {
            field: "triggers",
            headerName: "Trigger",
            width: EXTRA_COLUMN_WIDTH,
            valueGetter: (_value, row) => cloudFlowTriggerLabel(row)
        },
        buildActionsColumn("workflow", (row: CloudFlowRow) => [
            {
                label: "Open in maker portal",
                url: getCloudFlowMakerUrl(row.workflowid),
                icon: <LaunchIcon />
            }
        ])
    ];
}

export function pluginStepColumns(): GridColDef[] {
    return [
        {
            field: "statecode",
            headerName: "",
            width: STATE_COLUMN_WIDTH,
            minWidth: STATE_COLUMN_WIDTH,
            disableColumnMenu: true,
            resizable: false,
            renderCell: (params) => (
                <StateDot
                    color={getPluginStepStateColor(params.row.statecode)}
                    label={formatted(params.row, "statecode")}
                />
            )
        },
        {
            field: "name",
            headerName: "Name",
            flex: 1,
            minWidth: 140,
            renderCell: (params) => <NameCell name={params.row.name} fields={pluginStepDetailFields(params.row)} />
        },
        {
            field: "stage",
            headerName: "Stage",
            width: EXTRA_COLUMN_WIDTH,
            valueGetter: (_value, row) => `${formatted(row, "stage")} (${row.rank})`
        },
        buildActionsColumn("sdkmessageprocessingstep")
    ];
}
