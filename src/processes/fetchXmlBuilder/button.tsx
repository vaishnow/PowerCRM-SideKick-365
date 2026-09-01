import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import Typography from "@mui/material/Typography";

import { ToolPanelButton } from "~utils/global/.toolPanelButton";

class FetchXmlBuilderButton extends ToolPanelButton {
    static id = "fetchxmlbuilder";
    constructor() {
        super("fetchxmlbuilder", "FetchXML Builder", () => ManageSearchIcon, "100%");
        this.description = (
            <>
                <Typography>
                    <i>Build it, run it, see it.</i>
                </Typography>
                <Typography>
                    This tool lets you write a FetchXML query as a <b>visual tree</b> or as <b>raw XML</b>, both kept in
                    sync, and run it against the current environment.
                </Typography>
                <Typography>
                    Results are shown as a <b>grid</b> or <b>raw JSON</b> with the row count and duration. Records and
                    lookups can be opened directly from the results.
                </Typography>
                <Typography>An existing view can be loaded to use its query as a starting point.</Typography>
            </>
        );
    }
}

export default FetchXmlBuilderButton;
