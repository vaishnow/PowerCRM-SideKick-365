import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class FormFlagsButton extends ToolPanelButton {
    static id = "formflags";
    constructor() {
        super("formflags", "Form Flags", () => OutlinedFlagIcon, 460);
        this.description = (
            <>
                <Typography>
                    <i>Drive the app with troubleshooting URL parameters.</i>
                </Typography>
                <Typography>
                    Disable components to isolate what breaks a form: <b>command bar</b>, <b>form handlers</b>,{" "}
                    <b>form libraries</b>, <b>web resource controls</b>, a single <b>form control</b> and{" "}
                    <b>business process flows</b>. Handlers and libraries accept an <u>index or a range</u>, whose
                    values come from the <b>FormEvents</b> operation in Monitor.
                </Typography>
                <Typography>
                    Strip the app chrome (<b>navigation bar</b>, <b>command bar</b>, <b>sitemap</b>), turn on{" "}
                    <b>Command Checker</b>, the <b>performance overlay</b>, the <b>telemetry stream</b> and{" "}
                    <b>verbose console tracing</b> per area, or open the form <b>read-only in preview</b>.
                </Typography>
                <Typography>
                    The caching section disables the client caches so your latest web resources actually load. None of
                    it defeats an already registered service worker:{" "}
                    <u>unregister it in DevTools, Application, Service Workers</u> first.
                </Typography>
                <Typography>
                    Changes are staged until you click <b>Apply</b>, which reloads the page. Parameters affect this
                    browser tab only, never your customizations. Any flag not listed here is dropped from the URL when
                    you apply.
                </Typography>
            </>
        );
    }
}

export default FormFlagsButton;
