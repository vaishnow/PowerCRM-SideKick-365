export enum MessageType {
    GETCURRENTTABID = 'GetCurrentTabId',
    REFRESHBYPASSCACHE = 'RefreshBypassCache',

    IMPERSONATE = 'impersonate',
    GETIMPERSONATION = 'getImpersonation',
    RESETIMPERSONATION = 'resetImpersonation',

    SETCONFIGURATION = 'setConfiguration',
    GETCONFIGURATION = 'getConfiguration',

    // ENABLESCRIPTOVERRIDING = 'EnableScriptOverriding',
    // DISABLESCRIPTOVERRIDING = 'DisableScriptOverriding',
    // GETCURRENTSCRIPTOVERRIDING = 'GetCurrentScriptOverriding',
    // ISDEBUGGERATTACHED = 'IsDebuggerAttached',
    ADDWEBEDITORFAVFILES = 'addWebEditorFavFiles',
    REMOVEWEBEDITORFAVFILES = 'removeWebEditorFavFiles',

    OPENOPTIONS = 'OpenOptions',
}