import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { forwardRef, useEffect, useMemo, useState, type ReactNode } from "react";

import DontShowInfo from "../../utils/components/DontShowInfo";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import { useFormContextDocument } from "../../utils/hooks/use/useFormContextDocument";
import {
    buildFlagsUrl,
    countActiveFlags,
    EMPTY_FLAGS,
    HANDLER_EVENTS,
    parseFlagsUrl,
    serializeFlags,
    validateFlags,
    validateRange,
    type FormFlagsState,
    type HandlerEvent,
    type IndexRange
} from "./urlFlags";

class FormFlagsProcess extends ProcessButton {
    static id = "formflags";
    constructor() {
        super("formflags");
        this.process = FormFlagsButtonProcess;
    }
}

function FlagRow(props: { label: string; checked: boolean; onToggle: (checked: boolean) => void; children?: ReactNode }) {
    const { label, checked, onToggle, children } = props;

    return (
        <Stack>
            <FormControlLabel
                control={<Switch checked={checked} onChange={(e) => onToggle(e.target.checked)} />}
                label={label}
            />
            {children && (
                <Collapse in={checked}>
                    <Stack direction="row" spacing={1} pl={4} pb={1} alignItems="flex-start">
                        {children}
                    </Stack>
                </Collapse>
            )}
        </Stack>
    );
}

function IndexRangeFields(props: { range: IndexRange; onChange: (range: IndexRange) => void; error: string | null }) {
    const { range, onChange, error } = props;

    return (
        <>
            <TextField
                size="small"
                label="Index"
                value={range.start}
                onChange={(e) => onChange({ ...range, start: e.target.value })}
                error={!!error}
                helperText={error}
                sx={{ width: 100 }}
            />
            <TextField
                size="small"
                label="End"
                value={range.end}
                onChange={(e) => onChange({ ...range, end: e.target.value })}
                error={!!error}
                sx={{ width: 100 }}
            />
        </>
    );
}

const FormFlagsButtonProcess = forwardRef<ProcessRef, ProcessProps>(function FormFlagsButtonProcess(
    props: ProcessProps,
    ref
) {
    const { formContext, d365MainAndIframeUpdated } = useFormContextDocument();

    const [pending, setPending] = useState<FormFlagsState>(() => parseFlagsUrl(window.location.href));

    const nextUrl = useMemo(
        () => buildFlagsUrl(window.location.href, pending),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pending, d365MainAndIframeUpdated]
    );
    const isDirty = nextUrl !== window.location.href;
    const error = validateFlags(pending);

    const controlNames = useMemo(() => {
        if (!formContext) {
            return [];
        }
        const controls: Xrm.Controls.Control[] = formContext.getControl();
        return (controls ?? [])
            .map((c) => c.getName())
            .filter(Boolean)
            .sort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formContext, d365MainAndIframeUpdated]);

    // The app drops these parameters when navigating inside the SPA: resync so the panel never
    // claims a flag is still active, but keep staged edits.
    useEffect(() => {
        const current = parseFlagsUrl(window.location.href);
        props.setBadge(countActiveFlags(current) || null);
        if (!isDirty) {
            setPending(current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [d365MainAndIframeUpdated]);

    const setFlag = <K extends keyof FormFlagsState>(key: K, value: FormFlagsState[K]) =>
        setPending((prev) => ({ ...prev, [key]: value }));

    return (
        <Stack height="calc(100% - 10px)" padding="10px" spacing={1}>
            <DontShowInfo storageName={`${props.id}-maininfo`}>
                <Typography variant="body2">
                    These parameters only affect this browser tab and never change customizations. Applying reloads the
                    page: save your form changes first.
                </Typography>
            </DontShowInfo>

            <Stack flex={1} sx={{ overflowY: "auto", overflowX: "hidden" }} divider={<Divider />}>
                <FlagRow
                    label="Disable command bar"
                    checked={pending.commandbar}
                    onToggle={(v) => setFlag("commandbar", v)}
                />

                <FlagRow
                    label="Disable form handlers"
                    checked={pending.handlers.on}
                    onToggle={(v) => setFlag("handlers", { ...pending.handlers, on: v })}>
                    <TextField
                        select
                        size="small"
                        label="Event"
                        value={pending.handlers.event}
                        onChange={(e) =>
                            setFlag("handlers", { ...pending.handlers, event: e.target.value as HandlerEvent })
                        }
                        sx={{ width: 160 }}>
                        {HANDLER_EVENTS.map((event) => (
                            <MenuItem key={event} value={event}>
                                {event === "true" ? "All events" : event}
                            </MenuItem>
                        ))}
                    </TextField>
                    <IndexRangeFields
                        range={pending.handlers}
                        onChange={(range) => setFlag("handlers", { ...pending.handlers, ...range })}
                        error={validateRange(pending.handlers)}
                    />
                </FlagRow>

                <FlagRow
                    label="Disable form libraries"
                    checked={pending.libraries.on}
                    onToggle={(v) => setFlag("libraries", { ...pending.libraries, on: v })}>
                    <IndexRangeFields
                        range={pending.libraries}
                        onChange={(range) => setFlag("libraries", { ...pending.libraries, ...range })}
                        error={validateRange(pending.libraries)}
                    />
                </FlagRow>

                <FlagRow
                    label="Disable web resource controls"
                    checked={pending.webResourceControls}
                    onToggle={(v) => setFlag("webResourceControls", v)}
                />

                <FlagRow
                    label="Disable a form control"
                    checked={pending.control.on}
                    onToggle={(v) => setFlag("control", { ...pending.control, on: v })}>
                    <Autocomplete
                        freeSolo
                        size="small"
                        fullWidth
                        options={controlNames}
                        inputValue={pending.control.name}
                        onInputChange={(_, value) => setFlag("control", { ...pending.control, name: value })}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Control name"
                                error={!pending.control.name}
                                helperText={
                                    !pending.control.name
                                        ? "Select or type a control name."
                                        : controlNames.length === 0
                                          ? "No form controls detected - type a control name."
                                          : undefined
                                }
                            />
                        )}
                    />
                </FlagRow>

                <FlagRow
                    label="Disable business process flows"
                    checked={pending.businessProcessFlow}
                    onToggle={(v) => setFlag("businessProcessFlow", v)}
                />

                <FlagRow label="Hide navigation bar" checked={pending.navbarOff} onToggle={(v) => setFlag("navbarOff", v)} />

                <FlagRow
                    label="Command Checker"
                    checked={pending.ribbonDebug}
                    onToggle={(v) => setFlag("ribbonDebug", v)}
                />
            </Stack>

            <Divider />

            <Typography variant="caption" sx={{ wordBreak: "break-all" }}>
                {serializeFlags(pending) || "No flags"}
            </Typography>

            <Stack direction="row" spacing={1}>
                <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setPending(EMPTY_FLAGS)}
                    disabled={countActiveFlags(pending) === 0}>
                    Clear all
                </Button>
                <Button
                    variant="contained"
                    fullWidth
                    color={isDirty ? "warning" : "primary"}
                    onClick={() => window.location.replace(nextUrl)}
                    disabled={!isDirty || !!error}>
                    Apply &amp; Reload
                </Button>
            </Stack>
        </Stack>
    );
});

export default FormFlagsProcess;
