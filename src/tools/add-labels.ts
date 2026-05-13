import type { ColorKey, Label } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { ColorSchema } from '../utils/colors.js'
import { LabelSchema as LabelOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const LabelInputSchema = z.object({
    name: z.string().min(1).describe('The name of the label.'),
    color: ColorSchema,
    order: z.number().int().optional().describe('The display order of the label (optional).'),
    isFavorite: z
        .boolean()
        .optional()
        .describe('Whether to mark the label as favorite (default false).'),
})

const ArgsSchema = {
    labels: z.array(LabelInputSchema).min(1).describe('The labels to create.'),
}

const OutputSchema = {
    labels: z.array(LabelOutputSchema).describe('The created labels.'),
    totalCount: z.number().describe('The total number of labels created.'),
}

const addLabels = {
    name: ToolNames.ADD_LABELS,
    description:
        'Create one or more personal labels. Returns the created label objects including their IDs. Personal labels can then be attached to tasks via the `labels` field on add-tasks / update-tasks.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async execute({ labels }, client) {
        const created = await Promise.all(
            labels.map((label) => {
                const args: Parameters<typeof client.addLabel>[0] = { name: label.name }
                if (label.color !== undefined) args.color = label.color
                if (label.order !== undefined) args.order = label.order
                if (label.isFavorite !== undefined) args.isFavorite = label.isFavorite
                return client.addLabel(args)
            }),
        )

        const list = created.map((l) => `• ${l.name} (id=${l.id}, color=${l.color})`).join('\n')
        const count = created.length
        const textContent = `Added ${count} label${count === 1 ? '' : 's'}:\n${list}`

        return {
            textContent,
            structuredContent: {
                labels: created.map((l: Label) => ({
                    id: l.id,
                    name: l.name,
                    color: l.color as ColorKey,
                    order: l.order,
                    isFavorite: l.isFavorite,
                })),
                totalCount: created.length,
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { addLabels }
