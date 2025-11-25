
import { Divider, Paper, Tooltip } from "@mui/material";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo } from "react";
import { KoFiIcon } from "~icons/BuyMeACoffee";
import BlackWhiteIconButton from "~utils/components/BlackWhiteIconButton";
import { STORAGE_ListName, STORAGE_DontShowInfo } from "~utils/global/var";
import { useChromeStorage } from "~utils/hooks/use/useChromeStorage";
import { MessageType } from "~utils/types/Message";
import type { StorageConfiguration } from "~utils/types/StorageConfiguration";

import StarIcon from "@mui/icons-material/Star";
import BugReportIcon from "@mui/icons-material/BugReport";
import GitHubIcon from "@mui/icons-material/GitHub";

import packageJson from "package.json";
import { GetExtensionId } from "~utils/global/common";


const OptionsScreen: React.FunctionComponent = () => {

    const extensionId = chrome.runtime.id;
    const [processesList, setProcessList] = useChromeStorage<StorageConfiguration[]>(STORAGE_ListName);


    const resetImpersonate = useCallback(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            const activeTabURL = activeTab.url;
            if (!activeTab.id || !activeTabURL) return;

            const urlObject = new URL(activeTabURL);

            chrome.runtime.sendMessage({ type: MessageType.RESETIMPERSONATION },
                function () {
                    chrome.tabs.reload(activeTab.id!, { bypassCache: true })
                }
            );

        });
    }, []);


    const resetProcessList = useCallback(() => {
        setProcessList(null);
    }, [setProcessList]);


    const resetDontShowInfo = useCallback(() => {
        chrome.runtime.sendMessage({ type: MessageType.SETCONFIGURATION, data: { key: STORAGE_DontShowInfo, configurations: null } },
            function (response) {
                if (response.success) { }
            }
        );
    }, []);



    const navigatorType = useMemo(() => {
        if (navigator.userAgent.includes("Firefox")) {
            return "Firefox";
        } else if (navigator.userAgent.includes("Edg")) {
            return "Edge";
        } else {
            return "Chrome";
        }
    }, []);

    const reviewUrl = useMemo(() => {
        switch (navigatorType) {
            case "Edge":
                return `https://microsoftedge.microsoft.com/addons/detail/d365-sidepanel-dev-tools/${extensionId}`;
            case "Chrome":
                return `https://chromewebstore.google.com/detail/d365-sidepanel-dev-tools/${extensionId}/reviews`;
            case "Firefox":
                return "https://addons.mozilla.org/en-US/firefox/addon/powercrm-sidekick-365/";
            default:
                return "";
        }
    }, [navigatorType]);


    return (
        <Container sx={{ width: '500px', p: 2, pb: 0 }}>

            <Stack direction='column' spacing={1}>

                <Alert severity='warning'>
                    <Typography component='p' fontWeight='bold' fontSize='0.95rem'>
                        This section is not where you can use this extension:
                    </Typography>
                    <Typography component='p' fontSize='0.95rem'>
                        PowerCRM SideKick 365 adds a panel at the right of Microsoft Dynamics 365 pages.
                    </Typography>
                </Alert>

                <Alert severity='info'>
                    <Typography component='p' fontSize='0.95rem'>
                        This screen contains buttons that can be used to reset some features of this extension.
                    </Typography>
                </Alert>

                <Button
                    variant='contained'
                    onClick={resetProcessList}>
                    Reset Tool List
                </Button>

                <Button
                    variant='contained'
                    onClick={resetImpersonate}>
                    Reset Impersonation
                </Button>

                <Button
                    variant='contained'
                    onClick={resetDontShowInfo}>
                    Reset "Don't Show" Infos
                </Button>


                <Paper elevation={0}>
                    <Stack direction="column">
                        <Divider />
                        <Stack spacing={1} mt="5px" direction="row" alignItems="center" ml="auto">
                            <Tooltip title={<Typography>Send a review</Typography>} arrow disableInteractive>
                                <a href={reviewUrl} target="_blank" rel="noreferrer">
                                    <BlackWhiteIconButton size="small" color="#FDCC0D">
                                        <StarIcon fontSize="inherit" sx={{ stroke: "black" }} />
                                    </BlackWhiteIconButton>
                                </a>
                            </Tooltip>
                            <Tooltip
                                title={<Typography fontFamily="'Cookie',cursive">Buy me a Ko-fi</Typography>}
                                arrow
                                disableInteractive>
                                <a href="https://ko-fi.com/sofianeguezzar" target="_blank" rel="noreferrer">
                                    <BlackWhiteIconButton size="small" color="#0388a6">
                                        <KoFiIcon fontSize="inherit" sx={{ height: "15px" }} />
                                    </BlackWhiteIconButton>
                                </a>
                            </Tooltip>
                            {/* <Tooltip title={<Typography fontFamily="'Cookie',cursive">Buy me a coffee</Typography>} arrow disableInteractive>
                                        <a href='https://buymeacoffee.com/sofiane.guezzar' target="_blank" rel="noreferrer">
                                            <BlackWhiteIconButton size="small" color='#0388a6'>
                                                <BuyMeACoffeeIcon fontSize="inherit" sx={{ height: '15px' }} />
                                            </BlackWhiteIconButton>
                                        </a>
                                    </Tooltip> */}
                            <Tooltip title={<Typography>Github project</Typography>} arrow disableInteractive>
                                <a href="https://github.com/SofianeGUEZZAR/PowerCRM-SideKick-365" target="_blank" rel="noreferrer">
                                    <BlackWhiteIconButton size="small" color="#2dba4e">
                                        <GitHubIcon fontSize="inherit" />
                                    </BlackWhiteIconButton>
                                </a>
                            </Tooltip>
                            <Tooltip title={<Typography>Report an issue</Typography>} arrow disableInteractive>
                                <a
                                    href="https://github.com/SofianeGUEZZAR/PowerCRM-SideKick-365/issues/new"
                                    target="_blank"
                                    rel="noreferrer">
                                    <BlackWhiteIconButton size="small" color="#df5050">
                                        <BugReportIcon fontSize="inherit" />
                                    </BlackWhiteIconButton>
                                </a>
                            </Tooltip>
                            <Divider orientation="vertical" flexItem />
                            <Typography
                                variant="caption"
                                color="grey"
                                textAlign="end"
                                sx={{ userSelect: "none" }}>
                                v{packageJson.version}
                            </Typography>
                        </Stack>
                    </Stack>
                </Paper>

            </Stack>
        </Container>
    )
}


// waitForElm(document, '#root', { infiniteWait: true }).then((rootDiv) => {
//     if (rootDiv) {
//         ReactDOM.render(
//             <OptionsScreen />,
//             rootDiv
//         );
//     }
// });

// debugLog("Option loaded");
export default OptionsScreen;