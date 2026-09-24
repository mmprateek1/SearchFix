import { z } from "zod";

export const CommentSchema = z.object({
    date: z.string().optional(),
    time: z.string().optional(),
    author: z.string().optional(),
    text: z.string().min(1, "Comment text cannot be empty"),
    wfid: z.string().optional()
});

export const OrderInputSchema = z.object({
    orderNumber: z.string().min(1, "orderNumber is required"),
    borrower: z.string().optional(),
    location: z.string().optional(),
    county: z.string().optional(),
    parcelId: z.string().optional(),
    comments: z.array(CommentSchema).min(1, "comments array must contain at least one comment")
});
