<script lang="ts">
	import type { Player, StatEvent } from '../types';
	import Modal from './Modal.svelte';
	import PlayerSearch from './PlayerSearch.svelte';

	let {
		roster,
		onRecord,
		onClose
	}: {
		roster: Player[];
		onRecord: (event: Omit<StatEvent, 'id' | 'timestamp'>) => void;
		onClose: () => void;
	} = $props();

	/**
	 * Adjustments are recorded as ordinary events with a dotted `statKey` path,
	 * so a correction after an official yardage change stays visible in the event
	 * log and the export rather than silently rewriting a total.
	 */
	const ADJUSTABLE: { key: string; label: string }[] = [
		{ key: 'passing.yards', label: 'Passing yards' },
		{ key: 'passing.attempts', label: 'Pass attempts' },
		{ key: 'passing.completions', label: 'Completions' },
		{ key: 'passing.touchdowns', label: 'Passing TDs' },
		{ key: 'rushing.yards', label: 'Rushing yards' },
		{ key: 'rushing.attempts', label: 'Rush attempts' },
		{ key: 'rushing.touchdowns', label: 'Rushing TDs' },
		{ key: 'receiving.yards', label: 'Receiving yards' },
		{ key: 'receiving.receptions', label: 'Receptions' },
		{ key: 'receiving.touchdowns', label: 'Receiving TDs' },
		{ key: 'defence.tackles', label: 'Tackles' },
		{ key: 'defence.sacks', label: 'Sacks' },
		{ key: 'defence.interceptions', label: 'Interceptions' }
	];

	let playerId = $state('');
	let statKey = $state('rushing.yards');
	let delta = $state(0);
	let notes = $state('');

	const problem = $derived(
		!playerId ? 'Select a player.' : delta === 0 ? 'Enter a non-zero adjustment.' : ''
	);
	const statLabel = $derived(ADJUSTABLE.find((s) => s.key === statKey)?.label ?? statKey);

	function record() {
		if (problem) return;
		onRecord({
			category: 'adjustment',
			action: 'manual_stat_adjustment',
			primaryPlayerId: playerId,
			statKey,
			yards: delta,
			notes: notes.trim() || `Manual adjustment: ${statLabel} ${delta > 0 ? '+' : ''}${delta}`
		});
	}
</script>

<Modal title="Adjust a stat" {onClose} width="max-w-md">
	<div class="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
		<p class="text-xs text-gray-400">
			Applies a correction on top of the recorded events. It appears in the event log and export as
			an adjustment, and can be undone like any other event.
		</p>

		<PlayerSearch players={roster} bind:selected={playerId} label="Player" recentsKey="adjust" compact />

		<label class="block space-y-1">
			<span class="text-xs text-gray-400">Stat</span>
			<select
				bind:value={statKey}
				class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none"
			>
				{#each ADJUSTABLE as s (s.key)}<option value={s.key}>{s.label}</option>{/each}
			</select>
		</label>

		<div class="space-y-1">
			<span class="text-xs text-gray-400">Adjustment</span>
			<div class="flex items-center gap-2">
				<button
					onclick={() => (delta -= 1)}
					aria-label="Decrease"
					class="w-11 rounded-lg bg-gray-700 py-2 font-bold text-white hover:bg-gray-600">−</button
				>
				<input
					type="number"
					bind:value={delta}
					aria-label="Adjustment amount"
					class="w-24 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-center text-white focus:border-blue-500 focus:outline-none"
				/>
				<button
					onclick={() => (delta += 1)}
					aria-label="Increase"
					class="w-11 rounded-lg bg-gray-700 py-2 font-bold text-white hover:bg-gray-600">+</button
				>
				<span class="font-mono text-sm text-gray-400">
					{statLabel} {delta > 0 ? '+' : ''}{delta}
				</span>
			</div>
		</div>

		<label class="block space-y-1">
			<span class="text-xs text-gray-400">Reason (optional)</span>
			<input
				type="text"
				bind:value={notes}
				placeholder="e.g. Official yardage correction"
				class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none"
			/>
		</label>

		{#if problem}<p class="text-xs text-red-400">{problem}</p>{/if}
	</div>

	{#snippet footer()}
		<button onclick={onClose} class="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600"
			>Cancel</button
		>
		<button
			onclick={record}
			disabled={Boolean(problem)}
			class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
			>Record adjustment</button
		>
	{/snippet}
</Modal>
