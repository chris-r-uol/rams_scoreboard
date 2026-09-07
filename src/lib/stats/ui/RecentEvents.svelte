<script lang="ts">
	import type { StatEvent, Player } from '../types';
	import { formatAction } from '../eventTypes';

	let {
		events,
		roster,
		onUndo,
		onDelete,
		onEdit
	}: {
		events: StatEvent[];
		roster: Player[];
		onUndo: () => void;
		onDelete: (event: StatEvent, index: number) => void;
		onEdit: (event: StatEvent) => void;
	} = $props();

	// One lookup map instead of a linear scan per row per render.
	const playersById = $derived(new Map(roster.map((p) => [p.id, p])));

	function nameOf(id: string): string {
		const p = playersById.get(id);
		if (p) return `#${p.number} ${p.playerName}`;
		return id === 'team' ? 'Team' : 'Unknown player';
	}

	/**
	 * The period is printed as recorded, with no "Q" added.
	 *
	 * Standalone, `quarter` held a bare "2" and needed the prefix. Here the
	 * scoreboard stamps a full label — Q2 in football, P1 in hockey, H1 in
	 * soccer — so prefixing produced "QQ2", and would have labelled a hockey
	 * period as a quarter.
	 */
	function formatTime(ts: number): string {
		return new Date(ts).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// Keep the original index so a delete can be undone back into position.
	const recent = $derived(
		events
			.map((event, index) => ({ event, index }))
			.reverse()
			.slice(0, 30)
	);
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
			Recent Events <span class="text-gray-600">({events.length})</span>
		</p>
		<button
			onclick={onUndo}
			disabled={events.length === 0}
			class="rounded bg-yellow-700 px-3 py-1 text-xs font-semibold text-white hover:bg-yellow-600 disabled:opacity-40"
		>↩ Undo Last</button>
	</div>

	{#if recent.length === 0}
		<p class="text-sm text-gray-500">No events recorded yet</p>
	{:else}
		<div class="max-h-72 space-y-1 overflow-y-auto pr-1">
			{#each recent as { event: ev, index } (ev.id)}
				{@const secondary = ev.secondaryPlayerId}
				<div class="flex items-start gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm">
					<div class="min-w-0 flex-1">
						<p class="text-xs text-gray-400">
							{formatTime(ev.timestamp)}{ev.quarter ? ` · ${ev.quarter}` : ''}{ev.gameClock
								? ` ${ev.gameClock}`
								: ''}
						</p>
						<p class="font-semibold text-white">{formatAction(ev.action)}</p>
						<p class="truncate text-xs text-gray-300">
							{nameOf(ev.primaryPlayerId)}
							{#if secondary}→ {nameOf(secondary)}{/if}
							{#if ev.yards !== undefined && ev.yards !== 0}
								&middot; {ev.yards > 0 ? '+' : ''}{ev.yards} yds
							{/if}
						</p>
						{#if ev.notes}<p class="text-xs text-yellow-300">📝 {ev.notes}</p>{/if}
					</div>
					<div class="flex shrink-0 flex-col gap-1">
						<button
							onclick={() => onEdit(ev)}
							class="text-xs text-blue-400 hover:text-blue-300"
							aria-label="Edit {formatAction(ev.action)}"
						>Edit</button>
						<button
							onclick={() => onDelete(ev, index)}
							class="text-xs text-red-400 hover:text-red-300"
							aria-label="Delete {formatAction(ev.action)}"
						>Del</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
