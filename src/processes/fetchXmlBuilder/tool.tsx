import { forwardRef, useState } from "react";

import FetchXmlBuilderPane from "../../utils/components/fetchXmlBuilder/main";
import MetadataContextProvider from "../../utils/components/MetadataBrowser/MetadataContextProvider";
import { GridButtonsContext } from "../../utils/components/MetadataBrowser/ObjectListGrid";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";

class FetchXmlBuilderProcess extends ProcessButton {
    static id = "fetchxmlbuilder";
    constructor() {
        super("fetchxmlbuilder");
        this.process = FetchXmlBuilder;
    }
}

const FetchXmlBuilder = forwardRef<ProcessRef, ProcessProps>(function FetchXmlBuilder(props: ProcessProps, ref) {
    const [openedGridId, setOpenedGridId] = useState("");

    return (
        <MetadataContextProvider>
            <GridButtonsContext.Provider value={{ openedGridId, openGrid: setOpenedGridId }}>
                <FetchXmlBuilderPane />
            </GridButtonsContext.Provider>
        </MetadataContextProvider>
    );
});

export default FetchXmlBuilderProcess;
