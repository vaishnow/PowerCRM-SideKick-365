import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import { StyledEngineProvider, useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import JsonView from "@uiw/react-json-view";
import { SnackbarProvider, useSnackbar } from "notistack";
import { forwardRef, useCallback, useEffect, useState } from "react";

import DetailsSnackbar from "../../utils/components/DetailsSnackbar";
import RecordSelector from "../../utils/components/RecordSelector";
import RequestSettingsBar from "../../utils/components/RequestSettingsBar";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";
import { debugLog } from "../../utils/global/common";
import { defaultWriteSettings, type WriteSettings } from "../../utils/global/dataverseRequest";
import { useDictionnary } from "../../utils/hooks/use/useDictionnary";
import { RetrieveInvokableMessages } from "../../utils/hooks/XrmApi/RetrieveInvokableMessages";
import { RetrieveInvokableParameters } from "../../utils/hooks/XrmApi/RetrieveInvokableParameters";
import { RetrieveSetName } from "../../utils/hooks/XrmApi/RetrieveSetName";
import { executeMessage } from "./execute";
import ParameterInput from "./ParameterInput";
import { ApiBindingType, type InvokableMessage } from "./types";

class CustomApiRunnerProcess extends ProcessButton {
    static id = "customapirunner";
    constructor() {
        super("customapirunner");
        this.process = CustomApiRunnerContainer;
    }
}

const CustomApiRunnerContainer = forwardRef<ProcessRef, ProcessProps>(function CustomApiRunnerContainer(
    props: ProcessProps,
    ref
) {
    return (
        <StyledEngineProvider injectFirst>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <SnackbarProvider dense maxSnack={5} Components={{ detailsFile: DetailsSnackbar }}>
                    <CustomApiRunner ref={ref} {...props} />
                </SnackbarProvider>
            </LocalizationProvider>
        </StyledEngineProvider>
    );
});

const CustomApiRunner = forwardRef<ProcessRef, ProcessProps>(function CustomApiRunner(_props: ProcessProps, _ref) {
    const theme = useTheme();
    const { enqueueSnackbar } = useSnackbar();

    const [messages, fetchingMessages] = RetrieveInvokableMessages();
    const [selectedMessage, setSelectedMessage] = useState<InvokableMessage | null>(null);
    const [parameters, fetchingParameters] = RetrieveInvokableParameters(selectedMessage);

    const [settings, setSettings] = useState<WriteSettings>({ ...defaultWriteSettings, method: "new" });
    const [recordsIds, setRecordsIds] = useState<string[]>([]);
    const [response, setResponse] = useState<any>(undefined);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    const { dict: values, setValue, removeValue, setDict: setValues } = useDictionnary({});

    const isBoundToRecord = selectedMessage?.bindingType === ApiBindingType.Entity;
    const boundSetName = RetrieveSetName(selectedMessage?.boundEntityLogicalName ?? "");

    useEffect(() => {
        setValues({});
        setRecordsIds([]);
        setResponse(undefined);
    }, [selectedMessage, setValues]);

    const launch = useCallback(() => {
        if (!selectedMessage) return;
        debugLog("Launch", selectedMessage.uniqueName, "with", values);

        setIsRunning(true);
        setResponse(undefined);
        Xrm.Utility.showProgressIndicator("Running " + selectedMessage.uniqueName);

        executeMessage(selectedMessage, parameters, values, boundSetName, recordsIds.at(0) ?? "", settings).then(
            function success(result) {
                Xrm.Utility.closeProgressIndicator();
                setIsRunning(false);
                setResponse(result ?? { result: "Completed with no content (204)." });
                enqueueSnackbar(selectedMessage.uniqueName + " executed.", { variant: "success" });
            },
            function (error) {
                Xrm.Utility.closeProgressIndicator();
                setIsRunning(false);
                enqueueSnackbar("Running " + selectedMessage.uniqueName + " has encountered an error.", {
                    variant: "detailsFile",
                    detailsVariant: "error",
                    persist: true,
                    allowDownload: true,
                    detailsNode: (
                        <Typography gutterBottom variant="caption" style={{ color: "#000", display: "block" }}>
                            {`(0x${error.errorCode.toString(16)}) ${error.message}`}
                        </Typography>
                    ),
                    downloadButtonLabel: "Download log file",
                    fileContent: error.raw,
                    fileName: "ErrorDetails.txt"
                });

                console.error(error.message);
            }
        );
    }, [boundSetName, enqueueSnackbar, parameters, recordsIds, selectedMessage, settings, values]);

    return (
        <Stack spacing={0.5} width="-webkit-fill-available" padding="10px" height="calc(100% - 10px)">
            <Autocomplete
                size="small"
                fullWidth
                options={messages}
                loading={fetchingMessages}
                value={selectedMessage}
                onChange={(_event, value) => setSelectedMessage(value)}
                getOptionLabel={(message) => message.uniqueName}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                groupBy={(message) => (message.source === "customapi" ? "Custom API" : "Other messages")}
                renderInput={(params) => <TextField {...params} label="Message" />}
            />

            {selectedMessage && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <Chip size="small" label={selectedMessage.isFunction ? "Function (GET)" : "Action (POST)"} />
                    <Chip size="small" label={ApiBindingType[selectedMessage.bindingType]} />
                    {selectedMessage.boundEntityLogicalName && (
                        <Chip size="small" label={selectedMessage.boundEntityLogicalName} />
                    )}
                </Stack>
            )}

            <RequestSettingsBar settings={settings} setSettings={setSettings} hideMethodToggle />

            <Divider />

            <Stack spacing={1} height="100%" sx={{ overflowY: "auto", overflowX: "hidden" }}>
                {isBoundToRecord && (
                    <Stack direction="column" spacing={0.25} width="100%">
                        <Typography variant="caption">Bound record *</Typography>
                        <RecordSelector
                            entityname={selectedMessage!.boundEntityLogicalName!}
                            recordsIds={recordsIds}
                            setRecordsIds={setRecordsIds}
                            theme={theme}
                            disabled={false}
                        />
                    </Stack>
                )}

                {fetchingParameters
                    ? [...Array(4)].map((_value, index) => (
                          <Skeleton key={`customapiskeleton${index}`} variant="rounded" height="42px" />
                      ))
                    : parameters
                          .filter((parameter) => !(isBoundToRecord && parameter.uniqueName === "Target"))
                          .map((parameter) => (
                              <ParameterInput
                                  key={parameter.uniqueName}
                                  parameter={parameter}
                                  setValue={setValue}
                                  removeValue={removeValue}
                                  theme={theme}
                              />
                          ))}

                {response !== undefined && (
                    <>
                        <Divider />
                        <Typography variant="caption">Response</Typography>
                        <JsonView value={response} collapsed={2} style={{ fontSize: "0.8em" }} />
                    </>
                )}
            </Stack>

            <Divider />

            <Button
                variant="contained"
                fullWidth
                startIcon={<PlayArrowIcon />}
                disabled={!selectedMessage || isRunning || (isBoundToRecord && recordsIds.length === 0)}
                onClick={launch}>
                Run
            </Button>
        </Stack>
    );
});

export default CustomApiRunnerProcess;
