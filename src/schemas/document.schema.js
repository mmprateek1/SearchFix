import { z } from "zod";
import { DOCUMENT_TYPES } from "../config/documentMappings.js";

export const DocumentMetadataSchema = z.object({
    fileName: z.string().min(1, "fileName is required"),
    fileType: z.enum(DOCUMENT_TYPES, {
        errorMap: () => ({ message: "Invalid document type" })
    }),
    filePath: z.string().optional()
});
