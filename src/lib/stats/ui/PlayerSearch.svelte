<script lang="ts">
	import type { Player } from '../types';
	import { POSITION_GROUPS, matchesGroup, type PositionGroup } from '../positions';
	import { getRecents, pushRecent } from '../uiPrefs.svelte';

	let {
		players,
		selected = $bindable(''),
		label = 'Select Player',
		placeholder = 'Search by name or #...',
		/** Recents are remembered per role, so the QB list is not polluted by tacklers. */
		recentsKey = label,
		compact = false,
		/**
		 * Marks this search box as a focus target for keyboard shortcuts. A prop
		 * binding would be lost when switching stat tabs remounts the panel, so
		 * the controller finds the input by this attribute instead.
		 */
		focusKey = ''
	}: {
		players: Player[];
		selected: string;
		label?: string;
		placeholder?: string;
		recentsKey?: string;
		compact?: boolean;
		focusKey?: string;
	} = $props();

	let search = $state('');
	let posFilter = $state<PositionGroup>('ALL');

	// $derived.by, not $derived(() => ...) — the latter derives the *function*,
	// so the body re-ran on every call with no memoisation.
	const filtered = $derived.by(() => {
		const s = search.trim().toLowerCase();
		return players.filter((p) => {
			if (!matchesGroup(p.position, posFilter)) return false;
			if (!s) return true;
			return p.playerName.toLowerCase().includes(s) || p.number.toLowerCase().includes(s);
		});
	});

	const selectedPlayer = $derived(players.find((p) => p.id === selected));
	const recentPlayers = $derived(
		getRecents(recentsKey)
			.map((id) => players.find((p) => p.id === id))
			.filter((p): p is Player => Boolean(p))
	);

	function select(id: string) {
		selected = id;
		pushRecent(recentsKey, id);
		search = '';
	}

	/** Enter in the search box picks the only remaining match — no mouse needed. */
	function onSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && filtered.length > 0) {
			e.preventDefault();
			e.stopPropagation();
			select(filtered[0].id);
		} else if (e.key === 'Escape' && search) {
			e.preventDefault();
			e.stopPropagation();
			search = '';
		}
	}
</script>

<div class="space-y-2">
	<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>

	<!--
		Fixed-height slot. Previously this element only existed once a player was
		picked, so selecting someone grew the panel and pushed the action buttons
		down (or off screen) mid-play.
	-->
	<div class="h-14">
		{#if selectedPlayer}
			<div class="flex h-full items-center gap-2 rounded-lg border-2 border-blue-500 bg-blue-900/40 px-3">
				<span class="text-lg font-bold text-white">#{selectedPlayer.number}</span>
				<div class="min-w-0">
					<p class="truncate font-semibold text-white">{selectedPlayer.playerName}</p>
					<p class="text-xs text-gray-300">{selectedPlayer.position}</p>
				</div>
				<button
					onclick={() => (selected = '')}
					class="ml-auto shrink-0 px-2 text-gray-400 hover:text-white"
					aria-label="Clear {label}"
				>✕</button>
			</div>
		{:else}
			<div class="flex h-full items-center rounded-lg border-2 border-dashed border-gray-700 px-3 text-sm text-gray-500">
				No {label.toLowerCase()} selected
			</div>
		{/if}
	</div>

	<input
		data-focus-key={focusKey || undefined}
		type="text"
		bind:value={search}
		onkeydown={onSearchKeydown}
		{placeholder}
		class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
	/>

	<div class="flex flex-wrap gap-1">
		{#each POSITION_GROUPS as pos}
			<button
				onclick={() => (posFilter = pos)}
				aria-pressed={posFilter === pos}
				class="rounded px-2 py-1 text-xs font-semibold transition {posFilter === pos
					? 'bg-blue-600 text-white'
					: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
			>{pos}</button>
		{/each}
	</div>

	<!-- Always rendered (empty when there are no recents) to keep height stable. -->
	<div class="min-h-[1.75rem]">
		{#if recentPlayers.length > 0 && !search}
			<div class="flex flex-wrap items-center gap-1">
				<span class="text-xs text-gray-500">Recent</span>
				{#each recentPlayers as p (p.id)}
					<button
						onclick={() => select(p.id)}
						class="rounded bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-600 {selected === p.id
							? 'ring-2 ring-blue-500'
							: ''}"
					>#{p.number} {p.playerName}</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="overflow-y-auto rounded-lg border border-gray-700 {compact ? 'max-h-32' : 'max-h-40'}">
		{#each filtered as player (player.id)}
			<button
				onclick={() => select(player.id)}
				class="flex w-full items-center gap-3 border-b border-gray-700 px-3 py-2 text-left last:border-b-0 hover:bg-gray-700 {selected ===
				player.id
					? 'bg-blue-900/60'
					: 'bg-gray-800'}"
			>
				<span class="w-8 text-right text-sm font-bold text-blue-400">#{player.number}</span>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-white">{player.playerName}</p>
					<p class="text-xs text-gray-400">{player.position}</p>
				</div>
			</button>
		{:else}
			<p class="px-3 py-2 text-sm text-gray-500">
				{players.length === 0 ? 'No roster loaded' : 'No players match this filter'}
			</p>
		{/each}
	</div>
</div>
