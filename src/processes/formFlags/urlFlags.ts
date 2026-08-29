export const HANDLER_EVENTS = ["true", "onload", "onsave", "onchange", "tabstatechange", "businessrule"] as const;
export type HandlerEvent = (typeof HANDLER_EVENTS)[number];

export const NAVBAR_MODES = ["", "on", "off", "entity", "headeroff"] as const;
export type NavbarMode = (typeof NAVBAR_MODES)[number];

export const TRACE_LEVELS = ["", "Verbose", "Info", "Warn", "Error"] as const;
export type TraceLevel = (typeof TRACE_LEVELS)[number];

export const TRACE_AREAS = [
    "Shim",
    "ClientAPI",
    "Core.Scheduler",
    "Core.Actions.Sync",
    "CustomScripts",
    "CustomControlsFramework",
    "CustomControls",
    "Auth",
    "Core.AssetLoader",
    "WebService",
    "SendRequest",
    "Storage",
    "Core.Boot",
    "LivePersonaCard",
    "CustomPage",
    "AppHostClient",
    "MainPageViewSelector",
    "Collaboration",
    "NativeRendering",
    "perf"
];

/**
 * Curated client-cache feature control bits. `devValue` is the value that turns the cache OFF:
 * the Disable-prefixed bits take true, the Enable, Cache and Prefetch prefixed bits take false.
 */
export const FCB_CACHE_BITS: { name: string; devValue: boolean; label: string }[] = [
    { name: "DisableEsmCache", devValue: true, label: "ESM module cache" },
    { name: "DisableClientSdkCache", devValue: true, label: "Xrm Client SDK object cache" },
    { name: "DisableCacheMainAspxPageForControl", devValue: true, label: "main.aspx cache on control boot" },
    { name: "EnableServiceWorkerDataCache", devValue: false, label: "Service worker data cache" },
    { name: "EnableModernThemeXmlCache", devValue: false, label: "Theme XML cache" },
    { name: "EnableWebResourceMaxVersionUsage", devValue: false, label: "Web resource version pinning" },
    { name: "MdlBootWithCachedValue", devValue: false, label: "Boot from cached state" },
    { name: "KeepGCMCache", devValue: false, label: "Group Config Manager cache" },
    { name: "CacheMainAspxPageWithAppName", devValue: false, label: "main.aspx cache per app" },
    { name: "CacheMainAspxForDashboard", devValue: false, label: "main.aspx cache, dashboards" },
    { name: "CacheMainAspxForAllEntitiesGrid", devValue: false, label: "main.aspx cache, grids" },
    { name: "CacheMainAspxForAllEntitiesForm", devValue: false, label: "main.aspx cache, forms" },
    { name: "PrefetchThemeFeatureCode", devValue: false, label: "Prefetch theme code" },
    { name: "PrefetchControlsCdnMetadata", devValue: false, label: "Prefetch control metadata" },
    { name: "PrefetchWebResourceWithGranularVersion", devValue: false, label: "Prefetch web resources" },
    { name: "PrefetchBPFScript", devValue: false, label: "Prefetch business process flow script" }
];

/** Raw input strings. An empty string means "not specified", which the flag grammar reads as "all". */
export interface IndexRange {
    start: string;
    end: string;
}

export interface FormFlagsState {
    // Form troubleshooting flags, emitted inside flags=
    commandbar: boolean;
    handlers: { on: boolean; event: HandlerEvent } & IndexRange;
    libraries: { on: boolean } & IndexRange;
    webResourceControls: boolean;
    control: { on: boolean; name: string };
    businessProcessFlow: boolean;
    /** Names from FCB_CACHE_BITS that are currently overridden, emitted inside flags= as FCB.<name>. */
    fcbCaches: string[];

    // Top-level query parameters
    navbar: NavbarMode;
    ribbonDebug: boolean;
    perf: boolean;
    telemetry: boolean;
    traceLevel: TraceLevel;
    traceAreas: string[];
    cmdbarOff: boolean;
    sitemapOff: boolean;
    testmode: boolean;
    preview: boolean;
    formReadOnly: boolean;
    cacheOff: boolean;
    secondaryCdn: boolean;
    clientVersion: string;
    buildType: string;
}

export const EMPTY_FLAGS: FormFlagsState = {
    commandbar: false,
    handlers: { on: false, event: "true", start: "", end: "" },
    libraries: { on: false, start: "", end: "" },
    webResourceControls: false,
    control: { on: false, name: "" },
    businessProcessFlow: false,
    fcbCaches: [],
    navbar: "",
    ribbonDebug: false,
    perf: false,
    telemetry: false,
    traceLevel: "",
    traceAreas: [],
    cmdbarOff: false,
    sitemapOff: false,
    testmode: false,
    preview: false,
    formReadOnly: false,
    cacheOff: false,
    secondaryCdn: false,
    clientVersion: "",
    buildType: ""
};

const FLAG_COMMANDBAR = "DisableFormCommandbar";
const FLAG_HANDLERS = "DisableFormHandlers";
const FLAG_LIBRARIES = "DisableFormLibraries";
const FLAG_WEBRESOURCECONTROLS = "DisableWebResourceControls";
const FLAG_CONTROL = "DisableFormControl";
const FLAG_BUSINESSPROCESSFLOW = "DisableBusinessProcessFlow";
const FCB_PREFIX = "FCB.";

/**
 * Lowercased names of every parameter this tool rewrites. Matching is case-insensitive, but each
 * parameter is written back with the exact casing the client reads, which is case-sensitive.
 */
const OWNED_PARAMS = [
    "flags",
    "navbar",
    "ribbondebug",
    "perf",
    "telemetry",
    "defaulttracelevel",
    "traceareas",
    "cmdbar",
    "sitemap",
    "testmode",
    "preview",
    "formreadonly",
    "cache",
    "usesecondarycdnendpoint",
    "clientversion",
    "buildtype"
];

/** Plain flag values are rejected by the client when they contain a non-word character. */
const PLAIN_FLAG_VALUE_SAFE = /^\w+$/;
const PARAM_VALUE_SAFE = /^[\w.\-]+$/;
const INDEX_PATTERN = /^\d+$/;

function safeDecode(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

/** Splits on the first '=' only: flag values contain '=' themselves. */
function splitPair(entry: string): [string, string] {
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex === -1) {
        return [entry, ""];
    }
    return [entry.substring(0, separatorIndex), entry.substring(separatorIndex + 1)];
}

function encodeParamValue(value: string): string {
    return PARAM_VALUE_SAFE.test(value) ? value : encodeURIComponent(value);
}

function rangeValue(range: IndexRange): string {
    if (!range.start) {
        return "";
    }
    return range.end ? `${range.start}_${range.end}` : range.start;
}

export function serializeFlags(state: FormFlagsState): string {
    const pairs: string[] = [];

    if (state.commandbar) {
        pairs.push(`${FLAG_COMMANDBAR}=true`);
    }
    if (state.handlers.on) {
        const range = rangeValue(state.handlers);
        pairs.push(`${FLAG_HANDLERS}=${state.handlers.event}${range ? `_${range}` : ""}`);
    }
    if (state.libraries.on) {
        pairs.push(`${FLAG_LIBRARIES}=${rangeValue(state.libraries) || "true"}`);
    }
    if (state.webResourceControls) {
        pairs.push(`${FLAG_WEBRESOURCECONTROLS}=true`);
    }
    if (state.control.on && state.control.name) {
        pairs.push(`${FLAG_CONTROL}=${state.control.name}`);
    }
    if (state.businessProcessFlow) {
        pairs.push(`${FLAG_BUSINESSPROCESSFLOW}=true`);
    }

    FCB_CACHE_BITS.forEach((bit) => {
        if (state.fcbCaches.includes(bit.name)) {
            pairs.push(`${FCB_PREFIX}${bit.name}=${bit.devValue}`);
        }
    });

    return pairs.join(",");
}

/** Flag names are matched case-insensitively on read, but always written with the documented casing. */
function applyFlagPair(state: FormFlagsState, pair: string) {
    const [rawName, value] = splitPair(pair);
    const name = rawName.trim();

    if (name.toLowerCase().startsWith(FCB_PREFIX.toLowerCase())) {
        const bitName = name.substring(FCB_PREFIX.length);
        const bit = FCB_CACHE_BITS.find((b) => b.name === bitName);
        if (bit && value.toLowerCase() === String(bit.devValue)) {
            state.fcbCaches = [...state.fcbCaches, bit.name];
        }
        return;
    }

    switch (name.toLowerCase()) {
        case "disableformcommandbar":
            state.commandbar = true;
            break;
        case "disableformhandlers": {
            const [event = "true", start = "", end = ""] = value.split("_");
            state.handlers = {
                on: true,
                event: (HANDLER_EVENTS as readonly string[]).includes(event) ? (event as HandlerEvent) : "true",
                start,
                end
            };
            break;
        }
        case "disableformlibraries": {
            const [start = "", end = ""] = value.split("_");
            state.libraries = start === "true" ? { on: true, start: "", end: "" } : { on: true, start, end };
            break;
        }
        case "disablewebresourcecontrols":
            state.webResourceControls = true;
            break;
        case "disableformcontrol":
            state.control = { on: true, name: value };
            break;
        case "disablebusinessprocessflow":
            state.businessProcessFlow = true;
            break;
    }
}

export function parseFlagsUrl(href: string): FormFlagsState {
    const state: FormFlagsState = {
        ...EMPTY_FLAGS,
        handlers: { ...EMPTY_FLAGS.handlers },
        libraries: { ...EMPTY_FLAGS.libraries },
        control: { ...EMPTY_FLAGS.control },
        fcbCaches: [],
        traceAreas: []
    };

    const entries = new URL(href).search.replace(/^\?/, "").split("&").filter(Boolean);

    entries.forEach((entry) => {
        const [rawName, rawValue] = splitPair(entry);
        const name = safeDecode(rawName).toLowerCase();
        const value = safeDecode(rawValue);
        const lowerValue = value.toLowerCase();

        switch (name) {
            case "flags":
                value
                    .split(",")
                    .filter(Boolean)
                    .forEach((pair) => applyFlagPair(state, pair));
                break;
            case "navbar":
                state.navbar = (NAVBAR_MODES as readonly string[]).includes(lowerValue)
                    ? (lowerValue as NavbarMode)
                    : "";
                break;
            case "ribbondebug":
                state.ribbonDebug = lowerValue === "true";
                break;
            case "perf":
                state.perf = lowerValue === "true";
                break;
            case "telemetry":
                state.telemetry = lowerValue === "true";
                break;
            case "defaulttracelevel":
                state.traceLevel = (TRACE_LEVELS as readonly string[]).includes(value) ? (value as TraceLevel) : "";
                break;
            case "traceareas":
                state.traceAreas = value.split(",").filter((area) => TRACE_AREAS.includes(area));
                break;
            case "cmdbar":
                state.cmdbarOff = lowerValue === "false";
                break;
            case "sitemap":
                state.sitemapOff = lowerValue === "false";
                break;
            case "testmode":
                state.testmode = lowerValue === "true";
                break;
            case "preview":
                state.preview = lowerValue === "true";
                break;
            case "formreadonly":
                state.formReadOnly = lowerValue === "true";
                break;
            case "cache":
                state.cacheOff = lowerValue === "false";
                break;
            case "usesecondarycdnendpoint":
                state.secondaryCdn = lowerValue === "true";
                break;
            case "clientversion":
                state.clientVersion = value;
                break;
            case "buildtype":
                state.buildType = value;
                break;
        }
    });

    // The client ignores formReadOnly unless preview is also set.
    state.formReadOnly = state.formReadOnly && state.preview;

    return state;
}

/**
 * Rebuilds the query string by hand instead of using URLSearchParams: round-tripping through
 * URLSearchParams re-encodes every other parameter, turning the %20 inside D365's pre-encoded
 * extraqs/data blobs into '+', and it percent-encodes the '=' and ',' the flags grammar needs
 * literally. Only the parameters this tool owns are touched, every other one is re-emitted as-is.
 */
export function buildFlagsUrl(href: string, state: FormFlagsState): string {
    const url = new URL(href);
    const kept = url.search
        .replace(/^\?/, "")
        .split("&")
        .filter(Boolean)
        .filter((entry) => !OWNED_PARAMS.includes(safeDecode(splitPair(entry)[0]).toLowerCase()));

    if (state.navbar) {
        kept.push(`navbar=${state.navbar}`);
    }
    if (state.ribbonDebug) {
        kept.push("ribbondebug=true");
    }
    if (state.perf) {
        kept.push("perf=true");
    }
    if (state.telemetry) {
        kept.push("telemetry=true");
    }
    if (state.traceLevel) {
        kept.push(`defaulttracelevel=${state.traceLevel}`);
    }
    if (state.traceAreas.length) {
        kept.push(`traceareas=${state.traceAreas.join(",")}`);
    }
    if (state.cmdbarOff) {
        kept.push("cmdbar=false");
    }
    if (state.sitemapOff) {
        kept.push("sitemap=false");
    }
    if (state.testmode) {
        kept.push("testmode=true");
    }
    if (state.preview) {
        kept.push("preview=true");
    }
    if (state.preview && state.formReadOnly) {
        kept.push("formReadOnly=true");
    }
    if (state.cacheOff) {
        kept.push("cache=false");
    }
    if (state.secondaryCdn) {
        kept.push("useSecondaryCdnEndpoint=true");
    }
    if (state.clientVersion) {
        kept.push(`clientVersion=${encodeParamValue(state.clientVersion)}`);
    }
    if (state.buildType) {
        kept.push(`buildType=${encodeParamValue(state.buildType)}`);
    }
    const flags = serializeFlags(state);
    if (flags) {
        kept.push(`flags=${flags}`);
    }

    url.search = kept.length ? `?${kept.join("&")}` : "";
    return url.toString();
}

export function validateRange(range: IndexRange): string | null {
    if (range.start && !INDEX_PATTERN.test(range.start)) {
        return "Index must be a number.";
    }
    if (range.end && !INDEX_PATTERN.test(range.end)) {
        return "End index must be a number.";
    }
    if (range.end && !range.start) {
        return "An end index requires a start index.";
    }
    if (range.start && range.end && Number(range.end) < Number(range.start)) {
        return "End index must be greater than or equal to the start index.";
    }
    return null;
}

export function validateControlName(name: string): string | null {
    if (!name) {
        return "Select or type a control name.";
    }
    if (!PLAIN_FLAG_VALUE_SAFE.test(name)) {
        return "Only letters, digits and underscores. The client rejects any other character.";
    }
    return null;
}

export function validateFlags(state: FormFlagsState): string | null {
    if (state.handlers.on) {
        const error = validateRange(state.handlers);
        if (error) {
            return `Form handlers: ${error}`;
        }
    }
    if (state.libraries.on) {
        const error = validateRange(state.libraries);
        if (error) {
            return `Form libraries: ${error}`;
        }
    }
    if (state.control.on) {
        const error = validateControlName(state.control.name);
        if (error) {
            return `Form control: ${error}`;
        }
    }
    return null;
}

export function countActiveFlags(state: FormFlagsState): number {
    const booleans = [
        state.commandbar,
        state.handlers.on,
        state.libraries.on,
        state.webResourceControls,
        state.control.on,
        state.businessProcessFlow,
        !!state.navbar,
        state.ribbonDebug,
        state.perf,
        state.telemetry,
        !!state.traceLevel,
        state.traceAreas.length > 0,
        state.cmdbarOff,
        state.sitemapOff,
        state.testmode,
        state.preview,
        state.formReadOnly,
        state.cacheOff,
        state.secondaryCdn,
        !!state.clientVersion,
        !!state.buildType,
        state.fcbCaches.length > 0
    ];
    return booleans.filter(Boolean).length;
}
