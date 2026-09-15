<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { page } from '$app/state';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import HomeIcon from '@lucide/svelte/icons/home';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import FlameIcon from '@lucide/svelte/icons/flame';

	let { children }: { children: import('svelte').Snippet } = $props();

	const navItems = [
		{ label: 'Resumen', icon: HomeIcon, href: '/' },
		{ label: 'Aprender', icon: PencilIcon, href: '/aprender' },
		{ label: 'Práctica', icon: ListChecksIcon, href: '/practica', badge: 7 },
		{ label: 'Cursos', icon: GraduationCapIcon, href: '/cursos' },
		{ label: 'Decks', icon: LayersIcon, href: '/decks' }
	];

	/** A nav item is active when the current path is its href or a child route. */
	function isActive(href: string) {
		const path = page.url.pathname;
		return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
	}
</script>

<Sidebar.Provider>
	<div class="dark contents">
		<Sidebar.Root>
			<Sidebar.Header>
				<div class="flex items-center gap-2 px-2 py-1.5">
					<div class="flex size-9 items-center justify-center rounded-lg bg-orange-500">
						<BookOpenIcon class="size-5" />
					</div>
					<div>
						<p class="text-sm leading-none font-semibold">Kotoba</p>
						<p class="mt-1 text-xs text-sidebar-foreground/60">Japanese tutor</p>
					</div>
				</div>
			</Sidebar.Header>

			<Sidebar.Content>
				<Sidebar.Group>
					<Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
					<Sidebar.GroupContent>
						<Sidebar.Menu>
							{#each navItems as item (item.label)}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton isActive={isActive(item.href)}>
										{#snippet child({ props })}
											<a href={item.href} {...props}>
												<item.icon />
												<span>{item.label}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
									{#if item.badge}
										<Sidebar.MenuBadge>{item.badge}</Sidebar.MenuBadge>
									{/if}
								</Sidebar.MenuItem>
							{/each}
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>
			</Sidebar.Content>

			<Sidebar.Footer>
				<div class="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
					<div
						class="flex size-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400"
					>
						<FlameIcon class="size-4" />
					</div>
					<div class="flex-1">
						<p class="text-xs text-sidebar-foreground/60">Reviews due</p>
						<p class="text-sm font-semibold">7 cards</p>
					</div>
					<Badge variant="secondary">3</Badge>
				</div>
			</Sidebar.Footer>
		</Sidebar.Root>
	</div>

	<Sidebar.Inset>
		{@render children?.()}
	</Sidebar.Inset>
</Sidebar.Provider>
