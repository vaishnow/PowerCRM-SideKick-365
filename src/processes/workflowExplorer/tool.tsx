import { forwardRef } from "react";

import WorkflowExplorerPane from "../../utils/components/workflowExplorer/main";
import { ProcessButton, type ProcessProps, type ProcessRef } from "../../utils/global/.processClass";

class WorkflowExplorerProcess extends ProcessButton {
    static id = "workflowexplorer";
    constructor() {
        super("workflowexplorer");
        this.process = WorkflowExplorerButtonProcess;
    }
}

const WorkflowExplorerButtonProcess = forwardRef<ProcessRef, ProcessProps>(function WorkflowExplorerButtonProcess(
    props: ProcessProps,
    ref
) {
    return <WorkflowExplorerPane processId={props.id} />;
});

export default WorkflowExplorerProcess;
