import OutlinedFlagIcon from "@mui/icons-material/OutlinedFlag";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class FormFlagsButton extends ToolPanelButton {
    static id = "formflags";
    constructor() {
        super("formflags", "Form Flags", () => OutlinedFlagIcon, 400);
        this.description = (
            <>
                <Typography>
                    <i>Disable form components to isolate what breaks a form.</i>
                </Typography>
                <Typography>
                    Toggle the model-driven app troubleshooting URL parameters: <b>command bar</b>,{" "}
                    <b>form handlers</b>, <b>form libraries</b>, <b>web resource controls</b>, a single{" "}
                    <b>form control</b>, <b>business process flows</b>, the <b>navigation bar</b> and the{" "}
                    <b>Command Checker</b>.
                </Typography>
                <Typography>
                    Handlers and libraries accept an <u>index or a range</u>, whose values come from the{" "}
                    <b>FormEvents</b> operation in Monitor. Index-level control of business rules needs the
                    org-side business rule refresh described in the Microsoft documentation.
                </Typography>
                <Typography>
                    Changes are staged until you click <b>Apply</b>, which reloads the page. Flags affect this
                    browser tab only, never your customizations. Any flag not listed here is dropped from the URL
                    when you apply.
                </Typography>
            </>
        );
    }
}

export default FormFlagsButton;
