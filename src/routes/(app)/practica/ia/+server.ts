import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from '$app/env/private';
import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const messageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().trim().min(1).max(2_000)
});

const requestSchema = z.object({
	messages: z.array(messageSchema).min(1).max(12)
});

const openRouterResponseSchema = z.object({
	choices: z.array(
		z.object({
			message: z.object({ content: z.string() })
		})
	)
});

const SYSTEM_PROMPT = `Eres Aiko, una tutora de conversación de japonés paciente y natural.
Mantén una conversación adecuada para un estudiante principiante-intermedio.
Responde principalmente en japonés con frases breves (máximo 3 oraciones).
Si el estudiante comete un error importante, corrígelo con tacto en español en una línea corta y continúa la conversación en japonés.
Termina con una pregunta sencilla para mantener el diálogo. No uses markdown.`;

export const POST: RequestHandler = async ({ locals, request, fetch }) => {
	if (!locals.user) error(401, 'No autenticado');
	if (!OPENROUTER_API_KEY) error(503, 'OpenRouter no está configurado');

	const payload = requestSchema.safeParse(await request.json().catch(() => null));
	if (!payload.success) error(400, 'Conversación inválida');

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 30_000);

	try {
		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': request.headers.get('origin') ?? 'http://localhost',
				'X-Title': 'Kotoba'
			},
			body: JSON.stringify({
				model: OPENROUTER_MODEL || 'openai/gpt-4o-mini',
				messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...payload.data.messages],
				temperature: 0.7,
				max_tokens: 220
			}),
			signal: controller.signal
		});

		if (!response.ok) {
			if (response.status === 429) error(429, 'Has alcanzado el límite temporal de OpenRouter');
			error(502, 'OpenRouter no pudo responder');
		}

		const result = openRouterResponseSchema.safeParse(await response.json());
		const reply = result.success ? result.data.choices[0]?.message.content.trim() : '';
		if (!reply) error(502, 'OpenRouter devolvió una respuesta vacía');

		return json({ reply });
	} catch (cause) {
		if (cause instanceof DOMException && cause.name === 'AbortError') {
			error(504, 'OpenRouter tardó demasiado en responder');
		}
		throw cause;
	} finally {
		clearTimeout(timeout);
	}
};
