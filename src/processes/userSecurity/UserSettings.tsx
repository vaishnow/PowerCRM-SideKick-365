import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatId } from "../../utils/global/common";
import MessageManager from "../../utils/global/MessageManager";
import { useDictionnary } from "../../utils/hooks/use/useDictionnary";
import { RetrieveAppModules } from "../../utils/hooks/XrmApi/RetrieveAppModules";
import { RetrieveAttributes } from "../../utils/hooks/XrmApi/RetrieveAttributes";
import { RetrieveProvisionedLanguages } from "../../utils/hooks/XrmApi/RetrieveProvisionedLanguages";
import { RetrieveRecordsByFilter } from "../../utils/hooks/XrmApi/RetrieveRecordsByFilter";
import { RetrieveSiteMapAreas } from "../../utils/hooks/XrmApi/RetrieveSiteMapAreas";
import { MessageType } from "../../utils/types/Message";

const SETTINGS_FIELDS = [
    "timezonecode",
    "uilanguageid",
    "advancedfindstartupmode",
    "paginglimit",
    "homepagearea",
    "homepagesubarea"
];

const TZ_FIELDS = ["timezonecode", "userinterfacename", "bias"];

// timezonedefinition has no localeid - it is language-neutral, one row per zone. retiredorder filters out dead zones.
const TZ_FILTER = "retiredorder eq 0";

const PAGING_LIMITS = [25, 50, 75, 100, 250];

// advancedfindstartupmode is an Integer column, not a Picklist, so it has no option set to read.
const ADVANCED_FIND_MODES = [
    { value: 1, label: "Simple" },
    { value: 2, label: "Detailed" }
];

function UserSettings(props: { userId: string; isSelf: boolean }) {
    const { userId, isSelf } = props;

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const { dict: changes, keys: changedKeys, setValue, setDict } = useDictionnary<any>({});

    const [settings, isSettingsFetching] = RetrieveAttributes("usersettings", userId, SETTINGS_FIELDS);

    const [timezones] = RetrieveRecordsByFilter("timezonedefinition", TZ_FIELDS, TZ_FILTER, "bias asc");

    const [languages] = RetrieveProvisionedLanguages();

    const [appModules] = RetrieveAppModules();
    const [currentAppId, setCurrentAppId] = useState<string>("");
    const [selectedAppId, setSelectedAppId] = useState<string>("");

    // getCurrentAppProperties is async and fails outside an app context, so treat it as best effort.
    useEffect(() => {
        Xrm.Utility.getGlobalContext()
            .getCurrentAppProperties()
            .then((app: any) => setCurrentAppId(formatId(app?.appId ?? "").toLowerCase()))
            .catch(() => setCurrentAppId(""));
    }, []);

    // Default the picker to the app the user is actually in, once both the id and the app list are known.
    useEffect(() => {
        if (selectedAppId || !currentAppId || appModules.length === 0) return;
        const currentApp = appModules.find((app) => app.appModuleId?.toLowerCase() === currentAppId);
        if (currentApp) setSelectedAppId(currentApp.appModuleId);
    }, [currentAppId, appModules, selectedAppId]);

    const selectedApp = appModules.find((app) => app.appModuleId === selectedAppId);
    const [siteMapAreas] = RetrieveSiteMapAreas(selectedApp?.appModuleIdUnique ?? null);

    // Drop pending edits when another user is selected, so a value typed for yourself is never written to them.
    useEffect(() => {
        setDict({});
    }, [userId, setDict]);

    const valueOf = useCallback(
        (field: string) => changes[field] ?? settings[field] ?? "",
        [changes, settings]
    );

    const pagingOptions = useMemo(() => {
        const current = Number(valueOf("paginglimit"));
        return Array.from(new Set(current ? [...PAGING_LIMITS, current] : PAGING_LIMITS)).sort((a, b) => a - b);
    }, [valueOf]);

    const selectedArea = String(valueOf("homepagearea"));
    const selectedSubArea = String(valueOf("homepagesubarea"));

    // Keep a stored value selectable even when the sitemap does not list it, so opening the tab never silently changes it.
    const areaOptions = useMemo(() => {
        const options = siteMapAreas.map((area) => ({ id: area.id, title: area.title }));
        return selectedArea && !options.some((option) => option.id === selectedArea)
            ? [...options, { id: selectedArea, title: selectedArea }]
            : options;
    }, [siteMapAreas, selectedArea]);

    const subAreaOptions = useMemo(() => {
        const options = siteMapAreas.find((area) => area.id === selectedArea)?.subAreas ?? [];
        return selectedSubArea && !options.some((option) => option.id === selectedSubArea)
            ? [...options, { id: selectedSubArea, title: selectedSubArea }]
            : options;
    }, [siteMapAreas, selectedArea, selectedSubArea]);

    const save = useCallback(() => {
        if (!isSelf || changedKeys.length === 0) return;

        Xrm.Utility.showProgressIndicator("Updating personal settings");
        Xrm.WebApi.online.updateRecord("usersettings", userId, changes).then(
            function success(_result) {
                Xrm.Utility.closeProgressIndicator();
                setDict({});
                enqueueSnackbar("Personal settings updated.", {
                    variant: "success",
                    persist: true,
                    action: (key) => (
                        <>
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => MessageManager.sendMessage(MessageType.REFRESHBYPASSCACHE)}>
                                Reload
                            </Button>
                            <Button color="inherit" size="small" onClick={() => closeSnackbar(key)}>
                                Dismiss
                            </Button>
                        </>
                    )
                });
            },
            function (error) {
                Xrm.Utility.closeProgressIndicator();
                enqueueSnackbar("Updating personal settings has encountered an error.", {
                    variant: "detailsFile",
                    detailsVariant: "error",
                    persist: true,
                    allowDownload: true,
                    detailsNode: (
                        <Typography gutterBottom variant="caption" style={{ color: "#000", display: "block" }}>
                            {`(0x${error.errorCode.toString(16)}) ${error.message}`}
                        </Typography>
                    ),
                    downloadButtonLabel: "Download log file",
                    fileContent: error.raw,
                    fileName: "ErrorDetails.txt"
                });
                console.error(error.message);
            }
        );
    }, [isSelf, changedKeys, changes, userId, setDict, enqueueSnackbar, closeSnackbar]);

    return (
        <Stack flexGrow={1} minHeight={0} spacing={1.5} p={0.5} pt={1.5} sx={{ overflowY: "auto" }}>
            {!isSelf && (
                <Typography variant="caption" color="warning.main">
                    Read-only - settings can only be edited for the signed-in user.
                </Typography>
            )}

            <TextField
                select
                size="small"
                fullWidth
                label="Time Zone"
                disabled={!isSelf}
                value={valueOf("timezonecode")}
                onChange={(event) => setValue("timezonecode", Number(event.target.value))}>
                {timezones.map((timezone: any) => (
                    <MenuItem key={timezone.timezonecode} value={timezone.timezonecode}>
                        {timezone.userinterfacename}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                select
                size="small"
                fullWidth
                label="Language"
                disabled={!isSelf}
                value={valueOf("uilanguageid")}
                onChange={(event) => setValue("uilanguageid", Number(event.target.value))}>
                {languages.map((language) => (
                    <MenuItem key={language.localeid} value={language.localeid}>
                        {language.name}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                select
                size="small"
                fullWidth
                label="Advanced Find Mode"
                disabled={!isSelf}
                value={valueOf("advancedfindstartupmode")}
                onChange={(event) => setValue("advancedfindstartupmode", Number(event.target.value))}>
                {ADVANCED_FIND_MODES.map((mode) => (
                    <MenuItem key={mode.value} value={mode.value}>
                        {mode.label}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                select
                size="small"
                fullWidth
                label="Records Per Page"
                disabled={!isSelf}
                value={valueOf("paginglimit")}
                onChange={(event) => setValue("paginglimit", Number(event.target.value))}>
                {pagingOptions.map((limit) => (
                    <MenuItem key={limit} value={limit}>
                        {limit}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                select
                size="small"
                fullWidth
                label="Sitemap"
                helperText="Which app's navigation the pane and tab lists come from."
                value={selectedAppId}
                onChange={(event) => setSelectedAppId(event.target.value)}>
                <MenuItem value="">Default (classic)</MenuItem>
                {appModules.map((app) => (
                    <MenuItem key={app.appModuleId} value={app.appModuleId}>
                        {app.name}
                        {app.appModuleId.toLowerCase() === currentAppId ? " - current" : ""}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                select
                size="small"
                fullWidth
                label="Default Pane"
                disabled={!isSelf || areaOptions.length === 0}
                helperText={areaOptions.length === 0 ? "Sitemap not readable in this org." : undefined}
                value={selectedArea}
                onChange={(event) => {
                    setValue("homepagearea", event.target.value);
                    // The tab list is scoped to the pane, so the stored tab no longer applies.
                    setValue("homepagesubarea", "");
                }}>
                {areaOptions.map((area) => (
                    <MenuItem key={area.id} value={area.id}>
                        {area.title}
                        {area.title !== area.id ? ` (${area.id})` : ""}
                    </MenuItem>
                ))}
            </TextField>

            <TextField
                select
                size="small"
                fullWidth
                label="Default Tab"
                disabled={!isSelf || !selectedArea || subAreaOptions.length === 0}
                helperText={!selectedArea ? "Select a pane first." : undefined}
                value={selectedSubArea}
                onChange={(event) => setValue("homepagesubarea", event.target.value)}>
                {subAreaOptions.map((subArea) => (
                    <MenuItem key={subArea.id} value={subArea.id}>
                        {subArea.title}
                        {subArea.entity && subArea.entity !== subArea.title ? ` (${subArea.entity})` : ""}
                    </MenuItem>
                ))}
            </TextField>

            {isSelf && (
                <Button
                    variant="contained"
                    onClick={save}
                    disabled={changedKeys.length === 0 || isSettingsFetching}>
                    {changedKeys.length > 0 ? `Save (${changedKeys.length})` : "Save"}
                </Button>
            )}
        </Stack>
    );
}

export default UserSettings;
