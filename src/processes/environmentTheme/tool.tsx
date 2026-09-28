import DeleteIcon from "@mui/icons-material/Delete";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip, { type TooltipProps } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { forwardRef, useCallback, useEffect, useState } from "react";

import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import {
    defaultEnvironmentTheme,
    EnvironmentType,
    STORAGE_EnvironmentTheme,
    type EnvironmentRule,
    type TYPE_EnvironmentTheme
} from "../../utils/global/environmentType";
import MessageManager from "../../utils/global/MessageManager";
import { MessageType } from "../../utils/types/Message";

class EnvironmentThemeProcess extends ProcessButton {
    static id = "environmenttheme";
    constructor() {
        super("environmenttheme");
        this.process = EnvironmentTheme;
    }
}

const EnvironmentTheme = forwardRef<ProcessRef, ProcessProps>(function EnvironmentThemeProcess(
    props: ProcessProps,
    ref
) {
    const [environmentTheme, setEnvironmentTheme] = useState<TYPE_EnvironmentTheme>(defaultEnvironmentTheme);
    const [configurationSaved, setConfigurationSaved] = useState<boolean>(false);

    useEffect(() => {
        MessageManager.sendMessage(MessageType.GETCONFIGURATION, { key: STORAGE_EnvironmentTheme }).then(function (
            response: TYPE_EnvironmentTheme | null
        ) {
            if (!response) return;
            setEnvironmentTheme({
                ...defaultEnvironmentTheme,
                ...response,
                types: { ...defaultEnvironmentTheme.types, ...response.types }
            });
        });
    }, []);

    const saveConfiguration = useCallback(() => {
        MessageManager.sendMessage(MessageType.SETCONFIGURATION, {
            key: STORAGE_EnvironmentTheme,
            configurations: environmentTheme
        });

        setConfigurationSaved(true);
        setTimeout(() => {
            setConfigurationSaved(false);
        }, 2000);
    }, [environmentTheme]);

    return (
        <Stack direction="column" spacing={1} width="-webkit-fill-available" height="calc(100% - 20px)" padding="10px">
            <Alert severity="info" sx={{ py: 0 }}>
                <Typography variant="body2">
                    The saved configuration will be applied after refreshing the page.
                </Typography>
            </Alert>

            <Button variant="contained" onClick={saveConfiguration}>
                {configurationSaved ? "Saved" : "Save Configuration"}
            </Button>

            <Divider />

            <HelpInfo
                placement="left"
                arrow
                disableInteractive
                title={
                    <Typography variant="body2">
                        Colour the extension panel according to the environment type, so a Production environment is
                        not mistaken for a Sandbox. An environment that cannot be identified uses the Production
                        colour.
                    </Typography>
                }>
                <FormControl fullWidth sx={{ pl: 2 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={environmentTheme.enabled}
                                onChange={() => setEnvironmentTheme((prev) => ({ ...prev, enabled: !prev.enabled }))}
                            />
                        }
                        label="Environment Colours"
                    />
                </FormControl>
            </HelpInfo>

            {environmentTheme.enabled && (
                <Stack direction="column" pl={2} overflow="auto">
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={environmentTheme.tintPanel}
                                onChange={() =>
                                    setEnvironmentTheme((prev) => ({ ...prev, tintPanel: !prev.tintPanel }))
                                }
                            />
                        }
                        label={<Typography variant="body2">Tint the tools bar</Typography>}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={environmentTheme.showLabel}
                                onChange={() =>
                                    setEnvironmentTheme((prev) => ({ ...prev, showLabel: !prev.showLabel }))
                                }
                            />
                        }
                        label={<Typography variant="body2">Show the environment type</Typography>}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={environmentTheme.pageBorder}
                                onChange={() =>
                                    setEnvironmentTheme((prev) => ({ ...prev, pageBorder: !prev.pageBorder }))
                                }
                            />
                        }
                        label={<Typography variant="body2">Border around the Dynamics page</Typography>}
                    />

                    <Typography variant="caption" pt={1}>
                        Detected environment types
                    </Typography>
                    {Object.values(EnvironmentType).map((environmentType) => (
                        <Stack
                            key={`environmentType_${environmentType}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            pr={1}>
                            <Typography variant="body2" width="40%" noWrap>
                                {environmentType}
                            </Typography>
                            <TextField
                                size="small"
                                fullWidth
                                value={environmentTheme.types[environmentType].label}
                                onChange={(event) => {
                                    const label = event.target.value;
                                    setEnvironmentTheme((prev) => ({
                                        ...prev,
                                        types: {
                                            ...prev.types,
                                            [environmentType]: { ...prev.types[environmentType], label: label }
                                        }
                                    }));
                                }}
                            />
                            <input
                                type="color"
                                value={environmentTheme.types[environmentType].color}
                                onChange={(event) => {
                                    const color = event.target.value;
                                    setEnvironmentTheme((prev) => ({
                                        ...prev,
                                        types: {
                                            ...prev.types,
                                            [environmentType]: { ...prev.types[environmentType], color: color }
                                        }
                                    }));
                                }}
                            />
                        </Stack>
                    ))}

                    <HelpInfo
                        placement="left"
                        arrow
                        disableInteractive
                        title={
                            <Typography variant="body2">
                                Dynamics cannot tell a staging environment apart from any other sandbox. A rule matches
                                its text anywhere in the environment name or url, and the first matching rule wins over
                                the detected type. The tools bar tooltip keeps showing the real type.
                            </Typography>
                        }>
                        <Typography variant="caption" pt={1}>
                            Name matching rules
                        </Typography>
                    </HelpInfo>
                    {environmentTheme.rules.map((rule) => (
                        <Stack key={`environmentRule_${rule.id}`} direction="row" spacing={1} alignItems="center">
                            <TextField
                                size="small"
                                fullWidth
                                label="Match"
                                value={rule.match}
                                onChange={(event) => {
                                    const match = event.target.value;
                                    setEnvironmentTheme((prev) => ({
                                        ...prev,
                                        rules: prev.rules.map((r) => (r.id === rule.id ? { ...r, match: match } : r))
                                    }));
                                }}
                            />
                            <TextField
                                size="small"
                                fullWidth
                                label="Text"
                                value={rule.label}
                                onChange={(event) => {
                                    const label = event.target.value;
                                    setEnvironmentTheme((prev) => ({
                                        ...prev,
                                        rules: prev.rules.map((r) => (r.id === rule.id ? { ...r, label: label } : r))
                                    }));
                                }}
                            />
                            <input
                                type="color"
                                value={rule.color}
                                onChange={(event) => {
                                    const color = event.target.value;
                                    setEnvironmentTheme((prev) => ({
                                        ...prev,
                                        rules: prev.rules.map((r) => (r.id === rule.id ? { ...r, color: color } : r))
                                    }));
                                }}
                            />
                            <IconButton
                                size="small"
                                onClick={() =>
                                    setEnvironmentTheme((prev) => ({
                                        ...prev,
                                        rules: prev.rules.filter((r) => r.id !== rule.id)
                                    }))
                                }>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    ))}
                    <Button
                        size="small"
                        onClick={() => {
                            const newRule: EnvironmentRule = {
                                id: crypto.randomUUID(),
                                match: "",
                                label: "",
                                color: "#616161"
                            };
                            setEnvironmentTheme((prev) => ({ ...prev, rules: [...prev.rules, newRule] }));
                        }}>
                        Add rule
                    </Button>
                </Stack>
            )}
        </Stack>
    );
});

function HelpInfo(props: Omit<TooltipProps, "slotProps">) {
    const { children, title, ...otherProps } = props;

    return (
        <Stack direction="row" spacing={2} width="100%" justifyContent="space-between" alignItems="center">
            {children}
            <Tooltip
                {...otherProps}
                title={<Alert severity="info">{title}</Alert>}
                slotProps={{
                    tooltip: {
                        sx: {
                            fontSize: "1.2rem",
                            p: 0,
                            maxWidth: "540px"
                        }
                    },
                    arrow: {
                        sx: {
                            "::before": {
                                bgcolor: "rgb(229, 246, 253)"
                            }
                        }
                    }
                }}>
                <HelpOutlineIcon sx={{ opacity: 0.7 }} />
            </Tooltip>
        </Stack>
    );
}

export default EnvironmentThemeProcess;
