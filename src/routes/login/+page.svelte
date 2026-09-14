<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Checkbox } from "$lib/components/ui/checkbox/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import MailIcon from "@lucide/svelte/icons/mail";
	import LockIcon from "@lucide/svelte/icons/lock";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import type { ActionData } from "./$types";

	let { form }: { form: ActionData } = $props();

	let tab = $state("login");
	let showPassword = $state(false);
	let locale = $state<"es" | "en">("es");
	let signingIn = $state(false);
	let signingUp = $state(false);
</script>

<div class="grid min-h-svh lg:grid-cols-2">
	<div class="relative hidden flex-col justify-between overflow-hidden bg-neutral-900 p-10 text-neutral-50 lg:flex">
		<div class="flex items-center gap-2">
			<div class="flex size-9 items-center justify-center rounded-lg bg-orange-500">
				<BookOpenIcon class="size-5" />
			</div>
			<div>
				<p class="font-semibold leading-none">Kotoba</p>
				<p class="text-xs text-neutral-400">Japanese tutor</p>
			</div>
		</div>

		<div class="space-y-6">
			<p class="text-xs font-semibold tracking-widest text-orange-400 uppercase">Aprende con intención</p>
			<h1 class="text-4xl leading-tight font-serif font-medium">
				Haz del japonés<br />parte de tu día.
			</h1>
			<p class="max-w-sm text-sm text-neutral-400">
				Cursos, práctica y repetición espaciada que se adapta a tu forma de aprender.
			</p>
			<div class="flex items-start gap-3 border-l-2 border-orange-500 pl-4">
				<div>
					<p class="text-lg">毎日、少しずつ。</p>
					<p class="text-xs text-neutral-500">A little every day.</p>
				</div>
			</div>
		</div>

		<div class="flex gap-6 text-xs text-neutral-500">
			<span>Hiragana</span>
			<span>Vocabulary</span>
			<span>Listening</span>
		</div>

		<div class="pointer-events-none absolute -right-16 -bottom-16 text-[220px] leading-none font-serif text-neutral-800 select-none">
			字
		</div>
	</div>

	<div class="relative flex flex-col items-center justify-center gap-8 p-6 sm:p-10">
		<div class="absolute top-6 right-6 flex items-center gap-1 rounded-full bg-neutral-900 p-1 text-xs font-medium text-neutral-50">
			<button
				class="rounded-full px-2.5 py-1 {locale === 'es' ? 'bg-neutral-50 text-neutral-900' : 'text-neutral-400'}"
				onclick={() => (locale = "es")}
			>
				ES
			</button>
			<button
				class="rounded-full px-2.5 py-1 {locale === 'en' ? 'bg-neutral-50 text-neutral-900' : 'text-neutral-400'}"
				onclick={() => (locale = "en")}
			>
				EN
			</button>
		</div>

		<div class="w-full max-w-sm space-y-6">
			<div class="space-y-1">
				<p class="text-xs font-semibold tracking-widest text-orange-500 uppercase">Te damos la bienvenida</p>
				<h2 class="font-serif text-3xl font-medium">Continúa aprendiendo.</h2>
				<p class="text-sm text-muted-foreground">Retoma tu aprendizaje de japonés donde lo dejaste.</p>
			</div>

			<Tabs.Root bind:value={tab} class="w-full">
				<Tabs.List class="w-full">
					<Tabs.Trigger value="login" class="flex-1">Iniciar sesión</Tabs.Trigger>
					<Tabs.Trigger value="signup" class="flex-1">Crear cuenta</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="login">
					<form
						class="space-y-4"
						method="post"
						action="?/signInEmail"
						use:enhance={() => {
							signingIn = true;
							return async ({ update }) => {
								signingIn = false;
								await update();
							};
						}}
					>
						{#if form?.message && tab === "login"}
							<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.message}</p>
						{/if}
						<Field.FieldGroup>
							<Field.Field>
								<Field.FieldLabel for="email">Correo electrónico</Field.FieldLabel>
								<div class="relative">
									<MailIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input id="email" name="email" type="email" placeholder="you@example.com" class="pl-9" required />
								</div>
							</Field.Field>

							<Field.Field>
								<Field.FieldLabel for="password">Contraseña</Field.FieldLabel>
								<div class="relative">
									<LockIcon class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									{#if showPassword}
										<Input id="password" name="password" type="text" placeholder="Al menos 8 caracteres" class="px-9" required />
									{:else}
										<Input id="password" name="password" type="password" placeholder="Al menos 8 caracteres" class="px-9" required />
									{/if}
									<button
										type="button"
										class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground"
										onclick={() => (showPassword = !showPassword)}
									>
										{#if showPassword}
											<EyeOffIcon class="size-4" />
										{:else}
											<EyeIcon class="size-4" />
										{/if}
									</button>
								</div>
							</Field.Field>
						</Field.FieldGroup>

						<div class="flex items-center justify-between text-sm">
							<label class="flex items-center gap-2 text-muted-foreground">
								<Checkbox id="remember" />
								Recordarme
							</label>
							<a href="##" class="font-medium text-orange-500 hover:underline">¿Olvidaste tu contraseña?</a>
						</div>

						<Button type="submit" class="w-full bg-orange-500 hover:bg-orange-500/90" disabled={signingIn}>
							{signingIn ? "Entrando…" : "Entrar"}
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</form>
				</Tabs.Content>

				<Tabs.Content value="signup">
					<form
						class="space-y-4"
						method="post"
						action="?/signUpEmail"
						use:enhance={() => {
							signingUp = true;
							return async ({ update }) => {
								signingUp = false;
								await update();
							};
						}}
					>
						{#if form?.message && tab === "signup"}
							<p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{form.message}</p>
						{/if}
						<Field.FieldGroup>
							<Field.Field>
								<Field.FieldLabel for="name">Nombre</Field.FieldLabel>
								<Input id="name" name="name" placeholder="Tu nombre" required />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="signup-email">Correo electrónico</Field.FieldLabel>
								<Input id="signup-email" name="email" type="email" placeholder="you@example.com" required />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="signup-password">Contraseña</Field.FieldLabel>
								<Input id="signup-password" name="password" type="password" placeholder="Al menos 8 caracteres" required />
							</Field.Field>
						</Field.FieldGroup>

						<Button type="submit" class="w-full bg-orange-500 hover:bg-orange-500/90" disabled={signingUp}>
							{signingUp ? "Creando cuenta…" : "Crear cuenta"}
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</form>
				</Tabs.Content>
			</Tabs.Root>

			<p class="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
				<ShieldCheckIcon class="size-3.5" />
				Tu progreso es privado y te pertenece
			</p>
		</div>
	</div>
</div>
