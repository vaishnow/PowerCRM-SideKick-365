import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip, { type TooltipProps } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";

import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import {
    BarStyle,
    defaultEnvironmentTheme,
    getEnvironmentDefaultStyle,
    STORAGE_EnvironmentTheme,
    type EnvironmentStyle,
    type TYPE_EnvironmentTheme
} from "../../utils/global/environmentType";
import MessageManager from "../../utils/global/MessageManager";
import { useEnvironment } from "../../utils/hooks/use/useEnvironment";
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
    const environment = useEnvironment();

    const [environmentTheme, setEnvironmentTheme] = useState<TYPE_EnvironmentTheme>(defaultEnvironmentTheme);
    const [style, setStyle] = useState<EnvironmentStyle | null>(null);
    const [configurationSaved, setConfigurationSaved] = useState<boolean>(false);

    useEffect(() => {
        MessageManager.sendMessage(MessageType.GETCONFIGURATION, { key: STORAGE_EnvironmentTheme }).then(function (
            response: TYPE_EnvironmentTheme | null
        ) {
            if (!response) return;
            setEnvironmentTheme({ ...defaultEnvironmentTheme, ...response });
        });
    }, []);

    const defaultStyle = useMemo(() => getEnvironmentDefaultStyle(environment), [environment]);

    // The editor only opens once the environment is known, otherwise it would edit the wrong url.
    useEffect(() => {
        if (!environment) return;
        setStyle({ ...defaultStyle, ...environmentTheme.overrides[environment.url] });
    }, [environment, defaultStyle, environmentTheme]);

    const saveConfiguration = useCallback(
        (override: EnvironmentStyle | null) => {
            if (!environment) return;

            const overrides = { ...environmentTheme.overrides };
            if (override) {
                overrides[environment.url] = override;
            } else {
                delete overrides[environment.url];
            }

            const updatedTheme = { ...environmentTheme, overrides: overrides };
            setEnvironmentTheme(updatedTheme);
            MessageManager.sendMessage(MessageType.SETCONFIGURATION, {
                key: STORAGE_EnvironmentTheme,
                configurations: updatedTheme
            });

            setConfigurationSaved(true);
            setTimeout(() => {
                setConfigurationSaved(false);
            }, 2000);
        },
        [environment, environmentTheme]
    );

    const setEnabled = useCallback(
        (enabled: boolean) => {
            const updatedTheme = { ...environmentTheme, enabled: enabled };
            setEnvironmentTheme(updatedTheme);
            MessageManager.sendMessage(MessageType.SETCONFIGURATION, {
                key: STORAGE_EnvironmentTheme,
                configurations: updatedTheme
            });
        },
        [environmentTheme]
    );

    return (
        <Stack direction="column" spacing={1} width="-webkit-fill-available" height="calc(100% - 20px)" padding="10px">
            <Alert severity="info" sx={{ py: 0 }}>
                <Typography variant="body2">
                    The saved configuration will be applied after refreshing the page.
                </Typography>
            </Alert>

            <HelpInfo
                placement="left"
                arrow
                disableInteractive
                title={
                    <Typography variant="body2">
                        Colour the extension panel according to the environment, so a Production environment is not
                        mistaken for a Sandbox. An environment that cannot be identified uses the Production colour.
                    </Typography>
                }>
                <FormControl fullWidth sx={{ pl: 2 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={environmentTheme.enabled}
                                onChange={(event) => setEnabled(event.target.checked)}
                            />
                        }
                        label="Environment Colours"
                    />
                </FormControl>
            </HelpInfo>

            <Divider />

            {!environment && <Typography variant="body2">Identifying the current environment...</Typography>}

            {environment && style && (
                <Stack direction="column" spacing={1} overflow="auto">
                    <Typography variant="caption">Settings for this environment only</Typography>
                    <Typography variant="body2" fontWeight="bold">
                        {environment.friendlyName}
                    </Typography>
                    <Typography variant="caption" sx={{ wordBreak: "break-all" }}>
                        {environment.url}
                    </Typography>
                    <Typography variant="caption">Detected as {environment.type}</Typography>

                    <Stack direction="row" spacing={1} alignItems="center" pt={1}>
                        <TextField
                            size="small"
                            fullWidth
                            label="Text"
                            value={style.label}
                            onChange={(event) => setStyle({ ...style, label: event.target.value })}
                        />
                        <input
                            type="color"
                            value={style.color}
                            onChange={(event) => setStyle({ ...style, color: event.target.value })}
                        />
                    </Stack>

                    <TextField
                        select
                        size="small"
                        fullWidth
                        label="Tools bar"
                        value={style.barStyle}
                        onChange={(event) => setStyle({ ...style, barStyle: event.target.value as BarStyle })}>
                        <MenuItem value={BarStyle.None}>None</MenuItem>
                        <MenuItem value={BarStyle.Tint}>Tint</MenuItem>
                        <MenuItem value={BarStyle.Solid}>Solid colour</MenuItem>
                    </TextField>

                    <FormControlLabel
                        control={
                            <Checkbox
                                size="small"
                                checked={style.showLabel}
                                onChange={(event) => setStyle({ ...style, showLabel: event.target.checked })}
                            />
                        }
                        label={<Typography variant="body2">Show the text in the tools bar</Typography>}
                    />
                    <Stack direction="column" pr={1}>
                        <Typography variant="body2">
                            Border around the Dynamics page: {style.borderWidth}px
                        </Typography>
                        <Slider
                            size="small"
                            min={0}
                            max={10}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                            value={style.borderWidth}
                            onChange={(event, value) => setStyle({ ...style, borderWidth: value as number })}
                        />
                    </Stack>

                    <Button variant="contained" onClick={() => saveConfiguration(style)}>
                        {configurationSaved ? "Saved" : "Save for this environment"}
                    </Button>
                    <Button
                        size="small"
                        onClick={() => {
                            setStyle(defaultStyle);
                            saveConfiguration(null);
                        }}>
                        Reset to detected default
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
