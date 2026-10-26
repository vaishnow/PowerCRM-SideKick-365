import PersonIcon from "@mui/icons-material/Person";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useBoolean } from "usehooks-ts";

import type { WriteSettings } from "../global/dataverseRequest";
import { RetrieveActiveUsersWithSecurityRoles } from "../hooks/XrmApi/RetrieveActiveUsersWithSecurityRoles";
import type { ActiveUser } from "../types/ActiveUser";
import DropDownButton from "./DropDownButton";

const bypassOptionsLabels: { key: keyof WriteSettings; label: string }[] = [
    { key: "bypassCustomSync", label: "Sync custom logic" },
    { key: "bypassCustomAsync", label: "Async custom logic" },
    { key: "suppressDuplicateDetection", label: "Duplicate detection" },
    { key: "suppressFlows", label: "Power Automate flows" }
];

function ImpersonationPicker(props: {
    impersonateUser: ActiveUser | null;
    setImpersonateUser: (user: ActiveUser | null) => void;
}) {
    const { impersonateUser, setImpersonateUser } = props;
    const isOnPrem = useMemo(() => (Xrm.Utility.getGlobalContext() as any).isOnPremises(), []);
    const { activeUsers, isFetching } = RetrieveActiveUsersWithSecurityRoles(!isOnPrem);

    return (
        <Autocomplete
            size="small"
            fullWidth
            options={activeUsers}
            loading={isFetching}
            value={impersonateUser}
            onChange={(_event, value) => setImpersonateUser(value)}
            getOptionLabel={(user) => user.fullname ?? user.systemuserid}
            isOptionEqualToValue={(option, value) => option.systemuserid === value.systemuserid}
            renderInput={(params) => <TextField {...params} label="Impersonate" />}
        />
    );
}

type RequestSettingsBarProps = {
    settings: WriteSettings;
    setSettings: Dispatch<SetStateAction<WriteSettings>>;
    /** Hidden where there is no legacy Xrm.WebApi equivalent to fall back to. */
    hideMethodToggle?: boolean;
};

/**
 * Write method plus the bypass and impersonation headers.
 * Everything but the method toggle only applies on the "new" (fetch) method, since
 * Xrm.WebApi cannot send request headers.
 */
export default function RequestSettingsBar(props: RequestSettingsBarProps) {
    const { settings, setSettings, hideMethodToggle } = props;
    const isLegacy = !hideMethodToggle && settings.method === "legacy";
    const { value: isImpersonationOpen, toggle: toggleImpersonation } = useBoolean(false);

    return (
        <>
            <Stack direction="row" spacing={1} width="100%" alignItems="center" whiteSpace="nowrap">
                {!hideMethodToggle && (
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={settings.method}
                        onChange={(_event, method: WriteSettings["method"] | null) =>
                            method && setSettings((current) => ({ ...current, method }))
                        }>
                        <ToggleButton value="legacy">Legacy</ToggleButton>
                        <ToggleButton value="new">New</ToggleButton>
                    </ToggleButtonGroup>
                )}

                <DropDownButton
                    variant="outlined"
                    title="Bypass"
                    sx={{ opacity: isLegacy ? 0.5 : 1 }}
                    options={bypassOptionsLabels.map(({ key, label }) => ({
                        id: key,
                        disabled: isLegacy,
                        title: (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Checkbox size="small" checked={!!settings[key]} sx={{ p: 0 }} />
                                <span>{label}</span>
                            </Stack>
                        ),
                        onClick: () => setSettings((current) => ({ ...current, [key]: !current[key] }))
                    }))}
                />

                <Tooltip title="Per request impersonation. Global Impersonation overrides this, turn it off first.">
                    <span>
                        <IconButton
                            size="small"
                            color={settings.impersonateUser ? "primary" : "default"}
                            disabled={isLegacy}
                            onClick={toggleImpersonation}>
                            <PersonIcon />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            {!isLegacy && isImpersonationOpen && (
                <ImpersonationPicker
                    impersonateUser={settings.impersonateUser}
                    setImpersonateUser={(user) => setSettings((current) => ({ ...current, impersonateUser: user }))}
                />
            )}
        </>
    );
}
