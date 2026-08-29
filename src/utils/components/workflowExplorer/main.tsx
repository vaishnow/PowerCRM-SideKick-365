import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Tab, { tabClasses } from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { debugLog, groupBy } from "../../global/common";
import { useCurrentRecord } from "../../hooks/use/useCurrentRecord";
import { RetrieveCloudFlows } from "../../hooks/XrmApi/RetrieveCloudFlows";
import { RetrievePluginSteps } from "../../hooks/XrmApi/RetrievePluginSteps";
import { RetrieveRecordsByFilter } from "../../hooks/XrmApi/RetrieveRecordsByFilter";
import { RetrieveSetName } from "../../hooks/XrmApi/RetrieveSetName";
import { type CloudFlowRow, type PluginStepRow, type ProcessRow } from "../../types/WorkflowExplorer";
import ButtonLinearProgress from "../ButtonLinearProgress";
import EntitySelector from "../EntitySelector";
import FilterInput from "../FilterInput";
import { CustomLoadingOverlay, CustomNoRowsOverlay } from "../MetadataBrowser/StyledDataGrid";
import { cloudFlowColumns, pluginStepColumns, processColumns } from "./subcomponents/columns";
import { isPluginStepEnabled, isProcessEnabled, PROCESS_CATEGORY_TABS, ProcessCategory } from "./utils";

const PROCESS_COLUMNS = [
    "workflowid",
    "name",
    "category",
    "statecode",
    "statuscode",
    "type",
    "mode",
    "scope",
    "runas",
    "ondemand",
    "triggeroncreate",
    "triggerondelete",
    "triggeronupdateattributelist",
    "description",
    "ismanaged",
    "iscustomizable",
    "modifiedon"
];

/** Categories showing the Mode attribute next to the name; the others show Scope. */
const MODE_CATEGORIES: number[] = [ProcessCategory.Workflow, ProcessCategory.Action];

/** Display order of the tabs, by label. */
const TAB_ORDER = [
    "Workflows",
    "Plugin Steps",
    "Business Process Flows",
    "Business Rules",
    "Actions",
    "Cloud Flows",
    "Dialogs"
];

const theme = createTheme({
    components: {
        MuiTypography: {
            styleOverrides: {
                root: {
                    fontSize: "0.85rem"
                }
            }
        }
    }
});

type TabContent = {
    label: string;
    tooltip?: string;
    rows: any[];
    columns: GridColDef[];
    getRowId: (row: any) => string;
    isFetching: boolean;
    /** Runs when the tab is selected, for content fetched on demand. */
    onOpen?: () => void;
    /** Kept visible by "Hide empty" even with no rows: its data is not loaded yet. */
    keepWhenEmpty?: boolean;
};

const WorkflowExplorerPane = React.memo((props: { processId: string }) => {
    const { entityName: currentEntityName } = useCurrentRecord();
    const [entityName, setEntityName] = useState<string>(currentEntityName ?? "");

    useEffect(() => {
        if (currentEntityName) setEntityName(currentEntityName);
    }, [currentEntityName]);

    const [filter, setFilter] = useState<string>("");
    const [enabledOnly, setEnabledOnly] = useState<boolean>(false);
    const [hideEmpty, setHideEmpty] = useState<boolean>(false);
    const [tab, setTab] = useState<number>(0);
    // Cloud flows are fetched only once their tab has been opened: clientdata is heavy.
    const [cloudFlowsRequested, setCloudFlowsRequested] = useState<boolean>(false);

    const [processes, isFetchingProcesses, refreshProcesses] = RetrieveRecordsByFilter(
        entityName ? "workflow" : "",
        PROCESS_COLUMNS,
        `primaryentity eq '${entityName}' and type eq 1`,
        "name asc"
    );
    const [pluginSteps, isFetchingPluginSteps, refreshPluginSteps] = RetrievePluginSteps(entityName);
    const entitySetName = RetrieveSetName(entityName);
    const [cloudFlows, isFetchingCloudFlows, refreshCloudFlows] = RetrieveCloudFlows(
        entitySetName,
        cloudFlowsRequested
    );

    const refreshAll = useCallback(() => {
        refreshProcesses();
        refreshPluginSteps();
        refreshCloudFlows();
    }, [refreshProcesses, refreshPluginSteps, refreshCloudFlows]);

    const tabs = useMemo<TabContent[]>(() => {
        const search = filter.toLowerCase();
        const matchesName = (name: string) => !search || name.toLowerCase().includes(search);

        const processesByCategory = groupBy(processes, "category");
        const unmappedCategories = Object.keys(processesByCategory).filter(
            (category) => !PROCESS_CATEGORY_TABS.some((processTab) => String(processTab.category) === category)
        );
        if (unmappedCategories.length) {
            debugLog("WorkflowExplorer: categories without a tab, rows not displayed:", unmappedCategories);
        }

        return [
            ...PROCESS_CATEGORY_TABS.map(({ label, category }) => ({
                label,
                rows: ((processesByCategory[category] ?? []) as ProcessRow[]).filter(
                    (row) => matchesName(row.name) && (!enabledOnly || isProcessEnabled(row.statecode))
                ),
                columns: processColumns(MODE_CATEGORIES.includes(category) ? "mode" : "scope"),
                getRowId: (row: ProcessRow) => row.workflowid,
                isFetching: isFetchingProcesses
            })),
            {
                label: "Cloud Flows",
                tooltip:
                    "Cloud flows store no entity link, so this list is derived from each flow definition. Best-effort match.",
                rows: cloudFlows.filter(
                    (row) => matchesName(row.name) && (!enabledOnly || isProcessEnabled(row.statecode))
                ),
                columns: cloudFlowColumns(),
                getRowId: (row: CloudFlowRow) => row.workflowid,
                isFetching: isFetchingCloudFlows,
                onOpen: () => setCloudFlowsRequested(true),
                keepWhenEmpty: !cloudFlowsRequested
            },
            {
                label: "Plugin Steps",
                rows: pluginSteps.filter(
                    (row) => matchesName(row.name) && (!enabledOnly || isPluginStepEnabled(row.statecode))
                ),
                columns: pluginStepColumns(),
                getRowId: (row: PluginStepRow) => row.sdkmessageprocessingstepid,
                isFetching: isFetchingPluginSteps
            }
        ].sort((a, b) => TAB_ORDER.indexOf(a.label) - TAB_ORDER.indexOf(b.label));
    }, [
        processes,
        cloudFlows,
        pluginSteps,
        filter,
        enabledOnly,
        cloudFlowsRequested,
        isFetchingProcesses,
        isFetchingCloudFlows,
        isFetchingPluginSteps
    ]);

    const visibleTabs = useMemo(() => {
        if (!hideEmpty) return tabs;
        const kept = tabs.filter((tabContent) => tabContent.rows.length || tabContent.keepWhenEmpty);
        // Everything empty: keep the strip rather than leaving no tab to select.
        return kept.length ? kept : tabs;
    }, [tabs, hideEmpty]);

    // Hiding tabs shifts the indexes, so clamp instead of pointing past the end.
    const activeIndex = Math.min(tab, visibleTabs.length - 1);
    const activeTab = visibleTabs[activeIndex];

    const onTabChange = useCallback(
        (event: React.SyntheticEvent, value: number) => {
            setTab(value);
            visibleTabs[value]?.onOpen?.();
        },
        [visibleTabs]
    );

    return (
        <ThemeProvider theme={theme}>
            <Stack direction="column" width="100%" height="100%">
                <Stack direction="column" p={1} spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <EntitySelector fullWidth entityname={entityName} setEntityname={setEntityName} />
                        <ButtonLinearProgress
                            variant="contained"
                            loading={isFetchingProcesses || isFetchingPluginSteps || isFetchingCloudFlows}
                            onClick={refreshAll}
                            sx={{ whiteSpace: "nowrap", width: "25%" }}>
                            Refresh
                        </ButtonLinearProgress>
                    </Stack>
                    <FilterInput fullWidth placeholder="Search by name" returnFilterInput={setFilter} />
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={enabledOnly}
                                    onChange={(event) => setEnabledOnly(event.target.checked)}
                                />
                            }
                            label={<Typography variant="caption">Enabled only</Typography>}
                            sx={{ whiteSpace: "nowrap", mr: 0 }}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={hideEmpty}
                                    onChange={(event) => setHideEmpty(event.target.checked)}
                                />
                            }
                            label={<Typography variant="caption">Hide empty</Typography>}
                            sx={{ whiteSpace: "nowrap", mr: 0 }}
                        />
                    </Stack>
                </Stack>

                <Tabs
                    value={activeIndex}
                    onChange={onTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 36,
                        [`& .${tabClasses.root}`]: { minHeight: 36, py: 0, fontSize: "0.75rem" }
                    }}>
                    {visibleTabs.map((tabContent) => {
                        const label = `${tabContent.label} (${tabContent.rows.length})`;
                        return (
                            <Tab
                                key={tabContent.label}
                                label={
                                    tabContent.tooltip ? (
                                        <Tooltip title={tabContent.tooltip} arrow>
                                            <span>{label}</span>
                                        </Tooltip>
                                    ) : (
                                        label
                                    )
                                }
                            />
                        );
                    })}
                </Tabs>

                <Box flexGrow={1} minHeight={0}>
                    <DataGrid
                        rows={activeTab.rows}
                        columns={activeTab.columns}
                        getRowId={activeTab.getRowId}
                        loading={activeTab.isFetching}
                        rowHeight={44}
                        columnHeaderHeight={40}
                        disableRowSelectionOnClick
                        hideFooter
                        sx={{
                            [`& .${gridClasses.cell}`]: { display: "flex", alignItems: "center" },
                            '[data-field="statecode"]': { p: 0 }
                        }}
                        slots={{
                            noRowsOverlay: CustomNoRowsOverlay,
                            loadingOverlay: CustomLoadingOverlay
                        }}
                    />
                </Box>
            </Stack>
        </ThemeProvider>
    );
});

export default WorkflowExplorerPane;
