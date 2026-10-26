import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Tab, { tabClasses } from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef, gridClasses } from "@mui/x-data-grid";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { useDebounceValue } from "usehooks-ts";

import RolesDisplayList from "../../processes/impersonation/shared/RolesDisplayList";
import AvatarColor from "../../utils/components/AvatarColor";
import FilterInput from "../../utils/components/FilterInput";
import { CustomLoadingOverlay, CustomNoRowsOverlay } from "../../utils/components/MetadataBrowser/StyledDataGrid";
import TooltipInfo from "../../utils/components/TooltipInfo";
import TypographyCopy from "../../utils/components/TypographyCopy";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import { formatId, getBapEnvironmentId } from "../../utils/global/common";
import { RetrieveRecordsByPrimaryAttributeOrGuid } from "../../utils/hooks/XrmApi/RetrieveRecordsByPrimaryAttributeOrGuid";
import { PRIVILEGE_DEPTH_ORDER, RetrieveUserPrivileges } from "../../utils/hooks/XrmApi/RetrieveUserPrivileges";
import { RetrieveUserWithRolesAndTeams } from "../../utils/hooks/XrmApi/RetrieveUserWithRolesAndTeams";

class UserSecurityProcess extends ProcessButton {
    static id = "usersecurity";
    constructor() {
        super("usersecurity");
        this.process = UserSecurity;
    }
}

const FORMATTED_SUFFIX = "@OData.Community.Display.V1.FormattedValue";

const DETAIL_FIELDS: { label: string; key: string; formatted?: boolean }[] = [
    { label: "User Id", key: "systemuserid" },
    { label: "Email", key: "internalemailaddress" },
    { label: "User Name", key: "domainname" },
    { label: "Azure Object Id", key: "azureactivedirectoryobjectid" },
    { label: "Access Mode", key: "accessmode", formatted: true },
    { label: "Application Id", key: "applicationid" },
    { label: "Disabled", key: "isdisabled", formatted: true },
    { label: "Licensed", key: "islicensed", formatted: true },
    { label: "Business Unit", key: "_businessunitid_value", formatted: true }
];

const PRIVILEGE_COLUMNS: GridColDef[] = [
    { field: "name", headerName: "Privilege", flex: 1 },
    { field: "depth", headerName: "Depth", width: 80, type: "singleSelect", valueOptions: PRIVILEGE_DEPTH_ORDER }
];

const DEPTH_CAVEAT =
    "RetrieveUserPrivileges returns Basic depth for every privilege inherited through team membership, regardless of the depth the team security role actually grants. Only the per-privilege messages return the true effective depth.";

function DetailRow(props: { label: string; value: string }) {
    const { label, value } = props;

    return (
        <Stack
            direction="row"
            spacing={1}
            justifyContent="space-between"
            alignItems="baseline"
            minWidth={0}
            px={0.5}
            borderRadius={1}
            sx={{ "&:hover": { bgcolor: "action.hover" } }}>
            <Typography whiteSpace="nowrap" sx={{ fontSize: "1em", opacity: 0.75 }}>
                {label}
            </Typography>
            <TypographyCopy
                copyValue={value}
                title={value ? `${value}\n(click to copy)` : ""}
                noWrap
                flexGrow={1}
                textAlign="right"
                fontSize="1em"
                style={{ cursor: "pointer" }}>
                {value}
            </TypographyCopy>
        </Stack>
    );
}

function OrgContext() {
    const context = useMemo(() => {
        const globalContext = Xrm.Utility.getGlobalContext();
        return [
            { label: "Org", value: globalContext.getOrgUniqueName() },
            { label: "Version", value: globalContext.getVersion() },
            { label: "Client Url", value: globalContext.getClientUrl() },
            { label: "Environment Id", value: getBapEnvironmentId() ?? "" }
        ];
    }, []);

    return (
        <Stack spacing={0.25}>
            {context.map((item) => (
                <DetailRow key={item.label} label={item.label} value={item.value} />
            ))}
        </Stack>
    );
}

const UserSecurity = forwardRef<ProcessRef, ProcessProps>(function UserSecurity(props: ProcessProps, ref) {
    const [selectedUserId, setSelectedUserId] = useState<string>(() =>
        formatId(Xrm.Utility.getGlobalContext().userSettings.userId)
    );
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch] = useDebounceValue(search, 300);
    const [privilegeFilter, setPrivilegeFilter] = useState<string>("");
    const [activeTab, setActiveTab] = useState<number>(0);

    const searchResults = RetrieveRecordsByPrimaryAttributeOrGuid("systemuser", debouncedSearch);
    const [userSecurity, isUserFetching] = RetrieveUserWithRolesAndTeams(selectedUserId);
    const [privileges, isPrivilegesFetching, privilegesError] = RetrieveUserPrivileges(selectedUserId);

    const filteredPrivileges = useMemo(
        () => privileges.filter((privilege) => (privilege.name ?? "").toLowerCase().includes(privilegeFilter.toLowerCase())),
        [privileges, privilegeFilter]
    );

    const returnFilterInput = useCallback((str: string) => setPrivilegeFilter(str), []);

    return (
        <Stack direction="column" spacing={0.5} padding="10px" height="calc(100% - 20px)">
            <Autocomplete
                size="small"
                options={searchResults.entities}
                getOptionLabel={(option: any) => option.fullname ?? ""}
                isOptionEqualToValue={(option: any, value: any) => option.systemuserid === value.systemuserid}
                filterOptions={(options) => options}
                onInputChange={(event, value) => setSearch(value)}
                onChange={(event, option: any) => option && setSelectedUserId(option.systemuserid)}
                renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Search a user or paste a Guid" />
                )}
            />

            <Stack direction="row" spacing={1} alignItems="center" pt={0.5}>
                <AvatarColor
                    src={userSecurity?.record?.entityimage_url}
                    fullname={userSecurity?.user?.fullname}
                    size={48}
                    loading={isUserFetching || !userSecurity?.user?.teamsRoles}
                    circularProgressRatio={1.15}
                />
                <Stack minWidth={0}>
                    <Typography noWrap>{userSecurity?.user?.fullname ?? "..."}</Typography>
                    <Typography variant="caption" noWrap sx={{ opacity: 0.75 }}>
                        {userSecurity?.user?.emailAddress}
                    </Typography>
                </Stack>
            </Stack>

            <Stack spacing={0.25} pt={0.5}>
                {DETAIL_FIELDS.map((field) => (
                    <DetailRow
                        key={field.key}
                        label={field.label}
                        value={
                            (field.formatted
                                ? userSecurity?.record?.[field.key + FORMATTED_SUFFIX]
                                : userSecurity?.record?.[field.key]) ?? ""
                        }
                    />
                ))}
            </Stack>

            <Divider />

            <OrgContext />

            <Tabs
                value={activeTab}
                onChange={(event, value) => setActiveTab(value)}
                sx={{
                    minHeight: 36,
                    [`& .${tabClasses.root}`]: { minHeight: 36, py: 0, fontSize: "0.75rem" }
                }}>
                <Tab label="Roles & Teams" />
                <Tab label={`Privileges (${privileges.length})`} />
            </Tabs>

            {activeTab === 0 && (
                <Box flexGrow={1} minHeight={0} sx={{ overflowY: "auto" }}>
                    {userSecurity && <RolesDisplayList user={userSecurity.user} />}
                    <List
                        dense
                        subheader={
                            <>
                                <b>Teams</b>:
                            </>
                        }
                        sx={{ fontSize: "1.15em" }}>
                        {userSecurity?.teams.map((team) => (
                            <ListItem key={team.teamid} sx={{ display: "list-item", pt: 0, pb: 0 }}>
                                <ListItemText primary={team.name} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {activeTab === 1 && (
                <>
                    <FilterInput fullWidth returnFilterInput={returnFilterInput} placeholder="Filter privileges" />

                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                            Team-inherited depths are reported as Basic.
                        </Typography>
                        <TooltipInfo title={DEPTH_CAVEAT} placement="left" arrow maxWidth={400}>
                            <InfoOutlinedIcon fontSize="small" />
                        </TooltipInfo>
                    </Stack>

                    {privilegesError && (
                        <Typography variant="caption" color="error">
                            {privilegesError}
                        </Typography>
                    )}

                    <Box flexGrow={1} minHeight={0}>
                        <DataGrid
                            rows={filteredPrivileges}
                            columns={PRIVILEGE_COLUMNS}
                            getRowId={(row) => row.privilegeId}
                            loading={isPrivilegesFetching}
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
                </>
            )}
        </Stack>
    );
});

export default UserSecurityProcess;
