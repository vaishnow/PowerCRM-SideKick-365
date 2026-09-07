import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { type SxProps, type Theme } from "@mui/material/styles";
import { DataGrid, gridClasses, type GridColDef } from "@mui/x-data-grid";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";

import ButtonLinearProgress from "../../utils/components/ButtonLinearProgress";
import FilterInput from "../../utils/components/FilterInput";
import RecordSearchBar from "../../utils/components/RecordSearchBar";
import { CustomLoadingOverlay, CustomNoRowsOverlay } from "../../utils/components/MetadataBrowser/StyledDataGrid";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import { getCurrentDynamics365DateTimeFormat, getRecordUrl } from "../../utils/global/common";
import { useCurrentRecord } from "../../utils/hooks/use/useCurrentRecord";
import { type AuditRow } from "../../utils/types/AuditHistory";
import { AUDIT_PAGE_CAP, RetrieveAuditHistory } from "../../utils/hooks/XrmApi/RetrieveAuditHistory";

class AuditHistoryProcess extends ProcessButton {
    static id = "audithistory";
    constructor() {
        super("audithistory");
        this.process = AuditHistory;
    }
}

const DateTimeSx: SxProps<Theme> = {
    width: "100%",
    "& input": {
        padding: "8.5px 0px 8.5px 14px"
    },
    "& > div": {
        height: "37px"
    },
    "& label:not([data-shrink=true])": {
        transform: "translate(14px, 8px) scale(1)"
    }
};

/** A cell that opens the record it names in a new tab, and stays plain text without an id. */
function RecordLinkCell(props: { label: string; entityName: string; recordId: string }) {
    const { label, entityName, recordId } = props;

    if (!label || !recordId) {
        return <Typography variant="body2" noWrap>{label}</Typography>;
    }

    return (
        <Link
            href={getRecordUrl(entityName, recordId)}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            underline="hover"
            noWrap
            title={`${label}
(open in a new tab)`}>
            {label}
        </Link>
    );
}

/**
 * Event level cells are merged down the attribute rows of one audit record. Spanning on the audit
 * id rather than the displayed value keeps two consecutive events apart even when the same user
 * ran the same action twice, while sorting and filtering still see the real value.
 */
const spanByEvent = (value: any, row: AuditRow) => row.auditid;

/** The date column shows the org formatted string: `date` is only there to sort and filter on. */
const COLUMNS: GridColDef[] = [
    { field: "dateFormatted", headerName: "Date", width: 140, rowSpanValueGetter: spanByEvent },
    {
        field: "user",
        headerName: "User",
        width: 130,
        rowSpanValueGetter: spanByEvent,
        renderCell: (params) => (
            <RecordLinkCell label={params.value} entityName="systemuser" recordId={params.row.userId} />
        )
    },
    { field: "action", headerName: "Action", width: 100, rowSpanValueGetter: spanByEvent },
    { field: "attribute", headerName: "Attribute", width: 160 },
    { field: "oldValue", headerName: "Old Value", flex: 1, minWidth: 120 },
    { field: "newValue", headerName: "New Value", flex: 1, minWidth: 120 },
    { field: "operation", headerName: "Operation", width: 100, rowSpanValueGetter: spanByEvent },
    { field: "attributeMask", headerName: "Attribute Mask", width: 140, rowSpanValueGetter: spanByEvent },
    { field: "changeData", headerName: "Change Data", width: 300, rowSpanValueGetter: spanByEvent },
    {
        field: "callingUser",
        headerName: "Calling User",
        width: 130,
        rowSpanValueGetter: spanByEvent,
        renderCell: (params) => (
            <RecordLinkCell label={params.value} entityName="systemuser" recordId={params.row.callingUserId} />
        )
    },
    {
        field: "userAdditionalInfo",
        headerName: "User Additional Info",
        width: 180,
        rowSpanValueGetter: spanByEvent
    },
    { field: "objectTypeCode", headerName: "Object Type", width: 120, rowSpanValueGetter: spanByEvent },
    { field: "transactionId", headerName: "Transaction Id", width: 280, rowSpanValueGetter: spanByEvent },
    { field: "auditid", headerName: "Audit Id", width: 280, rowSpanValueGetter: spanByEvent }
];

/** The raw audit columns: available from the grid's column menu, off by default. */
const HIDDEN_COLUMNS = {
    operation: false,
    attributeMask: false,
    changeData: false,
    callingUser: false,
    userAdditionalInfo: false,
    objectTypeCode: false,
    transactionId: false,
    auditid: false
};

const AuditHistory = forwardRef<ProcessRef, ProcessProps>(function AuditHistory(props: ProcessProps, ref) {
    const { entityName: currentEntityName, recordId: currentRecordId } = useCurrentRecord();
    const [entityName, setEntityName] = useState<string>(currentEntityName ?? "");
    const [recordIds, setRecordIds] = useState<string[]>(currentRecordId ? [currentRecordId] : []);

    // The record open in the form is the starting point, and follows navigation until something
    // else is picked in the search bar.
    useEffect(() => {
        if (currentEntityName) setEntityName(currentEntityName);
    }, [currentEntityName]);
    useEffect(() => {
        if (currentRecordId) setRecordIds([currentRecordId]);
    }, [currentRecordId]);

    const recordId = recordIds.at(0);
    const [rows, isFetching, error, refresh] = RetrieveAuditHistory(entityName, recordId);

    // A record of the previous entity cannot be audited under the new one.
    const onEntityChange = useCallback((name: string) => {
        setEntityName(name);
        setRecordIds([]);
    }, []);

    const reset = useCallback(() => {
        setEntityName(currentEntityName ?? "");
        setRecordIds(currentRecordId ? [currentRecordId] : []);
    }, [currentEntityName, currentRecordId]);

    const [filter, setFilter] = useState<string>("");
    const [filterDateMin, setFilterDateMin] = useState<Dayjs | null>(null);
    const [filterDateMax, setFilterDateMax] = useState<Dayjs | null>(null);

    const dateTimeFormat = useMemo(() => getCurrentDynamics365DateTimeFormat(), []);

    const rowsFiltered = useMemo(
        () =>
            rows.filter((row) => {
                const search = filter.toLowerCase();
                const textFilterResult =
                    !search ||
                    row.user.toLowerCase().includes(search) ||
                    row.action.toLowerCase().includes(search) ||
                    row.attribute.toLowerCase().includes(search) ||
                    row.oldValue.toLowerCase().includes(search) ||
                    row.newValue.toLowerCase().includes(search) ||
                    row.changeData.toLowerCase().includes(search);
                const dateFilterMin = !filterDateMin || dayjs(row.date) >= filterDateMin;
                const dateFilterMax = !filterDateMax || dayjs(row.date) <= filterDateMax;
                return textFilterResult && dateFilterMin && dateFilterMax;
            }),
        [rows, filter, filterDateMin, filterDateMax]
    );

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="column" width="100%" height="100%">
                <Stack direction="column" p={1} spacing={0.5}>
                    <RecordSearchBar
                        entityName={entityName}
                        setEntityName={onEntityChange}
                        recordIds={recordIds}
                        setRecordIds={setRecordIds}
                        reset={reset}
                    />
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FilterInput fullWidth placeholder="Search in changes" returnFilterInput={setFilter} />
                        <ButtonLinearProgress
                            variant="contained"
                            loading={isFetching}
                            onClick={refresh}
                            sx={{ whiteSpace: "nowrap", width: "25%" }}>
                            Refresh
                        </ButtonLinearProgress>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                        <DateTimePicker
                            label="Minimum DateTime"
                            ampm={dateTimeFormat.is12hours}
                            format={dateTimeFormat.ShortDateTimePattern}
                            onChange={setFilterDateMin}
                            value={filterDateMin}
                            sx={DateTimeSx}
                            slotProps={{
                                field: { clearable: true }
                            }}
                        />
                        <DateTimePicker
                            label="Maximum DateTime"
                            ampm={dateTimeFormat.is12hours}
                            format={dateTimeFormat.ShortDateTimePattern}
                            onChange={setFilterDateMax}
                            value={filterDateMax}
                            sx={DateTimeSx}
                            slotProps={{
                                field: { clearable: true }
                            }}
                        />
                    </Stack>
                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                        {recordId ? `${rows.length} change rows, latest ${AUDIT_PAGE_CAP} events` : "Select an entity and a record."}
                    </Typography>
                    {error && (
                        <Typography variant="caption" color="error">
                            {error}
                        </Typography>
                    )}
                </Stack>

                <Box flexGrow={1} minHeight={0}>
                    <DataGrid
                        rows={rowsFiltered}
                        columns={COLUMNS}
                        getRowId={(row) => row.id}
                        loading={isFetching}
                        initialState={{ columns: { columnVisibilityModel: HIDDEN_COLUMNS } }}
                        rowHeight={32}
                        columnHeaderHeight={36}
                        disableRowSelectionOnClick
                        hideFooter
                        unstable_rowSpanning
                        sx={{
                            [`& .${gridClasses.cell}`]: { display: "flex", alignItems: "flex-start", pt: "6px" }
                        }}
                        slots={{
                            noRowsOverlay: CustomNoRowsOverlay,
                            loadingOverlay: CustomLoadingOverlay
                        }}
                    />
                </Box>
            </Stack>
        </LocalizationProvider>
    );
});

export default AuditHistoryProcess;
