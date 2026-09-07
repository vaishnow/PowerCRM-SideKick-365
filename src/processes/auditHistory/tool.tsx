import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type SxProps, type Theme } from "@mui/material/styles";
import { DataGrid, gridClasses, type GridColDef } from "@mui/x-data-grid";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import { forwardRef, useMemo, useState } from "react";

import ButtonLinearProgress from "../../utils/components/ButtonLinearProgress";
import FilterInput from "../../utils/components/FilterInput";
import { CustomLoadingOverlay, CustomNoRowsOverlay } from "../../utils/components/MetadataBrowser/StyledDataGrid";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import { getCurrentDynamics365DateTimeFormat } from "../../utils/global/common";
import { useCurrentRecord } from "../../utils/hooks/use/useCurrentRecord";
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

/** The date column shows the org formatted string: `date` is only there to sort and filter on. */
const COLUMNS: GridColDef[] = [
    { field: "dateFormatted", headerName: "Date", width: 140 },
    { field: "user", headerName: "User", width: 130 },
    { field: "action", headerName: "Action", width: 100 },
    { field: "attribute", headerName: "Attribute", width: 160 },
    { field: "oldValue", headerName: "Old Value", flex: 1, minWidth: 120 },
    { field: "newValue", headerName: "New Value", flex: 1, minWidth: 120 }
];

const AuditHistory = forwardRef<ProcessRef, ProcessProps>(function AuditHistory(props: ProcessProps, ref) {
    const { isEntityRecord, entityName, recordId } = useCurrentRecord();
    const [rows, isFetching, error, refresh] = RetrieveAuditHistory(recordId);

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
                    row.newValue.toLowerCase().includes(search);
                const dateFilterMin = !filterDateMin || dayjs(row.date) >= filterDateMin;
                const dateFilterMax = !filterDateMax || dayjs(row.date) <= filterDateMax;
                return textFilterResult && dateFilterMin && dateFilterMax;
            }),
        [rows, filter, filterDateMin, filterDateMax]
    );

    if (!isEntityRecord) {
        return (
            <Stack height="100%" alignItems="center" justifyContent="center" p={2}>
                <Typography textAlign="center">Open a record to see its audit history.</Typography>
            </Stack>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="column" width="100%" height="100%">
                <Stack direction="column" p={1} spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Stack minWidth={0} flexGrow={1}>
                            <Typography variant="caption" noWrap>
                                {entityName}
                            </Typography>
                            <Typography variant="caption" noWrap sx={{ opacity: 0.75 }}>
                                {recordId}
                            </Typography>
                        </Stack>
                        <ButtonLinearProgress
                            variant="contained"
                            loading={isFetching}
                            onClick={refresh}
                            sx={{ whiteSpace: "nowrap", width: "25%" }}>
                            Refresh
                        </ButtonLinearProgress>
                    </Stack>
                    <FilterInput fullWidth placeholder="Search in changes" returnFilterInput={setFilter} />
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
                        {`Latest ${AUDIT_PAGE_CAP} audit events`}
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
                        rowHeight={32}
                        columnHeaderHeight={36}
                        disableRowSelectionOnClick
                        hideFooter
                        sx={{
                            [`& .${gridClasses.cell}`]: { display: "flex", alignItems: "center" }
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
