import Stack from "@mui/material/Stack";
import type { Theme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";

import RecordSelector from "../../utils/components/RecordSelector";
import { RetrievePrimaryIdAttribute } from "../../utils/hooks/XrmApi/RetrievePrimaryIdAttribute";
import { MSType, type AttributeMetadata } from "../../utils/types/requestsType";
import {
    BooleanNode,
    DateTimeNode,
    DecimalNode,
    DoubleNode,
    IntegerNode,
    MoneyNode,
    StringNode
} from "../updateRecord/nodes";
import { ApiParameterType, JSON_PARAMETER_TYPES, type InvokableParameter } from "./types";

const PARAMETER_MSTYPE: { [type in ApiParameterType]?: MSType } = {
    [ApiParameterType.Boolean]: MSType.Boolean,
    [ApiParameterType.DateTime]: MSType.DateTime,
    [ApiParameterType.Decimal]: MSType.Decimal,
    [ApiParameterType.Float]: MSType.Double,
    [ApiParameterType.Integer]: MSType.Integer,
    [ApiParameterType.Money]: MSType.Money,
    [ApiParameterType.String]: MSType.String,
    [ApiParameterType.Guid]: MSType.String
};

/** nodes.tsx inputs are driven by attribute metadata, so each parameter gets a synthetic one. */
function toAttributeMetadata(parameter: InvokableParameter, msType: MSType): AttributeMetadata {
    return {
        LogicalName: parameter.uniqueName,
        DisplayName: parameter.displayName,
        SchemaName: parameter.uniqueName,
        MStype: msType,
        IsValidForCreate: true,
        IsValidForForm: true,
        IsValidForGrid: true,
        IsValidForRead: true,
        IsValidForUpdate: true,
        IsValidODataAttribute: true,
        RequiredLevel: parameter.isOptional ? "None" : "ApplicationRequired",
        Parameters: {
            MinValue: -2147483648,
            MaxValue: 2147483647,
            Precision: 2,
            MaxLength: 4000,
            Target: parameter.logicalEntityName ?? "",
            Targets: parameter.logicalEntityName ? [parameter.logicalEntityName] : [],
            Format: ""
        }
    };
}

type ParameterInputProps = {
    parameter: InvokableParameter;
    setValue: (uniqueName: string, value: any) => void;
    removeValue: (uniqueName: string) => void;
    theme: Theme;
};

/** EntityReference parameters take an entity-reference object, not the "@odata.bind" string LookupNode emits. */
function EntityReferenceInput(props: ParameterInputProps) {
    const { parameter, setValue, removeValue, theme } = props;
    const [recordsIds, setRecordsIds] = useState<string[]>([]);
    const entityname = parameter.logicalEntityName ?? "";
    const primaryIdAttribute = RetrievePrimaryIdAttribute(entityname);

    const handleChange = (ids: string[]) => {
        setRecordsIds(ids);
        const id = ids.at(0);
        if (!id || !primaryIdAttribute) {
            removeValue(parameter.uniqueName);
            return;
        }
        setValue(parameter.uniqueName, {
            "@odata.type": `Microsoft.Dynamics.CRM.${entityname}`,
            [primaryIdAttribute]: id
        });
    };

    if (!entityname) {
        return <Typography variant="caption">No entity set on this parameter.</Typography>;
    }

    return (
        <RecordSelector
            entityname={entityname}
            recordsIds={recordsIds}
            setRecordsIds={(ids) => handleChange(ids as string[])}
            theme={theme}
            disabled={false}
        />
    );
}

function JsonInput(props: ParameterInputProps) {
    const { parameter, setValue, removeValue } = props;
    const [text, setText] = useState<string>("");
    const [error, setError] = useState<string>("");

    const handleChange = (raw: string) => {
        setText(raw);
        if (!raw.trim()) {
            setError("");
            removeValue(parameter.uniqueName);
            return;
        }
        try {
            setValue(parameter.uniqueName, JSON.parse(raw));
            setError("");
        } catch (e: any) {
            setError(e?.message ?? "Invalid JSON");
        }
    };

    return (
        <TextField
            size="small"
            fullWidth
            multiline
            maxRows={6}
            placeholder={parameter.type === ApiParameterType.StringArray ? '["a", "b"]' : "{ }"}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            error={!!error}
            helperText={error}
        />
    );
}

function PicklistInput(props: ParameterInputProps) {
    const { parameter, setValue, removeValue } = props;
    const [text, setText] = useState<string>("");

    return (
        <TextField
            size="small"
            fullWidth
            type="number"
            placeholder="Option value"
            value={text}
            onChange={(e) => {
                setText(e.target.value);
                if (e.target.value === "") removeValue(parameter.uniqueName);
                else setValue(parameter.uniqueName, Number(e.target.value));
            }}
        />
    );
}

export default function ParameterInput(props: ParameterInputProps) {
    const { parameter, setValue, removeValue, theme } = props;

    const nodeProps = useMemo(
        () => ({
            value: null,
            reset: false,
            remove: false,
            disabled: false,
            manageDirty: { set: () => {}, remove: () => {} },
            attributeToUpdateManager: { setAttributesValue: setValue, removeAttributesValue: removeValue }
        }),
        [removeValue, setValue]
    );

    const msType = PARAMETER_MSTYPE[parameter.type];
    const attribute = useMemo(() => (msType ? toAttributeMetadata(parameter, msType) : null), [msType, parameter]);

    const input = (() => {
        if (parameter.type === ApiParameterType.EntityReference) return <EntityReferenceInput {...props} />;
        if (parameter.type === ApiParameterType.Picklist) return <PicklistInput {...props} />;
        if (JSON_PARAMETER_TYPES.includes(parameter.type) || !attribute) return <JsonInput {...props} />;

        switch (msType) {
            case MSType.Boolean:
                // No owning entity, so the node falls back to its default Yes/No labels.
                return <BooleanNode attribute={attribute} entityname="" {...nodeProps} />;
            case MSType.DateTime:
                return <DateTimeNode attribute={attribute} {...nodeProps} />;
            case MSType.Decimal:
                return <DecimalNode attribute={attribute} {...nodeProps} />;
            case MSType.Double:
                return <DoubleNode attribute={attribute} {...nodeProps} />;
            case MSType.Integer:
                return <IntegerNode attribute={attribute} {...nodeProps} />;
            case MSType.Money:
                return <MoneyNode attribute={attribute} {...nodeProps} />;
            default:
                return <StringNode attribute={attribute} {...nodeProps} />;
        }
    })();

    return (
        <Stack direction="column" spacing={0.25} width="100%">
            <Tooltip
                title={`${ApiParameterType[parameter.type]}${parameter.isOptional ? "" : " (required)"}`}
                placement="left">
                <Typography variant="caption" noWrap>
                    {parameter.displayName}
                    {!parameter.isOptional && " *"}
                </Typography>
            </Tooltip>
            {input}
        </Stack>
    );
}
