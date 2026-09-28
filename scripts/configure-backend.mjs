import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function configureBackend(directory, value) {
    const url = new URL(value);
    const local = ["http://localhost:3000", "http://127.0.0.1:3000"].includes(url.origin);
    if ((!local && (url.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) || url.username || url.password || url.pathname !== "/" || url.search || url.hash || (!local && url.port)) {
        throw new Error("Use your exact HTTPS Render origin with no path, query, credentials, or port (or localhost:3000 for local testing).");
    }
    const manifestPath = path.join(directory, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.host_permissions = ["https://tv.datatracetitle.com/*", ...(local ? ["http://localhost:3000/*", "http://127.0.0.1:3000/*"] : [`${url.origin}/*`])];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    fs.writeFileSync(path.join(directory, "deployment.js"), `// Analysis service for this extension build. No credentials are stored here.\nexport const BACKEND_ORIGIN = ${JSON.stringify(url.origin)};\n`);
    return url.origin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    try {
        const root = fileURLToPath(new URL("../", import.meta.url));
        const origin = configureBackend(path.join(root, "extension"), process.argv[2]);
        const release = path.join(root, "SearchFix-extension", "extension");
        if (fs.existsSync(release)) configureBackend(release, origin);
        console.log(`Extension configured for ${origin}. Reload it and rebuild the extension ZIP before sharing.`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
