import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
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
    FCB_CACHE_BITS,
    HANDLER_EVENTS,
    NAVBAR_MODES,
    parseFlagsUrl,
    serializeFlags,
    TRACE_AREAS,
    TRACE_LEVELS,
    validateControlName,
    validateFlags,
    validateRange,
    type FormFlagsState,
    type HandlerEvent,
    type IndexRange,
    type NavbarMode,
    type TraceLevel
} from "./urlFlags";

class FormFlagsProcess extends ProcessButton {
    static id = "formflags";
    constructor() {
        super("formflags");
        this.process = FormFlagsButtonProcess;
    }
}

const ALL_FCB_CACHE_NAMES = FCB_CACHE_BITS.map((bit) => bit.name);

function Section(props: { title: string; children: ReactNode }) {
    return (
        <Stack pt={1}>
            <Typography variant="overline" color="text.secondary" lineHeight={1.6}>
                {props.title}
            </Typography>
            <Stack divider={<Divider />}>{props.children}</Stack>
        </Stack>
    );
}

function FlagRow(props: {
    label: string;
    checked: boolean;
    onToggle: (checked: boolean) => void;
    disabled?: boolean;
    children?: ReactNode;
}) {
    const { label, checked, onToggle, disabled, children } = props;

    return (
        <Stack>
            <FormControlLabel
                control={<Switch checked={checked} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} />}
                label={label}
            />
            {children && (
                <Collapse in={checked}>
                    <Stack direction="row" spacing={1} pl={4} pb={1} alignItems="flex-start" flexWrap="wrap">
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

            <Stack flex={1} sx={{ overflowY: "auto", overflowX: "hidden" }}>
                <Section title="Form components">
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
                                    error={!!validateControlName(pending.control.name)}
                                    helperText={
                                        validateControlName(pending.control.name) ??
                                        (controlNames.length === 0
                                            ? "No form controls detected - type a control name."
                                            : undefined)
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
                </Section>

                <Section title="App chrome">
                    <FlagRow
                        label="Override navigation bar"
                        checked={!!pending.navbar}
                        onToggle={(v) => setFlag("navbar", v ? "off" : "")}>
                        <TextField
                            select
                            size="small"
                            label="Mode"
                            value={pending.navbar}
                            onChange={(e) => setFlag("navbar", e.target.value as NavbarMode)}
                            sx={{ width: 160 }}>
                            {NAVBAR_MODES.filter(Boolean).map((mode) => (
                                <MenuItem key={mode} value={mode}>
                                    {mode}
                                </MenuItem>
                            ))}
                        </TextField>
                    </FlagRow>

                    <FlagRow
                        label="Hide app command bar"
                        checked={pending.cmdbarOff}
                        onToggle={(v) => setFlag("cmdbarOff", v)}
                    />

                    <FlagRow label="Hide sitemap" checked={pending.sitemapOff} onToggle={(v) => setFlag("sitemapOff", v)} />

                    <FlagRow
                        label="Default app mode (testmode)"
                        checked={pending.testmode}
                        onToggle={(v) => setFlag("testmode", v)}
                    />
                </Section>

                <Section title="Diagnostics">
                    <FlagRow
                        label="Command Checker"
                        checked={pending.ribbonDebug}
                        onToggle={(v) => setFlag("ribbonDebug", v)}
                    />

                    <FlagRow label="Performance overlay" checked={pending.perf} onToggle={(v) => setFlag("perf", v)} />

                    <FlagRow
                        label="Telemetry stream"
                        checked={pending.telemetry}
                        onToggle={(v) => setFlag("telemetry", v)}
                    />

                    <FlagRow
                        label="Console tracing"
                        checked={!!pending.traceLevel}
                        onToggle={(v) => setFlag("traceLevel", v ? "Verbose" : "")}>
                        <Stack spacing={1} width="100%">
                            <TextField
                                select
                                size="small"
                                label="Level"
                                value={pending.traceLevel}
                                onChange={(e) => setFlag("traceLevel", e.target.value as TraceLevel)}
                                sx={{ width: 160 }}>
                                {TRACE_LEVELS.filter(Boolean).map((level) => (
                                    <MenuItem key={level} value={level}>
                                        {level}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Autocomplete
                                multiple
                                size="small"
                                options={TRACE_AREAS}
                                value={pending.traceAreas}
                                onChange={(_, value) => setFlag("traceAreas", value)}
                                renderInput={(params) => (
                                    <TextField {...params} label="Areas" helperText="Empty traces every area." />
                                )}
                            />
                        </Stack>
                    </FlagRow>
                </Section>

                <Section title="Preview">
                    <FlagRow
                        label="Preview mode"
                        checked={pending.preview}
                        onToggle={(v) =>
                            setPending((prev) => ({ ...prev, preview: v, formReadOnly: v && prev.formReadOnly }))
                        }
                    />

                    <FlagRow
                        label="Read-only form"
                        checked={pending.formReadOnly}
                        disabled={!pending.preview}
                        onToggle={(v) => setFlag("formReadOnly", v)}
                    />
                </Section>

                <Section title="Caching">
                    <FlagRow
                        label="Disable client cache"
                        checked={pending.cacheOff}
                        onToggle={(v) => setFlag("cacheOff", v)}
                    />

                    <FlagRow
                        label="Disable individual caches"
                        checked={pending.fcbCaches.length > 0}
                        onToggle={(v) => setFlag("fcbCaches", v ? ALL_FCB_CACHE_NAMES : [])}>
                        <Stack>
                            {FCB_CACHE_BITS.map((bit) => (
                                <FormControlLabel
                                    key={bit.name}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={pending.fcbCaches.includes(bit.name)}
                                            onChange={(e) =>
                                                setFlag(
                                                    "fcbCaches",
                                                    e.target.checked
                                                        ? [...pending.fcbCaches, bit.name]
                                                        : pending.fcbCaches.filter((name) => name !== bit.name)
                                                )
                                            }
                                        />
                                    }
                                    label={<Typography variant="body2">{bit.label}</Typography>}
                                />
                            ))}
                        </Stack>
                    </FlagRow>

                    <FlagRow
                        label="Force secondary CDN"
                        checked={pending.secondaryCdn}
                        onToggle={(v) => setFlag("secondaryCdn", v)}>
                        <Alert severity="warning" sx={{ width: "100%" }}>
                            <Typography variant="body2">
                                Presetting this disables the automatic CDN failover and reload for the rest of the
                                session.
                            </Typography>
                        </Alert>
                    </FlagRow>

                    <FlagRow
                        label="Re-register service worker"
                        checked={!!pending.clientVersion || !!pending.buildType}
                        onToggle={(v) =>
                            setPending((prev) => ({
                                ...prev,
                                clientVersion: v ? `devbust-${new Date().toISOString().replace(/[:.]/g, "-")}` : "",
                                buildType: v ? prev.buildType : ""
                            }))
                        }>
                        <Stack spacing={1} width="100%">
                            <Alert severity="warning">
                                <Typography variant="body2">
                                    These values become part of the service worker registration URL, so the new
                                    registration and its cache outlive this tab. Clearing them here does not remove it:
                                    unregister the worker in DevTools, Application, Service Workers.
                                </Typography>
                            </Alert>
                            <TextField
                                size="small"
                                label="clientVersion"
                                value={pending.clientVersion}
                                onChange={(e) => setFlag("clientVersion", e.target.value)}
                            />
                            <TextField
                                size="small"
                                label="buildType"
                                value={pending.buildType}
                                onChange={(e) => setFlag("buildType", e.target.value)}
                            />
                        </Stack>
                    </FlagRow>
                </Section>
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
