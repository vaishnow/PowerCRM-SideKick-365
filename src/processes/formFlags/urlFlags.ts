export const HANDLER_EVENTS = ["true", "onload", "onsave", "onchange", "tabstatechange", "businessrule"] as const;
export type HandlerEvent = (typeof HANDLER_EVENTS)[number];

/** Raw input strings. An empty string means "not specified", which the flag grammar reads as "all". */
export interface IndexRange {
    start: string;
    end: string;
}

export interface FormFlagsState {
    commandbar: boolean;
    handlers: { on: boolean; event: HandlerEvent } & IndexRange;
    libraries: { on: boolean } & IndexRange;
    webResourceControls: boolean;
    control: { on: boolean; name: string };
    businessProcessFlow: boolean;
    navbarOff: boolean;
    ribbonDebug: boolean;
}

export const EMPTY_FLAGS: FormFlagsState = {
    commandbar: false,
    handlers: { on: false, event: "true", start: "", end: "" },
    libraries: { on: false, start: "", end: "" },
    webResourceControls: false,
    control: { on: false, name: "" },
    businessProcessFlow: false,
    navbarOff: false,
    ribbonDebug: false
};

const FLAG_COMMANDBAR = "DisableFormCommandbar";
const FLAG_HANDLERS = "DisableFormHandlers";
const FLAG_LIBRARIES = "DisableFormLibraries";
const FLAG_WEBRESOURCECONTROLS = "DisableWebResourceControls";
const FLAG_CONTROL = "DisableFormControl";
const FLAG_BUSINESSPROCESSFLOW = "DisableBusinessProcessFlow";

const OWNED_PARAMS = ["flags", "navbar", "ribbondebug"];

const CONTROL_NAME_SAFE = /^[\w.\-]+$/;
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
        const name = CONTROL_NAME_SAFE.test(state.control.name)
            ? state.control.name
            : encodeURIComponent(state.control.name);
        pairs.push(`${FLAG_CONTROL}=${name}`);
    }
    if (state.businessProcessFlow) {
        pairs.push(`${FLAG_BUSINESSPROCESSFLOW}=true`);
    }

    return pairs.join(",");
}

/** Flag names are matched case-insensitively on read, but always written with the documented casing. */
function applyFlagPair(state: FormFlagsState, pair: string) {
    const [name, value] = splitPair(pair);

    switch (name.trim().toLowerCase()) {
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
        control: { ...EMPTY_FLAGS.control }
    };

    const entries = new URL(href).search.replace(/^\?/, "").split("&").filter(Boolean);

    entries.forEach((entry) => {
        const [rawName, rawValue] = splitPair(entry);
        const name = safeDecode(rawName).toLowerCase();
        const value = safeDecode(rawValue);

        if (name === "navbar") {
            state.navbarOff = value.toLowerCase() === "off";
        } else if (name === "ribbondebug") {
            state.ribbonDebug = value.toLowerCase() === "true";
        } else if (name === "flags") {
            value
                .split(",")
                .filter(Boolean)
                .forEach((pair) => applyFlagPair(state, pair));
        }
    });

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

    if (state.navbarOff) {
        kept.push("navbar=off");
    }
    if (state.ribbonDebug) {
        kept.push("ribbondebug=true");
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
    if (state.control.on && !state.control.name) {
        return "Form control: select or type a control name.";
    }
    return null;
}

export function countActiveFlags(state: FormFlagsState): number {
    return [
        state.commandbar,
        state.handlers.on,
        state.libraries.on,
        state.webResourceControls,
        state.control.on,
        state.businessProcessFlow,
        state.navbarOff,
        state.ribbonDebug
    ].filter(Boolean).length;
}
