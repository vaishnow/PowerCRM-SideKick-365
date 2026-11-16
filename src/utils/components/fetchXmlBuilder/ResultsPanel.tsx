import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import JsonView from "@uiw/react-json-view";
import { useContext, useMemo, useState } from "react";

import type { FetchXmlError } from "../../hooks/XrmApi/ExecuteFetchXML";
import { MetadataContext } from "../MetadataBrowser/MetadataContextProvider";
import ObjectListGrid from "../MetadataBrowser/ObjectListGrid";
import RecordContextualMenu from "../RecordContextualMenu";

const LOOKUP_LOGICALNAME_ANNOTATION = "@Microsoft.Dynamics.CRM.lookuplogicalname";
const FORMATTED_VALUE_ANNOTATION = "@OData.Community.Display.V1.FormattedValue";

const jsonStyle: React.CSSProperties = {
    width: "calc(100% - 16px)",
    height: "calc(100% - 16px)",
    overflow: "auto",
    padding: 8,
    fontSize: 15,
    overflowWrap: "break-word"
};

type MenuTarget = { anchor: Element; entityName: string; recordId: string };

export type PagingState = {
    visible: boolean;
    page: number;
    canNext: boolean;
    goToPage: (page: number) => void;
};

type ResultsPanelProps = {
    entityName: string;
    rows: any[];
    isFetching: boolean;
    error: FetchXmlError | null;
    durationMs: number | null;
    paging: PagingState;
};

function ResultsPanel(props: ResultsPanelProps) {
    const { entityName, rows, isFetching, error, durationMs, paging } = props;

    const { entitiesMetadata } = useContext(MetadataContext);
    const [tab, setTab] = useState(0);
    const [menuTarget, setMenuTarget] = useState<MenuTarget | null>(null);

    const primaryIdAttribute = useMemo(
        () =>
            entitiesMetadata.find((entity) => entity.LogicalName === entityName)?.PrimaryIdAttribute ??
            `${entityName}id`,
        [entitiesMetadata, entityName]
    );

    /**
     * Lookup columns carry their target entity in an annotation, so they can navigate on their own.
     * Every row is scanned because the Web API omits attributes that are null on a given record.
     */
    const columnRenderCell = useMemo(() => {
        const lookupColumns = new Set<string>();
        rows.forEach((row) =>
            Object.keys(row)
                .filter((key) => key.endsWith(LOOKUP_LOGICALNAME_ANNOTATION))
                .forEach((key) => lookupColumns.add(key.replace(LOOKUP_LOGICALNAME_ANNOTATION, "")))
        );

        return Array.from(lookupColumns)
            .reduce((renderers, key) => {
                renderers[key] = (params: any) =>
                    params.row[key] ? (
                        <Link
                            component="button"
                            underline="hover"
                            variant="body2"
                            title={params.row[key]}
                            onClick={(event: React.MouseEvent) => {
                                event.stopPropagation();
                                setMenuTarget({
                                    anchor: event.currentTarget,
                                    entityName: params.row[key + LOOKUP_LOGICALNAME_ANNOTATION],
                                    recordId: params.row[key]
                                });
                            }}>
                            {params.row[key + FORMATTED_VALUE_ANNOTATION] ?? params.row[key]}
                        </Link>
                    ) : null;
                return renderers;
            }, {} as { [columnName: string]: any });
    }, [rows]);

    return (
        <Stack height="100%" minHeight={0}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" px={1}>
                <Tabs value={tab} onChange={(event, newTab) => setTab(newTab)}>
                    <Tab label="Results" />
                    <Tab label="JSON" />
                </Tabs>

                <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                        {isFetching
                            ? "Running..."
                            : durationMs === null
                              ? "Not executed yet."
                              : `${rows.length} rows · ${durationMs} ms`}
                    </Typography>

                    {paging.visible && (
                        <>
                            <IconButton
                                size="small"
                                title="Previous page"
                                disabled={paging.page <= 1 || isFetching}
                                onClick={() => paging.goToPage(paging.page - 1)}>
                                <NavigateBeforeIcon fontSize="small" />
                            </IconButton>
                            <Typography variant="caption">page {paging.page}</Typography>
                            <IconButton
                                size="small"
                                title="Next page"
                                disabled={!paging.canNext || isFetching}
                                onClick={() => paging.goToPage(paging.page + 1)}>
                                <NavigateNextIcon fontSize="small" />
                            </IconButton>
                        </>
                    )}
                </Stack>
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mx: 1, mb: 1 }}>
                    {error.message}
                </Alert>
            )}

            <Box flex="1 1 auto" minHeight={0}>
                {tab === 0 ? (
                    <ObjectListGrid
                        loading={isFetching}
                        dataList={rows}
                        excludeColumns={[(name) => name.includes("@")]}
                        columnRenderCell={columnRenderCell}
                        columnNameText={`${entityName}-fetchxml-results`}
                        fullHeight
                        onRowClick={(params, event) => {
                            /* Aggregate rows carry no primary id, so there is nothing to open. */
                            if (params.row[primaryIdAttribute]) {
                                setMenuTarget({
                                    anchor: event.target as Element,
                                    entityName,
                                    recordId: params.row[primaryIdAttribute]
                                });
                            }
                        }}
                    />
                ) : (
                    <JsonView
                        value={rows}
                        style={jsonStyle}
                        collapsed={2}
                        highlightUpdates={false}
                        shortenTextAfterLength={36}
                        indentWidth={20}>
                        <JsonView.Quote>
                            <span />
                        </JsonView.Quote>
                    </JsonView>
                )}
            </Box>

            <RecordContextualMenu
                open={!!menuTarget}
                anchorElement={menuTarget?.anchor}
                onClose={() => setMenuTarget(null)}
                entityName={menuTarget?.entityName}
                recordId={menuTarget?.recordId}
            />
        </Stack>
    );
}

export default ResultsPanel;
