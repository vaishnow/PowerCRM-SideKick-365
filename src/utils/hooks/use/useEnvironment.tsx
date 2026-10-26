import { useEffect, useState } from "react";

import { retrieveEnvironment, type EnvironmentInfo } from "../../global/environmentType";

export function useEnvironment(): EnvironmentInfo | null {
    const [environment, setEnvironment] = useState<EnvironmentInfo | null>(null);

    useEffect(() => {
        retrieveEnvironment().then(setEnvironment);
    }, []);

    return environment;
}
