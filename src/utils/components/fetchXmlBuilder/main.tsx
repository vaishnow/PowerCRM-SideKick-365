import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Editor from "@monaco-editor/react";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ExecuteFetchXML } from "../../hooks/XrmApi/ExecuteFetchXML";
import { RetrieveViews, type ViewRetrieved } from "../../hooks/XrmApi/RetrieveViews";
import useCopyWithSnack from "../../hooks/use/useCopyWithSnack";
import EntitySelector from "../EntitySelector";
import FetchXmlTree from "./FetchXmlTree";
import ResultsPanel from "./ResultsPanel";
import {
    formatFetchXml,
    getFetchEntityName,
    getPage,
    getPageSize,
    getRootEntity,
    hasTop,
    isAggregateFetch,
    newFetchSkeleton,
    parseFetchXml,
    serializeDoc,
    setPaging
} from "./utils/fetchXml";

const PAGE_SIZE = 50;

function FetchXmlBuilderPane() {
    const { enqueueSnackbar } = useSnackbar();
    const copy = useCopyWithSnack({ textPrefix: "FetchXML" });

    const [xml, setXml] = useState<string>("");
    const { execute, rows, isFetching, error, durationMs } = ExecuteFetchXML();

    const { doc, error: parseError } = useMemo(() => parseFetchXml(xml), [xml]);
    const entityName = useMemo(() => (doc ? getFetchEntityName(doc) : ""), [doc]);

    const views = RetrieveViews(entityName);

    useEffect(() => {
        if (!error) return;
        enqueueSnackbar("The query has encountered an error.", {
            variant: "detailsFile",
            detailsVariant: "error",
            persist: true,
            allowDownload: true,
            detailsNode: (
                <Typography gutterBottom variant="caption" style={{ color: "#000", display: "block" }}>
                    {error.errorCode ? `(0x${error.errorCode.toString(16)}) ${error.message}` : error.message}
                </Typography>
            ),
            downloadButtonLabel: "Download log file",
            fileContent: error.raw,
            fileName: "ErrorDetails.txt"
        });
    }, [error, enqueueSnackbar]);

    /** Tree edits mutate the parsed document in place, the string is rebuilt from it. */
    const applyDocument = useCallback(() => {
        if (doc) {
            setXml(serializeDoc(doc));
        }
    }, [doc]);

    const handleEntityChange = useCallback(
        (newEntityName: string) => {
            if (!newEntityName) return;

            const rootEntity = doc && getRootEntity(doc);
            if (!rootEntity) {
                setXml(newFetchSkeleton(newEntityName));
                return;
            }
            rootEntity.setAttribute("name", newEntityName);
            applyDocument();
        },
        [doc, applyDocument]
    );

    const handleViewChange = useCallback((view: ViewRetrieved | null) => {
        if (view) {
            setXml(formatFetchXml(view.fetchxml));
        }
    }, []);

    /** Paging is written into the query so the editor always shows what actually ran. */
    const run = useCallback(
        (page: number) => {
            const { doc: runDocument } = parseFetchXml(xml);
            if (!runDocument) return;

            let queryToRun = xml;
            if (!hasTop(runDocument)) {
                setPaging(runDocument, page, PAGE_SIZE);
                queryToRun = serializeDoc(runDocument);
                setXml(queryToRun);
            }
            execute(getFetchEntityName(runDocument), queryToRun);
        },
        [xml, execute]
    );

    const paging = useMemo(
        () => ({
            visible: !!doc && !hasTop(doc),
            page: doc ? getPage(doc) : 1,
            canNext: !!doc && rows.length === getPageSize(doc, PAGE_SIZE),
            goToPage: run
        }),
        [doc, rows.length, run]
    );

    return (
        <Stack height="100%" minHeight={0}>
            <Stack direction="row" spacing={1} alignItems="center" p={1}>
                <Box width={260}>
                    <EntitySelector entityname={entityName} setEntityname={handleEntityChange} fullWidth />
                </Box>

                <Autocomplete
                    size="small"
                    sx={{ width: 260 }}
                    options={views}
                    getOptionLabel={(view) => view.name}
                    isOptionEqualToValue={(option, value) => option.savedqueryid === value.savedqueryid}
                    onChange={(event, view) => handleViewChange(view)}
                    renderInput={(params) => <TextField {...params} label="Load a view" />}
                />

                <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    disabled={!entityName || isFetching}
                    onClick={() => run(1)}>
                    Execute
                </Button>
                <Button
                    size="small"
                    startIcon={<FormatAlignLeftIcon />}
                    disabled={!doc}
                    onClick={() => setXml(formatFetchXml(xml))}>
                    Format
                </Button>
                <Button size="small" startIcon={<ContentCopyIcon />} disabled={!xml} onClick={() => copy(xml)}>
                    Copy
                </Button>
            </Stack>

            <Divider />

            <Stack direction="row" flex="1 1 50%" minHeight={0}>
                <Box width="40%" minWidth={0} borderRight={1} borderColor="divider">
                    {doc ? (
                        <FetchXmlTree doc={doc} isAggregate={isAggregateFetch(doc)} onChange={applyDocument} />
                    ) : (
                        <Alert severity={parseError ? "error" : "info"} sx={{ m: 1 }}>
                            {parseError ?? "Pick an entity to start a query."}
                        </Alert>
                    )}
                </Box>

                <Box width="60%" minWidth={0}>
                    <Editor
                        language="xml"
                        value={xml}
                        onChange={(newXml) => setXml(newXml ?? "")}
                        options={{ minimap: { enabled: false }, wordWrap: "on" }}
                    />
                </Box>
            </Stack>

            <Divider />

            <Box flex="1 1 50%" minHeight={0}>
                <ResultsPanel
                    entityName={entityName}
                    rows={rows}
                    isFetching={isFetching}
                    error={error}
                    durationMs={durationMs}
                    paging={paging}
                />
            </Box>
        </Stack>
    );
}

export default FetchXmlBuilderPane;
