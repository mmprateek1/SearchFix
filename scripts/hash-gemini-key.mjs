import { createHash } from "node:crypto";
import { normalizeApiKey } from "../extension/key-format.js";

// Prompt without echo, shell-history arguments, files, or clipboard inspection.
if (!process.stdin.isTTY) {
    console.error("Run this command in an interactive terminal. Paste the key at the hidden prompt, not as a command argument.");
    process.exitCode = 1;
} else {
    process.stdout.write("Paste Gemini key (hidden), then press Enter: ");
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    let key = "";
    const finish = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); };
    process.stdin.on("data", chunk => {
        for (const char of chunk) {
            if (char === "\u0003") { key = ""; finish(); process.exit(130); }
            if (char === "\r" || char === "\n") {
                finish();
                try { key = normalizeApiKey(key); }
                catch (error) { console.error(error.message); key = ""; process.exit(1); }
                console.log(createHash("sha256").update(key).digest("hex"));
                key = ""; process.exit(0);
            }
            if (char === "\u007f" || char === "\b") key = key.slice(0, -1);
            // Preserve pasted characters, especially dots. Reject bad input
            // at submission instead of silently hashing an altered credential.
            else key += char;
        }
    });
}
