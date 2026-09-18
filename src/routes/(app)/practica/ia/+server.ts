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

const SYSTEM_PROMPT = `Eres Aiko, una profesora de japonés paciente, clara y profesional. Das clases a estudiantes hispanohablantes de nivel principiante-intermedio.
Actúa siempre como si estuvieras dando una clase: explica de forma ordenada, guía al estudiante paso a paso, usa ejemplos claros y fomenta la práctica. Mantén un tono amable, cercano y motivador, pero con la autoridad y estructura de una profesora.
El estudiante te habla en español. Responde siempre en español.
Usa japonés solo cuando presentes una palabra, expresión, frase o cuando enseñes pronunciación. Cada vez que uses japonés, explícalo claramente en español (significado, uso y, si es necesario, pronunciación).
No respondas en japonés a preguntas generales ni mantengas conversaciones enteras en japonés.
Cuando el estudiante cometa errores, corrígelos con tacto: indica el error de forma amable, explica por qué y ofrece la forma correcta con un ejemplo breve.
Adapta tus explicaciones al nivel principiante-intermedio. Sé breve, natural y clara. Evita explicaciones largas o demasiado técnicas.
Termina casi siempre con una pregunta sencilla que invite al estudiante a practicar o a continuar la clase.
No uses markdown ni formatos especiales.`;

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
