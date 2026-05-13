import type { ColorKey, Label } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { LabelSchema as LabelOutputSchema } from '../utils/output-schemas.js'
import { summarizeList } from '../utils/response-builders.js'
import { ToolNames } from '../utils/tool-names.js'

const { ADD_LABELS } = ToolNames

const ArgsSchema = {
    search: z
        .string()
        .optional()
        .describe(
            'Search for labels by name (partial match). If omitted, returns all personal labels.',
        ),
    limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .default(100)
        .describe('Maximum number of labels to return (default: 100, max 200).'),
}

const OutputSchema = {
    labels: z.array(LabelOutputSchema).describe('The matched labels.'),
    totalCount: z.number().describe('Total number of labels returned.'),
    appliedFilters: z.record(z.string(), z.unknown()).describe('The filters that were applied.'),
}

const findLabels = {
    name: ToolNames.FIND_LABELS,
    description:
        'Find personal labels by name, or list all of them. Returns id + metadata that can be used as task labels (the `labels` field on tasks references label names, not IDs).',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async execute(args, client) {
        const limit = args.limit ?? 100

        let results: Label[]
        if (args.search) {
            const response = await client.searchLabels({ query: args.search, limit })
            results = response.results
        } else {
            const response = await client.getLabels({ limit })
            results = response.results
        }

        const labels = results.map((l) => ({
            id: l.id,
            name: l.name,
            color: l.color as ColorKey,
            order: l.order,
            isFavorite: l.isFavorite,
        }))

        const previewLines =
            labels.length > 0
                ? labels.map((l) => `    ${l.name} • id=${l.id} • color=${l.color}`).join('\n')
                : undefined

        const subject = args.search ? `Labels matching "${args.search}"` : 'Personal labels'

        const zeroReasonHints: string[] = []
        if (args.search) {
            zeroReasonHints.push('Try a broader search term')
            zeroReasonHints.push('Check spelling')
            zeroReasonHints.push('Remove search to see all labels')
        } else {
            zeroReasonHints.push('No personal labels yet')
            zeroReasonHints.push(`Use ${ADD_LABELS} to create labels`)
        }

        return {
            textContent: summarizeList({
                subject,
                count: labels.length,
                previewLines,
                zeroReasonHints,
            }),
            structuredContent: {
                labels,
                totalCount: labels.length,
                appliedFilters: args,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { findLabels }
