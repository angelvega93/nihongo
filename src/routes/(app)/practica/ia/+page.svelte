<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { cn } from '$lib/utils.js';
	import BotIcon from '@lucide/svelte/icons/bot';
	import MicIcon from '@lucide/svelte/icons/mic';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import SendIcon from '@lucide/svelte/icons/send';
	import Volume2Icon from '@lucide/svelte/icons/volume-2';
	import { onMount } from 'svelte';

	type Message = { role: 'user' | 'assistant'; content: string };
	type SpeechRecognitionResultEvent = Event & {
		resultIndex: number;
		results: SpeechRecognitionResultList;
	};
	type SpeechRecognitionErrorEvent = Event & { error: string };
	type SpeechRecognitionLike = EventTarget & {
		lang: string;
		continuous: boolean;
		interimResults: boolean;
		maxAlternatives: number;
		start(): void;
		stop(): void;
		abort(): void;
		onstart: (() => void) | null;
		onend: (() => void) | null;
		onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
		onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	};
	type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

	let messages = $state.raw<Message[]>([]);
	let draft = $state('');
	let interimTranscript = $state('');
	let speechSupported = $state(true);
	let listening = $state(false);
	let starting = $state(false);
	let sending = $state(false);
	let speaking = $state(false);
	let errorMessage = $state('');
	let recognition: SpeechRecognitionLike | undefined;
	let activePointerId: number | undefined;
	let holdingToTalk = false;
	let requestController: AbortController | undefined;
	let activeUtterance: SpeechSynthesisUtterance | undefined;

	const statusText = $derived(
		listening
			? 'Escuchando… suelta para enviar'
			: sending
				? 'Aiko está pensando…'
				: speaking
					? 'Aiko está hablando'
					: 'Mantén pulsado para hablar'
	);

	onMount(() => {
		const speechWindow = window as typeof window & {
			SpeechRecognition?: SpeechRecognitionConstructor;
			webkitSpeechRecognition?: SpeechRecognitionConstructor;
		};
		const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
		speechSupported = Boolean(Recognition);

		if (Recognition) {
			recognition = new Recognition();
			recognition.lang = 'es-MX';
			recognition.continuous = false;
			recognition.interimResults = true;
			recognition.maxAlternatives = 1;
			recognition.onstart = () => {
				starting = false;
				if (holdingToTalk) listening = true;
				else recognition?.stop();
			};
			recognition.onresult = (event) => {
				let finalText = '';
				let interimText = '';
				for (let index = event.resultIndex; index < event.results.length; index += 1) {
					const text = event.results[index][0]?.transcript ?? '';
					if (event.results[index].isFinal) finalText += text;
					else interimText += text;
				}
				interimTranscript = interimText;
				if (finalText.trim()) draft = `${draft} ${finalText}`.trim();
			};
			recognition.onerror = (event) => {
				starting = false;
				listening = false;
				if (event.error !== 'aborted' && event.error !== 'no-speech') {
					errorMessage =
						event.error === 'not-allowed'
							? 'Permite el acceso al micrófono para practicar con voz.'
							: 'No pude reconocer tu voz. Inténtalo de nuevo.';
				}
			};
			recognition.onend = () => {
				starting = false;
				listening = false;
				interimTranscript = '';
				if (draft.trim()) void sendMessage();
			};
		}

		return () => {
			recognition?.abort();
			requestController?.abort();
			if (activeUtterance) {
				activeUtterance.onstart = null;
				activeUtterance.onend = null;
				activeUtterance.onerror = null;
				activeUtterance = undefined;
			}
			window.speechSynthesis.cancel();
		};
	});

	function startListening(event?: PointerEvent) {
		if (!recognition || listening || starting || sending) return;
		if (event && (!event.isPrimary || (event.button !== 0 && event.pointerType === 'mouse')))
			return;
		if (event) {
			activePointerId = event.pointerId;
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}

		window.speechSynthesis.cancel();
		speaking = false;
		holdingToTalk = true;
		errorMessage = '';
		draft = '';
		interimTranscript = '';
		starting = true;
		try {
			recognition.start();
		} catch {
			starting = false;
		}
	}

	function stopListening(event?: PointerEvent) {
		if (event && activePointerId !== event.pointerId) return;
		activePointerId = undefined;
		holdingToTalk = false;
		if (recognition && (starting || listening)) {
			try {
				recognition.stop();
			} catch {
				listening = false;
			}
		}
	}

	function cancelListening() {
		activePointerId = undefined;
		holdingToTalk = false;
		starting = false;
		listening = false;
		recognition?.abort();
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
			event.preventDefault();
			startListening();
		}
	}

	function handleKeyup(event: KeyboardEvent) {
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			stopListening();
		}
	}

	async function sendMessage() {
		const content = draft.trim();
		if (!content || sending) return;

		const nextMessages = [...messages, { role: 'user' as const, content }].slice(-12);
		messages = nextMessages;
		draft = '';
		sending = true;
		errorMessage = '';
		requestController = new AbortController();

		try {
			const response = await fetch(resolve('/practica/ia'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: nextMessages }),
				signal: requestController.signal
			});
			const result = (await response.json().catch(() => null)) as {
				reply?: string;
				message?: string;
			} | null;
			if (!response.ok || !result?.reply)
				throw new Error(result?.message ?? 'No se pudo obtener respuesta.');

			messages = [...nextMessages, { role: 'assistant', content: result.reply }];
			speak(result.reply);
		} catch (cause) {
			if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
				errorMessage = cause instanceof Error ? cause.message : 'No se pudo obtener respuesta.';
			}
		} finally {
			sending = false;
			requestController = undefined;
		}
	}

	function speak(text: string) {
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'ja-JP';
		utterance.rate = 0.92;
		utterance.voice =
			window.speechSynthesis.getVoices().find((voice) => voice.lang.startsWith('ja')) ?? null;
		utterance.onstart = () => (speaking = true);
		utterance.onend = utterance.onerror = () => {
			speaking = false;
			activeUtterance = undefined;
		};
		activeUtterance = utterance;
		window.speechSynthesis.speak(utterance);
	}

	function resetConversation() {
		cancelListening();
		requestController?.abort();
		window.speechSynthesis.cancel();
		messages = [];
		draft = '';
		errorMessage = '';
		speaking = false;
	}
</script>

<svelte:head><title>Conversación IA | Kotoba</title></svelte:head>
<svelte:window onblur={cancelListening} />

<header class="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
	<div class="flex min-w-0 items-center gap-2">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item
					><Breadcrumb.Link href={resolve('/practica')}>Práctica</Breadcrumb.Link></Breadcrumb.Item
				>
				<Breadcrumb.Separator />
				<Breadcrumb.Item><Breadcrumb.Page>Conversación IA</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>
	<Button
		variant="ghost"
		size="icon"
		aria-label="Reiniciar conversación"
		title="Reiniciar conversación"
		onclick={resetConversation}
	>
		<RotateCcwIcon />
	</Button>
</header>

<main
	class="mx-auto grid w-full max-w-5xl flex-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:p-6"
>
	<section
		class="flex min-h-[calc(100vh-7rem)] min-w-0 flex-col overflow-hidden rounded-lg border bg-card"
	>
		<div class="flex items-center gap-3 border-b px-4 py-3">
			<div class="flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary">
				<BotIcon class="size-5" />
			</div>
			<div>
				<h1 class="font-semibold">Aiko</h1>
				<p class="text-xs text-muted-foreground">Tutora de conversación en japonés</p>
			</div>
		</div>

		<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
			{#if messages.length === 0}
				<div class="m-auto max-w-md text-center">
					<p class="font-serif text-3xl font-medium">話しましょう</p>
					<p class="mt-2 text-sm text-muted-foreground">
						Presiona el micrófono y saluda a Aiko para comenzar.
					</p>
				</div>
			{/if}
			{#each messages as message, index (`${message.role}-${index}`)}
				<div
					class={cn(
						'flex max-w-[85%] gap-2',
						message.role === 'user' ? 'ml-auto flex-row-reverse' : ''
					)}
				>
					<div
						class={cn(
							'rounded-lg px-4 py-3 text-sm leading-6',
							message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
						)}
					>
						{message.content}
					</div>
					{#if message.role === 'assistant'}
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Escuchar respuesta"
							title="Escuchar respuesta"
							onclick={() => speak(message.content)}><Volume2Icon /></Button
						>
					{/if}
				</div>
			{/each}
			{#if sending}<p class="text-sm text-muted-foreground">考えています…</p>{/if}
		</div>

		<div class="border-t p-4">
			<div class="flex items-end gap-2">
				<textarea
					bind:value={draft}
					rows={2}
					maxlength={2000}
					placeholder="También puedes escribir en japonés…"
					disabled={sending || listening}
					class="min-h-16 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
				></textarea>
				<Button
					size="icon-lg"
					aria-label="Enviar mensaje"
					title="Enviar mensaje"
					disabled={!draft.trim() || sending || listening}
					onclick={sendMessage}><SendIcon /></Button
				>
			</div>
			{#if interimTranscript}<p class="mt-2 text-sm text-muted-foreground">
					{interimTranscript}
				</p>{/if}
		</div>
	</section>

	<aside
		class="flex flex-col items-center justify-center gap-5 rounded-lg border bg-muted/35 p-6 text-center lg:min-h-[calc(100vh-7rem)]"
	>
		<div>
			<p class="font-serif text-xl font-medium">Tu turno</p>
			<p class="mt-1 text-sm text-muted-foreground" role="status">{statusText}</p>
		</div>
		<button
			type="button"
			class={cn(
				'flex size-32 touch-none items-center justify-center rounded-full border-8 border-background shadow-lg transition-transform select-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
				listening || starting
					? 'scale-105 bg-destructive text-white'
					: 'bg-primary text-primary-foreground hover:scale-[1.03]'
			)}
			disabled={!speechSupported || sending}
			aria-label="Mantén pulsado para hablar"
			aria-pressed={listening || starting}
			onpointerdown={startListening}
			onpointerup={stopListening}
			onpointercancel={cancelListening}
			onlostpointercapture={stopListening}
			onkeydown={handleKeydown}
			onkeyup={handleKeyup}
		>
			<MicIcon class="size-10" />
		</button>
		{#if !speechSupported}
			<p class="text-sm text-muted-foreground">
				Tu navegador no admite reconocimiento de voz. Usa el campo de texto.
			</p>
		{/if}
		{#if errorMessage}<p class="text-sm text-destructive" role="alert">{errorMessage}</p>{/if}
		<Card.Root class="w-full gap-2 text-left">
			<Card.Header><Card.Title class="text-sm">Privacidad</Card.Title></Card.Header>
			<Card.Content class="text-xs leading-5 text-muted-foreground"
				>El navegador procesa el audio mediante su servicio de voz. Solo la transcripción y el
				historial reciente se envían a OpenRouter.</Card.Content
			>
		</Card.Root>
	</aside>
</main>
