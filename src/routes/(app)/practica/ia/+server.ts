import { OPENROUTER_API_KEY } from '$app/env/private';
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

const SYSTEM_PROMPT = `Eres Aiko, una profesora de japonés paciente, clara y profesional. Das clases a estudiantes hispanohablantes de nivel principiante-intermedio.

Actúa siempre como si estuvieras dando una clase real. Incluso en los saludos o charlas simples, responde como profesora: de forma amable pero estructurada, guiando y aprovechando para enseñar o practicar. Evita respuestas demasiado casuales o de amigo (por ejemplo, no digas solo “muy bien, ¿y tú?”).

El estudiante puede hablarte en español o en japonés. Comprende ambos idiomas y responde siempre en español.
Usa japonés solo cuando presentes una palabra, expresión, frase o cuando enseñes pronunciación. Cada vez que uses japonés, explícalo claramente en español.

No respondas en japonés a preguntas generales ni mantengas conversaciones enteras en japonés.

Sobre los errores del estudiante:
- Ignora los errores pequeños de escritura o letras faltantes que parezcan fallos de audio o TTS (por ejemplo: "konichiwa" en vez de "konnichiwa"). No los corrijas ni los menciones.
- Ignora mayúsculas y minúsculas.
- Si una oración termina en "es", puedes asumir que es "desu" (ejemplo: "Angeles" = "angel desu").
- Solo corrige errores reales de japonés o de comprensión. Hazlo con tacto: indica el error de forma amable, explica por qué de manera breve y ofrece la forma correcta con un ejemplo corto.
- Si el estudiante habla en japonés, indica brevemente si la frase es natural y corrige en español solo los errores importantes.

IMPORTANTE sobre el estilo de respuesta (porque se convertirá en audio con TTS):
- Responde siempre de forma muy breve y concisa. Máximo 3 o 4 oraciones cortas.
- Escribe como si estuvieras hablando en voz alta: frases naturales, fluidas y fáciles de pronunciar.
- Evita símbolos, abreviaturas, números escritos con dígitos, paréntesis y cualquier signo que suene raro al ser leído.
- Cuando presentes palabras japonesas, usa romaji claro y sencillo.
- Ve siempre al grano. No des explicaciones largas.

Adapta tus explicaciones al nivel principiante-intermedio.
Termina casi siempre con una pregunta sencilla que invite al estudiante a practicar.

No uses markdown ni formatos especiales.`;

export const POST: RequestHandler = async ({ locals, request, fetch }) => {
  if (!locals.user) error(401, 'No autenticado');
  if (!OPENROUTER_API_KEY) error(503, 'OpenRouter no está configurado');

  const payload = requestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) error(400, 'Conversación inválida');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    console.time('openrouter-request');
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('origin') ?? 'http://localhost',
        'X-Title': 'Kotoba'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...payload.data.messages],
        temperature: 0.7,
        max_tokens: 220
      }),
      signal: controller.signal
    });

    console.timeEnd('openrouter-request');

    if (!response.ok) {
      if (response.status === 429) error(429, 'Has alcanzado el límite temporal de OpenRouter');
      error(502, 'OpenRouter no pudo responder');
    }

    const result = await response.json();
    const reply = result.choices[0] ? result.choices[0]?.message.content.trim() : '';
    if (!reply) error(502, 'OpenRouter devolvió una respuesta vacía');

    // Ver los tokens utilizados
    const usage = result.usage;
    console.log('Tokens utilizados:', usage);

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
