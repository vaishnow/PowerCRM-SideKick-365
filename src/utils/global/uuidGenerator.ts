const uuidv4 = (() => {
    try {
        if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
            return () => (crypto as any).randomUUID();
        }
    } catch (e) {
        // ignore and fall back
    }

    return () => {
        // Browser fallback using crypto.getRandomValues
        const bytes = new Uint8Array(16);
        if (typeof crypto !== "undefined" && typeof (crypto as any).getRandomValues === "function") {
            (crypto as any).getRandomValues(bytes);
        } else {
            // Last-resort non-crypto fallback (very unlikely in modern browsers)
            for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
        }

        // Per RFC4122 v4
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const toHex = (b: number) => b.toString(16).padStart(2, "0");
        const parts = [
            Array.from(bytes.slice(0, 4)).map(toHex).join("") ,
            Array.from(bytes.slice(4, 6)).map(toHex).join("") ,
            Array.from(bytes.slice(6, 8)).map(toHex).join("") ,
            Array.from(bytes.slice(8, 10)).map(toHex).join("") ,
            Array.from(bytes.slice(10, 16)).map(toHex).join("")
        ];
        return `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}-${parts[4]}`;
    };
})();

export default uuidv4;