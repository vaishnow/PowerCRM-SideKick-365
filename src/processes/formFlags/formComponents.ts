import { debugError } from "../../utils/global/common";
import type { FormContext } from "../../utils/types/FormContext";
import type { HandlerEvent, IndexRange } from "./urlFlags";

export interface HandlerEntry {
    index: number;
    group: string;
    functionName: string;
    libraryName: string;
    enabled: boolean;
}

export interface LibraryEntry {
    index: number;
    name: string;
}

export interface BusinessRuleEntry {
    index: number;
    name: string;
    functionName: string;
}

export interface FormComponents {
    libraries: LibraryEntry[];
    /** Keyed by the platform's group key: "onload", "onchange for accountnumber", ... */
    handlerGroups: Record<string, HandlerEntry[]>;
    /** null when the frame probe found no unambiguous answer. */
    businessRules: BusinessRuleEntry[] | null;
}

/** Events covered by DisableFormHandlers=true. */
const ALL_EVENTS = ["onload", "onsave", "onchange", "businessrule", "tabstatechange", "onpostsave"];

const FRAME_SELECTOR = '[id^="ClientApiFrame"]:not([id*="crm_header_global"]):not([id*="id"])';

function normalizeFormId(value: string): string {
    return value.replace(/[{}]/g, "").toLowerCase();
}

/** The store lives on a global whose name is itself held in a global. Undocumented, so stay defensive. */
function readStoreState(): any {
    const storeName = (window as any).DoNotUse__RandomSuffixStoreName;
    return storeName ? (window as any)[storeName]?.getState?.() : undefined;
}

function findFormDescriptor(forms: Record<string, any>, formContext: FormContext): any {
    const keys = Object.keys(forms ?? {});
    if (keys.length === 0) {
        return null;
    }

    // getCurrentItem returns null when the entity has only one form, hence the single-form fallback.
    const currentFormId = formContext?.ui?.formSelector?.getCurrentItem?.()?.getId?.();
    if (currentFormId) {
        const wanted = normalizeFormId(currentFormId);
        const match = keys.find((key) => normalizeFormId(key) === wanted);
        return match ? forms[match] : null;
    }

    return keys.length === 1 ? forms[keys[0]] : null;
}

/**
 * Mirrors the platform's own numbering (app.js:129529-129534). Two details are load bearing: the counter
 * increments before any enabled check, so handlers disabled in the form XML still consume an index, and the
 * group key includes the attribute name, so onchange numbering restarts per attribute.
 */
function buildHandlerGroups(descriptor: any): Record<string, HandlerEntry[]> {
    const all: any[] = [...(descriptor.EventHandlers ?? [])];

    descriptor.Tabs?.forEach((tab: any) =>
        tab?.EventHandlers?.forEach((handler: any) => all.push({ ...handler, AttributeName: tab.Name }))
    );

    const counters: Record<string, number> = {};
    const groups: Record<string, HandlerEntry[]> = {};

    all.forEach((handler) => {
        if (!handler?.EventName) {
            return;
        }
        const group = handler.AttributeName ? `${handler.EventName} for ${handler.AttributeName}` : handler.EventName;
        counters[group] = counters[group] === undefined ? 0 : counters[group] + 1;

        groups[group] = groups[group] ?? [];
        groups[group].push({
            index: counters[group],
            group,
            functionName: handler.FunctionName ?? "",
            libraryName: handler.LibraryName ?? "",
            enabled: handler.Enabled !== false
        });
    });

    return groups;
}

/**
 * Business rules live in the script container iframe, not in the store. Probe every candidate frame for the
 * function rather than trusting a frame id, and stay silent when the answer is ambiguous: the container id
 * cannot be correlated to the current page, so picking one of several frames would be a guess.
 */
function readBusinessRules(): BusinessRuleEntry[] | null {
    try {
        const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>(FRAME_SELECTOR));
        const matches = frames.filter(
            (frame) => typeof (frame.contentWindow as any)?.Mscrm?.BusinessRulesScript?.GetFunctions === "function"
        );
        if (matches.length !== 1) {
            return null;
        }

        const functions = (matches[0].contentWindow as any).Mscrm.BusinessRulesScript.GetFunctions() ?? [];
        return functions.map((rule: any, index: number) => ({
            index,
            name: rule?.businessRuleName ?? "",
            functionName: rule?.functionName ?? ""
        }));
    } catch (e: any) {
        debugError("FormFlags: could not read business rules.", e?.message);
        return null;
    }
}

export function readFormComponents(formContext: FormContext): FormComponents | null {
    try {
        const forms = readStoreState()?.metadata?.forms;
        if (!forms) {
            return null;
        }

        const descriptor = findFormDescriptor(forms, formContext);
        if (!descriptor) {
            return null;
        }

        return {
            libraries: (descriptor.FormLibraries ?? []).map((name: string, index: number) => ({ index, name })),
            handlerGroups: buildHandlerGroups(descriptor),
            businessRules: readBusinessRules()
        };
    } catch (e: any) {
        debugError("FormFlags: could not read form components.", e?.message);
        return null;
    }
}

/** Mirrors _isIndexDisabledInRange (app.js:129746): no index means all, one is exact, two are inclusive. */
function isInRange(index: number, range: IndexRange): boolean {
    if (!range.start) {
        return true;
    }
    const start = Number(range.start);
    if (isNaN(start)) {
        return false;
    }
    if (!range.end) {
        return index === start;
    }
    const end = Number(range.end);
    return !isNaN(end) && index >= start && index <= end;
}

export function resolveAffected(
    components: FormComponents,
    kind: "handlers" | "libraries",
    event: HandlerEvent,
    range: IndexRange
): { items: string[]; note: string | null } {
    if (kind === "libraries") {
        return {
            items: components.libraries
                .filter((library) => isInRange(library.index, range))
                .map((library) => `#${library.index} ${library.name}`),
            note: null
        };
    }

    if (event === "businessrule") {
        if (!components.businessRules) {
            return { items: [], note: null };
        }
        return {
            items: components.businessRules
                .filter((rule) => isInRange(rule.index, range))
                .map((rule) => `#${rule.index} ${rule.name || rule.functionName}`),
            note: null
        };
    }

    const wanted = event === "true" ? ALL_EVENTS : [event];
    const matchedGroups = Object.keys(components.handlerGroups).filter((group) =>
        wanted.includes(group.split(" for ")[0].toLowerCase())
    );

    const items = matchedGroups.flatMap((group) =>
        components.handlerGroups[group]
            .filter((handler) => isInRange(handler.index, range))
            .map(
                (handler) =>
                    `#${handler.index} ${group}: ${handler.functionName}` +
                    (handler.libraryName ? ` (${handler.libraryName})` : "") +
                    (handler.enabled ? "" : " [disabled in form XML]")
            )
    );

    // The flag matches on the bare event name while indices are per event and attribute, so an index given for
    // an event registered on several attributes hits that position in every one of them.
    const note =
        range.start && matchedGroups.length > 1
            ? `This index applies to each of the ${matchedGroups.length} matching handler lists, not just one.`
            : null;

    return { items, note };
}
