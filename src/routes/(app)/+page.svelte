<script lang="ts">
	import { enhance } from "$app/forms";
	import * as Card from "$lib/components/ui/card/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Progress } from "$lib/components/ui/progress/index.js";
	import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import SearchIcon from "@lucide/svelte/icons/search";
	import BellIcon from "@lucide/svelte/icons/bell";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import type { PageData } from "./$types";

	let { data }: { data: PageData } = $props();

	const firstName = $derived(data.user.name?.split(" ")[0] ?? data.user.name);
	const initial = $derived((data.user.name?.[0] ?? "?").toUpperCase());

	const learningPath = [
		{ label: "学", title: "Japanese Beginner", subtitle: "Your published course", progress: 0 },
	];

	const learningFocus = [
		{ label: "Vocabulary", value: 60, class: "[&>div]:bg-orange-500" },
		{ label: "Listening", value: 20, class: "[&>div]:bg-slate-700" },
		{ label: "Kanji", value: 10, class: "[&>div]:bg-neutral-400" },
	];

	const reviewRhythm = [
		{ day: "S", value: 0 },
		{ day: "M", value: 0 },
		{ day: "T", value: 0 },
		{ day: "W", value: 0 },
		{ day: "T", value: 0 },
		{ day: "F", value: 0 },
		{ day: "S", value: 3 },
	];
	const reviewMax = 5;
</script>

<header class="flex items-center justify-between gap-4 border-b px-6 py-3">
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
		<div class="flex items-center gap-1 rounded-full bg-neutral-900 p-1 text-xs font-medium text-neutral-50">
			<span class="rounded-full bg-neutral-50 px-2.5 py-1 text-neutral-900">ES</span>
			<span class="px-2.5 py-1 text-neutral-400">EN</span>
		</div>
		<Avatar.Root class="size-9">
			<Avatar.Fallback>{initial}</Avatar.Fallback>
		</Avatar.Root>
		<form method="post" action="?/signOut" use:enhance>
			<Button variant="ghost" size="icon" class="rounded-full" type="submit" title="Cerrar sesión">
				<LogOutIcon />
			</Button>
		</form>
	</div>
</header>

<div class="flex flex-1 flex-col gap-8 p-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="space-y-1">
			<p class="text-xs font-medium text-muted-foreground uppercase">Friday, September 12</p>
			<h1 class="flex items-center gap-2 font-serif text-3xl font-medium">
				Good morning, {firstName}
				<span class="text-2xl">おはよう</span>
			</h1>
			<p class="text-sm text-muted-foreground">A little practice today keeps your Japanese moving forward.</p>
		</div>
		<Button variant="outline">View progress</Button>
	</div>

	<div class="grid gap-4 lg:grid-cols-3">
		<Card.Root class="justify-between gap-6 overflow-hidden border-none bg-orange-500 text-orange-50 lg:col-span-2">
			<Card.Header>
				<div class="flex items-center justify-between">
					<Badge variant="secondary" class="bg-orange-400/40 text-orange-50">Your next step</Badge>
					<span class="flex items-center gap-1 text-xs text-orange-100">
						<ClockIcon class="size-3.5" />
						8 min
					</span>
				</div>
			</Card.Header>
			<Card.Content class="flex items-end justify-between gap-4">
				<div class="space-y-3">
					<p class="text-xs font-medium tracking-widest text-orange-100 uppercase">Recommended for you</p>
					<Card.Title class="font-serif text-2xl leading-snug font-medium text-balance">
						Build confidence with everyday verbs.
					</Card.Title>
					<p class="max-w-sm text-sm text-orange-100">
						Strengthen your listening and connect new words to the Japanese you already know.
					</p>
					<Button class="bg-orange-50 text-orange-600 hover:bg-orange-50/90">
						Choose a deck
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
				</div>
				<span class="hidden font-serif text-8xl text-orange-400/60 sm:block">行</span>
			</Card.Content>
		</Card.Root>

		<Card.Root class="justify-between gap-4 bg-rose-50">
			<Card.Header>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
						<SparklesIcon class="size-3.5" />
						Smart recommendation
					</div>
				</div>
				<Card.Title>Learn this next</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div>
					<p class="text-3xl font-medium">行く</p>
					<p class="text-sm text-muted-foreground">いく &nbsp; ir</p>
				</div>
				<div class="rounded-lg bg-orange-100/60 p-3 text-xs text-orange-800">
					Conecta con contenido que ya conoces. It is one of the most useful N5 verbs.
				</div>
				<div class="space-y-1.5">
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Overall familiarity</span>
						<span>0%</span>
					</div>
					<Progress value={0} class="h-1.5" />
				</div>
				<a href="##" class="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:underline">
					Explore decks
					<ArrowRightIcon class="size-3.5" />
				</a>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-xs font-medium text-muted-foreground uppercase">Keep building</p>
				<h2 class="font-serif text-xl font-medium">Your learning path</h2>
			</div>
			<a href="##" class="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:underline">
				See all
				<ArrowRightIcon class="size-3.5" />
			</a>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each learningPath as course (course.title)}
				<Card.Root>
					<Card.Content class="flex items-center gap-4">
						<div class="flex size-11 items-center justify-center rounded-lg bg-rose-100 font-serif text-xl">
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

	<div class="grid gap-4 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-medium text-muted-foreground uppercase">Personalise your tutor</p>
						<Card.Title>Learning focus</Card.Title>
					</div>
					<a href="##" class="text-sm font-medium text-orange-500 hover:underline">Edit</a>
				</div>
				<Card.Description>Your priorities shape what we recommend and how we present it.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				{#each learningFocus as focus (focus.label)}
					<div class="space-y-1.5">
						<div class="flex items-center justify-between text-sm">
							<span>{focus.label}</span>
							<span class="text-muted-foreground">{focus.value}%</span>
						</div>
						<Progress value={focus.value} class={focus.class} />
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-xs font-medium text-muted-foreground uppercase">Last seven days</p>
						<Card.Title>Review rhythm</Card.Title>
					</div>
					<span class="text-sm font-medium text-orange-500">3 reviews</span>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex h-32 items-end justify-between gap-2">
					{#each reviewRhythm as day, i (i)}
						<div class="flex flex-1 flex-col items-center gap-2">
							<div class="flex h-24 w-full items-end">
								<div
									class="w-full rounded-sm {day.value > 0 ? 'bg-orange-500' : 'bg-muted'}"
									style="height: {Math.max((day.value / reviewMax) * 100, 6)}%"
								></div>
							</div>
							<span class="text-xs text-muted-foreground">{day.day}</span>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
