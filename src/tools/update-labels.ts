import type { ColorKey, Label } from '@doist/todoist-api-typescript'
import { z } from 'zod'
import type { TodoistTool } from '../todoist-tool.js'
import { ColorSchema } from '../utils/colors.js'
import { LabelSchema as LabelOutputSchema } from '../utils/output-schemas.js'
import { ToolNames } from '../utils/tool-names.js'

const LabelUpdateSchema = z.object({
    id: z.string().min(1).describe('The ID of the label to update.'),
    name: z.string().min(1).optional().describe('New name for the label.'),
    color: ColorSchema,
    order: z.number().int().optional().describe('New display order.'),
    isFavorite: z
        .boolean()
        .optional()
        .describe('Mark the label as favorite (true) or unmark (false).'),
})

const ArgsSchema = {
    labels: z.array(LabelUpdateSchema).min(1).describe('The labels to update.'),
}

const OutputSchema = {
    labels: z.array(LabelOutputSchema).describe('The updated labels.'),
    totalCount: z.number().describe('The total number of labels updated.'),
    updatedLabelIds: z.array(z.string()).describe('The IDs of the updated labels.'),
}

const updateLabels = {
    name: ToolNames.UPDATE_LABELS,
    description:
        'Update one or more existing personal labels. Only provided fields are changed; omitted fields stay as-is.',
    parameters: ArgsSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    async execute({ labels }, client) {
        const updated = await Promise.all(
            labels.map((label) => {
                const updates: Parameters<typeof client.updateLabel>[1] = {}
                if (label.name !== undefined) updates.name = label.name
                if (label.color !== undefined) updates.color = label.color
                if (label.order !== undefined) updates.order = label.order
                if (label.isFavorite !== undefined) updates.isFavorite = label.isFavorite
                return client.updateLabel(label.id, updates)
            }),
        )

        const list = updated.map((l) => `• ${l.name} (id=${l.id}, color=${l.color})`).join('\n')
        const count = updated.length
        const textContent = `Updated ${count} label${count === 1 ? '' : 's'}:\n${list}`

        return {
            textContent,
            structuredContent: {
                labels: updated.map((l: Label) => ({
                    id: l.id,
                    name: l.name,
                    color: l.color as ColorKey,
                    order: l.order,
                    isFavorite: l.isFavorite,
                })),
                totalCount: updated.length,
                updatedLabelIds: updated.map((l) => l.id),
            },
        }
    },
} satisfies TodoistTool<typeof ArgsSchema, typeof OutputSchema>

export { updateLabels }
