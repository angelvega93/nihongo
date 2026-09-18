import { OPENROUTER_API_KEY } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const requestSchema = z.object({
	text: z.string().trim().min(1).max(2_000)
});

const TTS_MODEL = 'google/gemini-3.1-flash-tts-preview';
const TTS_VOICE = 'Kore';
const PCM_SAMPLE_RATE = 24_000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

function pcmToWav(pcm: ArrayBuffer): ArrayBuffer {
	const headerSize = 44;
	const wav = new ArrayBuffer(headerSize + pcm.byteLength);
	const view = new DataView(wav);
	const bytes = new Uint8Array(wav);
	const blockAlign = (PCM_CHANNELS * PCM_BITS_PER_SAMPLE) / 8;
	const byteRate = PCM_SAMPLE_RATE * blockAlign;

	function writeAscii(offset: number, value: string) {
		for (let index = 0; index < value.length; index += 1) {
			view.setUint8(offset + index, value.charCodeAt(index));
		}
	}

	writeAscii(0, 'RIFF');
	view.setUint32(4, 36 + pcm.byteLength, true);
	writeAscii(8, 'WAVE');
	writeAscii(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, PCM_CHANNELS, true);
	view.setUint32(24, PCM_SAMPLE_RATE, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, PCM_BITS_PER_SAMPLE, true);
	writeAscii(36, 'data');
	view.setUint32(40, pcm.byteLength, true);
	bytes.set(new Uint8Array(pcm), headerSize);

	return wav;
}

export const POST: RequestHandler = async ({ locals, request, fetch }) => {
	if (!locals.user) error(401, 'No autenticado');
	if (!OPENROUTER_API_KEY) error(503, 'OpenRouter no está configurado');

	const payload = requestSchema.safeParse(await request.json().catch(() => null));
	if (!payload.success) error(400, 'Texto inválido');

	const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${OPENROUTER_API_KEY}`,
			'Content-Type': 'application/json',
			'HTTP-Referer': request.headers.get('origin') ?? 'http://localhost',
			'X-Title': 'Kotoba'
		},
		body: JSON.stringify({
			model: TTS_MODEL,
			input: payload.data.text,
			voice: TTS_VOICE,
			response_format: 'pcm'
		}),
		signal: AbortSignal.timeout(30_000)
	});

	if (!response.ok) {
		if (response.status === 429) error(429, 'Has alcanzado el límite temporal de OpenRouter');
		error(502, 'Gemini TTS no pudo generar el audio');
	}

	const wav = pcmToWav(await response.arrayBuffer());

	return new Response(wav, {
		headers: {
			'Content-Type': 'audio/wav',
			'Cache-Control': 'private, no-store'
		}
	});
};