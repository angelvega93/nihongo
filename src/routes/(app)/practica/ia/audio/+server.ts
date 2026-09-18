import { OPENROUTER_API_KEY } from '$app/env/private';
import { SonioxNodeClient } from "@soniox/node";
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const requestSchema = z.object({
  text: z.string().trim().min(1).max(2_000)
});

const client = new SonioxNodeClient({
  api_key: 'snx_proj_AQRRW7TAjB0TkhkiN8K1wJLpKdRgJlbeUfBY1l2YIEqC.WzPWlrkANUNXs9xndqy1AFVd6MSplwNnRKPP-Bz-mLkYknUFrv99Hoxsu2tSi0eIdzgLamNfTiJqA4UNyEsgBg.EngMEg'
});

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) error(401, 'No autenticado');
  if (!OPENROUTER_API_KEY) error(503, 'OpenRouter no está configurado');

  const payload = requestSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) error(400, 'Texto inválido');

  const stream = await client.realtime.tts({
    voice: 'Adrian',
    model: 'tts-rt-v2',
    language: 'ja',
    audio_format: 'pcm_s16le'
  });

  stream.sendText(payload.data.text, { end: true });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          controller.enqueue(chunk);
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'audio/pcm',
      'Cache-Control': 'no-store',
      'Transfer-Encoding': 'chunked'
    }
  });
};