<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Mascot } from '$lib/components/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import FlameIcon from '@lucide/svelte/icons/flame';
	import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
	import HomeIcon from '@lucide/svelte/icons/home';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';

	let { children }: { children: import('svelte').Snippet } = $props();

	const navItems = [
		{ label: 'Resumen', icon: HomeIcon, href: '/' },
		{ label: 'Cursos', icon: GraduationCapIcon, href: '/cursos' },
		{ label: 'Práctica', icon: ListChecksIcon, href: '/practica', badge: 7 },
		{ label: 'Decks', icon: LayersIcon, href: '/decks' },
		{ label: 'Diccionario', icon: BookOpenIcon, href: '/diccionario' }
	];

	/** A nav item is active when the current path is its href or a child route. */
	function isActive(href: string) {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
	}
</script>

<Sidebar.Provider>
	<Sidebar.Root variant="inset" class="border-none">
		<Sidebar.Header>
			<div class="flex items-center gap-3 px-2 py-2">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-white/90">
					<Mascot class="size-8" />
				</div>
				<div class="grid leading-tight">
					<p class="text-sm font-semibold">Kotoba</p>
					<p class="text-xs text-sidebar-foreground/55">Japanese tutor</p>
				</div>
			</div>
		</Sidebar.Header>

		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupLabel class="text-sidebar-foreground/45"
					>Espacio de estudio</Sidebar.GroupLabel
				>
				<Sidebar.GroupContent>
					<Sidebar.Menu class="gap-1">
						{#each navItems as item (item.label)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={isActive(item.href)}
									class="h-10 rounded-xl px-3 text-sidebar-foreground/75 transition-colors hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-sm data-active:[&_svg]:text-primary"
								>
									{#snippet child({ props })}
										<a href={resolve(item.href as Pathname)} {...props}>
											<item.icon />
											<span class="font-medium">{item.label}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
								{#if item.badge}
									<Sidebar.MenuBadge
										class="border-transparent! bg-primary text-primary-foreground!"
									>
										{item.badge}
									</Sidebar.MenuBadge>
								{/if}
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>

		<Sidebar.Footer>
			<div class="flex items-center gap-3 rounded-2xl bg-sidebar-accent p-3">
				<div
					class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"
				>
					<FlameIcon class="size-4" />
				</div>
				<div class="grid flex-1 leading-tight">
					<p class="text-xs text-sidebar-foreground/55">Repasos pendientes</p>
					<p class="text-sm font-semibold">7 tarjetas</p>
				</div>
				<Badge class="bg-primary text-primary-foreground">3</Badge>
			</div>
		</Sidebar.Footer>
	</Sidebar.Root>

	<Sidebar.Inset class="border-border/60 bg-card">
		{@render children?.()}
	</Sidebar.Inset>
</Sidebar.Provider>
