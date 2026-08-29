import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from "react";

import TooltipInfo from "./TooltipInfo";

export type DetailField = [label: string, value: React.ReactNode];

type DetailTooltipProps = {
    fields: DetailField[];
    children: React.ReactElement;
    maxWidth?: number;
};

function DetailTooltip({ fields, children, maxWidth = 480 }: DetailTooltipProps) {
    const content = (
        <Box display="grid" gridTemplateColumns="auto 1fr" columnGap={1} rowGap={0.25} alignItems="baseline">
            {fields.map(([label, value]) => (
                <React.Fragment key={label}>
                    <Typography variant="caption" fontWeight={600} whiteSpace="nowrap">
                        {label}
                    </Typography>
                    <Typography variant="caption" sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                        {value}
                    </Typography>
                </React.Fragment>
            ))}
        </Box>
    );

    return (
        <TooltipInfo title={content} placement="left" arrow disableInteractive enterDelay={400} maxWidth={maxWidth}>
            {children}
        </TooltipInfo>
    );
}

export default DetailTooltip;
