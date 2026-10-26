/**
 * The XML string is the single source of truth for the builder: the tree is rendered from the
 * parsed Document and every tree edit mutates that Document and re-serialises it. Nodes and
 * attributes without an editor here still round-trip untouched, because the model is the DOM.
 */

const INDENT = "    ";

export type ParseResult = { doc: Document | null; error: string | null };

export function parseFetchXml(xml: string): ParseResult {
    if (!xml.trim()) {
        return { doc: null, error: null };
    }

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
        return { doc: null, error: parserError.textContent?.trim() ?? "Invalid XML." };
    }

    return { doc, error: null };
}

export function serializeDoc(doc: Document): string {
    return printElement(doc.documentElement, 0);
}

export function formatFetchXml(xml: string): string {
    const { doc } = parseFetchXml(xml);
    return doc ? serializeDoc(doc) : xml;
}

function printElement(element: Element, depth: number): string {
    const pad = INDENT.repeat(depth);
    const attributes = Array.from(element.attributes)
        .map((attribute) => ` ${attribute.name}="${escapeAttribute(attribute.value)}"`)
        .join("");

    const children = Array.from(element.childNodes).filter(isPrintable);
    if (children.length === 0) {
        return `${pad}<${element.tagName}${attributes} />`;
    }

    const onlyText = children.every((child) => child.nodeType === Node.TEXT_NODE);
    if (onlyText) {
        const text = children.map((child) => escapeText(child.textContent ?? "")).join("");
        return `${pad}<${element.tagName}${attributes}>${text}</${element.tagName}>`;
    }

    const printedChildren = children.map((child) => printNode(child, depth + 1)).join("\n");
    return `${pad}<${element.tagName}${attributes}>\n${printedChildren}\n${pad}</${element.tagName}>`;
}

function printNode(node: ChildNode, depth: number): string {
    const pad = INDENT.repeat(depth);
    if (node.nodeType === Node.ELEMENT_NODE) {
        return printElement(node as Element, depth);
    }
    if (node.nodeType === Node.COMMENT_NODE) {
        return `${pad}<!--${node.textContent ?? ""}-->`;
    }
    return `${pad}${escapeText(node.textContent?.trim() ?? "")}`;
}

function isPrintable(node: ChildNode): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
        return !!node.textContent?.trim();
    }
    return node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.COMMENT_NODE;
}

function escapeAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function elementChildren(element: Element): Element[] {
    return Array.from(element.children);
}

export function addChild(parent: Element, tagName: string): Element {
    const child = parent.ownerDocument.createElement(tagName);
    switch (tagName) {
        case "entity":
            child.setAttribute("name", "");
            break;
        case "attribute":
            child.setAttribute("name", "");
            break;
        case "order":
            child.setAttribute("attribute", "");
            break;
        case "filter":
            child.setAttribute("type", "and");
            break;
        case "condition":
            child.setAttribute("attribute", "");
            child.setAttribute("operator", "eq");
            break;
        case "link-entity":
            child.setAttribute("name", "");
            child.setAttribute("from", "");
            child.setAttribute("to", "");
            child.setAttribute("link-type", "inner");
            break;
    }
    parent.appendChild(child);
    return child;
}

export function removeNode(node: Element): void {
    node.parentNode?.removeChild(node);
}

export function setAttr(node: Element, name: string, value: string | null): void {
    if (value === null || value === "") {
        node.removeAttribute(name);
    } else {
        node.setAttribute(name, value);
    }
}

/** Attribute pickers resolve against the nearest enclosing entity or link-entity. */
export function getScopeEntityName(node: Element): string {
    let current: Element | null = node;
    while (current) {
        if (current.tagName === "entity" || current.tagName === "link-entity") {
            return current.getAttribute("name") ?? "";
        }
        current = current.parentElement;
    }
    return "";
}

export function getRootEntity(doc: Document): Element | null {
    return elementChildren(doc.documentElement).find((child) => child.tagName === "entity") ?? null;
}

export function getFetchEntityName(doc: Document): string {
    return getRootEntity(doc)?.getAttribute("name") ?? "";
}

export function isAggregateFetch(doc: Document): boolean {
    return doc.documentElement.getAttribute("aggregate") === "true";
}

export function newFetchSkeleton(entityName: string): string {
    return formatFetchXml(`<fetch top="50"><entity name="${entityName}"><all-attributes /></entity></fetch>`);
}

/** Paging lives in the XML so the editor always shows the query that actually ran. */
export function hasTop(doc: Document): boolean {
    return doc.documentElement.hasAttribute("top");
}

export function getPage(doc: Document): number {
    return parseInt(doc.documentElement.getAttribute("page") ?? "1") || 1;
}

export function getPageSize(doc: Document, fallback: number): number {
    return parseInt(doc.documentElement.getAttribute("count") ?? "") || fallback;
}

export function setPaging(doc: Document, page: number, pageSize: number): void {
    doc.documentElement.setAttribute("count", String(pageSize));
    doc.documentElement.setAttribute("page", String(page));
}

export type NodeAttributeEditor = {
    name: string;
    kind: "text" | "bool" | "select" | "entity" | "attribute";
    options?: string[];
    /** Only rendered when the root fetch is an aggregate query. */
    aggregateOnly?: boolean;
};

export type NodeDescriptor = {
    editors: NodeAttributeEditor[];
    children: string[];
};

const QUERY_CHILDREN = ["attribute", "all-attributes", "order", "filter", "link-entity"];

export const AGGREGATE_FUNCTIONS = ["count", "countcolumn", "sum", "avg", "min", "max"];
export const DATE_GROUPINGS = ["day", "week", "month", "quarter", "year", "fiscal-period", "fiscal-year"];

export const NODE_SCHEMA: { [tagName: string]: NodeDescriptor } = {
    fetch: {
        editors: [
            { name: "top", kind: "text" },
            { name: "distinct", kind: "bool" },
            { name: "aggregate", kind: "bool" }
        ],
        children: ["entity"]
    },
    entity: {
        editors: [{ name: "name", kind: "entity" }],
        children: QUERY_CHILDREN
    },
    attribute: {
        editors: [
            { name: "name", kind: "attribute" },
            { name: "alias", kind: "text" },
            { name: "aggregate", kind: "select", options: AGGREGATE_FUNCTIONS, aggregateOnly: true },
            { name: "groupby", kind: "bool", aggregateOnly: true },
            { name: "dategrouping", kind: "select", options: DATE_GROUPINGS, aggregateOnly: true }
        ],
        children: []
    },
    "all-attributes": {
        editors: [],
        children: []
    },
    order: {
        editors: [
            { name: "attribute", kind: "attribute" },
            { name: "alias", kind: "text" },
            { name: "descending", kind: "bool" }
        ],
        children: []
    },
    filter: {
        editors: [{ name: "type", kind: "select", options: ["and", "or"] }],
        children: ["condition", "filter"]
    },
    condition: {
        editors: [
            { name: "attribute", kind: "attribute" },
            { name: "operator", kind: "select" },
            { name: "value", kind: "text" }
        ],
        children: []
    },
    "link-entity": {
        editors: [
            { name: "name", kind: "entity" },
            { name: "from", kind: "attribute" },
            { name: "to", kind: "attribute" },
            { name: "link-type", kind: "select", options: ["inner", "outer"] },
            { name: "alias", kind: "text" }
        ],
        children: QUERY_CHILDREN
    }
};

/** A fetch holds a single root entity, so hide the option once one exists. */
export function allowedChildren(node: Element): string[] {
    const children = NODE_SCHEMA[node.tagName]?.children ?? [];
    if (node.tagName === "fetch" && elementChildren(node).some((child) => child.tagName === "entity")) {
        return [];
    }
    return children;
}

export const CONDITION_OPERATORS = [
    "eq",
    "ne",
    "neq",
    "gt",
    "ge",
    "le",
    "lt",
    "like",
    "not-like",
    "begins-with",
    "not-begin-with",
    "ends-with",
    "not-end-with",
    "in",
    "not-in",
    "between",
    "not-between",
    "null",
    "not-null",
    "eq-userid",
    "ne-userid",
    "eq-userteams",
    "eq-useroruserteams",
    "eq-useroruserhierarchy",
    "eq-businessid",
    "ne-businessid",
    "today",
    "yesterday",
    "tomorrow",
    "this-week",
    "this-month",
    "this-year",
    "this-fiscal-year",
    "last-week",
    "last-month",
    "last-year",
    "last-x-days",
    "last-x-hours",
    "last-x-months",
    "last-x-weeks",
    "last-x-years",
    "next-week",
    "next-month",
    "next-year",
    "next-x-days",
    "next-x-hours",
    "next-x-months",
    "next-x-weeks",
    "next-x-years",
    "olderthan-x-days",
    "olderthan-x-months",
    "olderthan-x-years",
    "on",
    "on-or-after",
    "on-or-before",
    "contain-values",
    "not-contain-values",
    "under",
    "not-under",
    "eq-or-under",
    "above",
    "eq-or-above"
];

export const VALUELESS_OPERATORS = new Set([
    "null",
    "not-null",
    "eq-userid",
    "ne-userid",
    "eq-userteams",
    "eq-useroruserteams",
    "eq-useroruserhierarchy",
    "eq-businessid",
    "ne-businessid",
    "today",
    "yesterday",
    "tomorrow",
    "this-week",
    "this-month",
    "this-year",
    "this-fiscal-year",
    "last-week",
    "last-month",
    "last-year",
    "next-week",
    "next-month",
    "next-year"
]);
