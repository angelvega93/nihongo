<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { Pathname } from '$app/types';
	import { Mascot } from '$lib/components/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Progress } from '$lib/components/ui/progress/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import BellIcon from '@lucide/svelte/icons/bell';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import SearchIcon from '@lucide/svelte/icons/search';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const firstName = $derived(data.user.name?.split(' ')[0] ?? data.user.name);
	const initial = $derived((data.user.name?.[0] ?? '?').toUpperCase());
	let initializingCards = $state(false);

	const learningPath = [
		{ label: '学', title: 'Japanese Beginner', subtitle: 'Your published course', progress: 0 }
	];

	const learningFocus = [
		{ label: 'Vocabulary', value: 60, class: '[&>div]:bg-primary' },
		{ label: 'Listening', value: 20, class: '[&>div]:bg-chart-2' },
		{ label: 'Kanji', value: 10, class: '[&>div]:bg-chart-3' }
	];

	const reviewRhythm = [
		{ day: 'S', count: 0, class: 'bg-chart-4' },
		{ day: 'M', count: 0, class: 'bg-chart-3' },
		{ day: 'T', count: 0, class: 'bg-chart-5' },
		{ day: 'W', count: 0, class: 'bg-chart-1' },
		{ day: 'T', count: 0, class: 'bg-chart-2' },
		{ day: 'F', count: 0, class: 'bg-chart-3' },
		{ day: 'S', count: 3, class: 'bg-primary' }
	];
	const reviewTotal = $derived(reviewRhythm.reduce((sum, day) => sum + day.count, 0));

	const currentLocale = $derived(getLocale());
	/** Language switch links, keeping the user on the current path. */
	const languageLinks = $derived(
		locales.map((locale) => ({
			locale,
			label: locale.toUpperCase(),
			href: resolve(localizeHref(page.url.pathname, { locale }) as Pathname)
		}))
	);
</script>

<header
	class="flex items-center justify-between gap-4 border-b border-border/60 bg-card/80 px-6 py-3 backdrop-blur"
>
	<div class="flex items-center gap-2">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mr-1 h-4" />
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item>
					<Breadcrumb.Link href="/" class="text-muted-foreground">Learning space</Breadcrumb.Link>
				</Breadcrumb.Item>
				<Breadcrumb.Separator />
				<Breadcrumb.Item>
					<Breadcrumb.Page>Resumen</Breadcrumb.Page>
				</Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
	</div>

	<div class="flex items-center gap-2">
		<Button variant="ghost" size="icon" class="rounded-full">
			<SearchIcon />
		</Button>
		<Button variant="ghost" size="icon" class="rounded-full">
			<BellIcon />
		</Button>
		<div
			class="flex items-center gap-1 rounded-full bg-foreground/90 p-1 text-xs font-medium text-background"
		>
			{#each languageLinks as link (link.locale)}
				<a
					href={link.href}
					class="rounded-full px-2.5 py-1 transition-colors {link.locale === currentLocale
						? 'bg-background text-foreground'
						: 'text-background/55 hover:text-background'}"
				>
					{link.label}
				</a>
			{/each}
		</div>
		<Avatar.Root class="size-9 ring-2 ring-primary/20">
			<Avatar.Fallback class="bg-primary/15 text-primary">{initial}</Avatar.Fallback>
		</Avatar.Root>
		<form method="post" action="?/signOut" use:enhance>
			<Button variant="ghost" size="icon" class="rounded-full" type="submit" title="Cerrar sesión">
				<LogOutIcon />
			</Button>
		</form>
	</div>
</header>

<div class="flex flex-1 flex-col gap-8 p-6 lg:p-8">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="space-y-1.5">
			<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Friday, September 12
			</p>
			<h1
				class="flex flex-wrap items-center gap-x-3 font-serif text-4xl font-medium tracking-tight"
			>
				Good morning, {firstName}
				<span class="text-primary">おはよう</span>
			</h1>
			<p class="text-sm text-muted-foreground">
				A little practice today keeps your Japanese moving forward.
			</p>
		</div>
		<div class="flex flex-col items-end gap-2">
			<div class="flex items-center gap-2">
				<form
					method="post"
					action="?/initializeCards"
					use:enhance={() => {
						initializingCards = true;
						return async ({ update }) => {
							initializingCards = false;
							await update();
						};
					}}
				>
					<Button
						type="submit"
						variant="outline"
						class="rounded-full border-primary/30 bg-card px-4 shadow-sm"
						disabled={initializingCards}
					>
						<LayersIcon data-icon="inline-start" />
						{initializingCards ? 'Inicializando…' : 'Inicializar tarjetas'}
					</Button>
				</form>
				<Button variant="outline" class="rounded-full border-primary/30 bg-card px-4 shadow-sm">
					View progress
				</Button>
			</div>
			<p class="text-xs text-muted-foreground">
				{data.cardsCount} / {data.notesCount} tarjetas listas
			</p>
			{#if form?.message}
				<p class="text-xs font-medium text-primary">{form.message}</p>
			{/if}
		</div>
	</div>

	<div class="grid gap-5 lg:grid-cols-3">
		<Card.Root
			class="relative justify-between gap-6 overflow-hidden border-none bg-linear-to-br from-primary to-orange-600 text-primary-foreground lg:col-span-2"
		>
			<div
				class="pointer-events-none absolute -top-10 -right-6 size-40 rounded-full bg-white/10"
			></div>
			<div
				class="pointer-events-none absolute right-24 -bottom-14 size-32 rounded-full bg-white/10"
			></div>

			<Card.Header class="relative">
				<div class="flex items-center justify-between">
					<Badge class="border-transparent bg-white/25 text-primary-foreground"
						>Your next step</Badge
					>
					<span class="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs">
						<ClockIcon class="size-3.5" />
						8 min
					</span>
				</div>
			</Card.Header>
			<Card.Content class="relative flex items-end justify-between gap-4">
				<div class="space-y-3">
					<p class="text-xs font-semibold tracking-widest text-white/80 uppercase">
						Recommended for you
					</p>
					<Card.Title
						class="max-w-md font-serif text-3xl leading-tight font-semibold text-balance text-primary-foreground"
					>
						Build confidence with everyday verbs.
					</Card.Title>
					<p class="max-w-sm text-sm text-white/85">
						Strengthen your listening and connect new words to the Japanese you already know.
					</p>
					<Button class="rounded-full bg-white text-primary shadow-sm hover:bg-white/90">
						Choose a deck
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				</div>
				<div class="relative hidden shrink-0 sm:block">
					<div class="absolute inset-0 scale-125 rounded-full bg-white/15 blur-2xl"></div>
					<Mascot class="relative size-28 drop-shadow-lg" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root
			class="relative justify-between gap-4 overflow-hidden border-primary/15 bg-accent/60"
		>
			<div
				class="pointer-events-none absolute -top-8 -right-8 size-28 rounded-full bg-primary/10"
			></div>
			<Card.Header class="relative">
				<div
					class="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase"
				>
					<SparklesIcon class="size-3.5" />
					Smart recommendation
				</div>
				<Card.Title class="font-serif text-lg font-medium">Learn this next</Card.Title>
			</Card.Header>
			<Card.Content class="relative space-y-4">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="font-serif text-3xl font-medium">行く</p>
						<p class="text-sm text-muted-foreground">いく &nbsp; ir</p>
					</div>
					<div class="shrink-0">
						<div
							class="max-w-28 rounded-2xl rounded-br-sm bg-card px-3 py-2 text-xs font-medium shadow-sm"
						>
							Adorable profesor
						</div>
						<Mascot class="mt-1 ml-auto size-12" />
					</div>
				</div>
				<div class="rounded-2xl bg-primary/10 p-3 text-xs text-accent-foreground">
					Conecta con contenido que ya conoces. It is one of the most useful N5 verbs.
				</div>
				<div class="space-y-1.5">
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Overall familiarity</span>
						<span>0%</span>
					</div>
					<Progress value={0} class="h-1.5" />
				</div>
				<a
					href="##"
					class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
				>
					Explore decks
					<ArrowRightIcon class="size-3.5" />
				</a>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
					Keep building
				</p>
				<h2 class="font-serif text-2xl font-medium">Your learning path</h2>
			</div>
			<a
				href="##"
				class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
			>
				See all
				<ArrowRightIcon class="size-3.5" />
			</a>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each learningPath as course (course.title)}
				<Card.Root class="border-primary/15 bg-accent/40">
					<Card.Content class="flex items-center gap-4">
						<div
							class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 font-serif text-xl text-primary"
						>
							{course.label}
						</div>
						<a href="##" class="flex flex-1 items-center justify-between gap-2">
							<div class="space-y-1.5">
								<p class="text-sm font-medium">{course.title}</p>
								<p class="text-xs text-muted-foreground">{course.subtitle}</p>
								<Progress value={course.progress} class="h-1 w-36" />
							</div>
							<span class="text-xs text-muted-foreground">{course.progress}%</span>
						</a>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</div>

	<div class="grid gap-5 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
							Personalise your tutor
						</p>
						<Card.Title class="font-serif text-lg font-medium">Learning focus</Card.Title>
					</div>
					<a href="##" class="text-sm font-medium text-primary hover:underline">Edit</a>
				</div>
				<Card.Description>
					Your priorities shape what we recommend and how we present it.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#each learningFocus as focus (focus.label)}
					<div class="space-y-1.5">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">{focus.label}</span>
							<span class="text-muted-foreground">{focus.value}%</span>
						</div>
						<Progress value={focus.value} class="h-2 {focus.class}" />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
							Last seven days
						</p>
						<Card.Title class="font-serif text-lg font-medium">Review rhythm</Card.Title>
					</div>
					<span class="flex items-center gap-1 text-sm font-medium text-primary">
						<FlameIcon class="size-4" />
						{reviewTotal} reviews
					</span>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex items-end justify-between gap-2">
					{#each reviewRhythm as day, i (i)}
						<div class="flex flex-1 flex-col items-center gap-2">
							<div
								class="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm transition-transform {day.class} {day.count
									? 'scale-100'
									: 'opacity-45'} hover:-translate-y-1"
							>
								<svg viewBox="0 0 24 24" class="size-6" aria-hidden="true">
									<circle cx="9" cy="10.5" r="1.6" fill="currentColor" />
									<circle cx="15" cy="10.5" r="1.6" fill="currentColor" />
									<path
										d="M9 14.5c1.7 1.8 4.3 1.8 6 0"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="round"
										fill="none"
									/>
								</svg>
							</div>
							<span class="text-sm font-semibold">{day.count}</span>
							<span class="-mt-1 text-xs text-muted-foreground">{day.day}</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
