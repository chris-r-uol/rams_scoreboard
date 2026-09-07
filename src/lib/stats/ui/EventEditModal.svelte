<script lang="ts">
	import type { Player, StatEvent, StatAction } from '../types';
	import { actionsFor, getActionMeta, formatAction } from '../eventTypes';
	import { gameContextFrom } from '../gameContext.js';
	import Modal from './Modal.svelte';
	import PlayerSearch from './PlayerSearch.svelte';
	import YardageInput from './YardageInput.svelte';

	let {
		event,
		roster,
		board,
		onSave,
		onClose
	}: {
		event: StatEvent;
		roster: Player[];
		/** Live scoreboard state, for stamping the current period and clock. */
		board: Record<string, unknown>;
		onSave: (updated: StatEvent) => void;
		onClose: () => void;
	} = $props();

	// Draft copy — nothing is committed until Save, so an accidental open is free.
	// Seeding from the prop once is the intent: the modal is created fresh per
	// event, and live re-syncing would fight whatever the operator is typing.
	// svelte-ignore state_referenced_locally
	const initial: StatEvent = event;

	let action = $state<StatAction>(initial.action);
	let primaryId = $state(initial.primaryPlayerId);
	let secondaryId = $state(initial.secondaryPlayerId ?? '');
	let yards = $state(initial.yards ?? 0);
	let quarter = $state(initial.quarter ?? '');
	let gameClock = $state(initial.gameClock ?? '');
	let notes = $state(initial.notes ?? '');

	/**
	 * The scoreboard's period label is sport-specific — Q2, P1, H1 — and the
	 * standalone project's fixed 1/2/3/4/OT dropdown could not represent it, so
	 * opening this modal on a stamped event would have shown a blank and then
	 * silently cleared the period on save. Free text keeps whatever was
	 * recorded, and the button below offers the live situation for an event
	 * being corrected while the game is still on that play.
	 */
	const live = $derived(gameContextFrom(board));
	const hasLiveContext = $derived(Boolean(live.quarter || live.gameClock));

	function useNow() {
		if (live.quarter) quarter = live.quarter;
		if (live.gameClock) gameClock = live.gameClock;
	}

	const meta = $derived(getActionMeta(action));
	// Only offer actions from the same category — changing a tackle into a pass
	// would be a new event, not an edit.
	const alternatives = $derived(actionsFor(event.category));

	const problem = $derived.by(() => {
		if (!primaryId) return 'Select the player this stat belongs to.';
		if (meta?.requiresReceiver && !secondaryId) return 'This action needs a receiver.';
		return '';
	});

	function save() {
		if (problem) return;
		onSave({
			...event,
			action,
			primaryPlayerId: primaryId,
			secondaryPlayerId: meta?.requiresReceiver ? secondaryId : undefined,
			yards: meta?.requiresYards ? yards : undefined,
			quarter: quarter || undefined,
			gameClock: gameClock || undefined,
			notes: notes.trim() || undefined
		});
	}
</script>

<Modal title="Edit event" {onClose} width="max-w-lg">
	<div class="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
		<div class="space-y-1">
			<span class="text-xs text-gray-400">Action</span>
			<div class="flex flex-wrap gap-1">
				{#each alternatives as a (a.action)}
					<button
						onclick={() => (action = a.action)}
						aria-pressed={action === a.action}
						class="rounded px-2 py-1 text-xs font-semibold transition {action === a.action
							? 'bg-blue-600 text-white'
							: 'bg-gray-700 text-gray-300 hover:bg-gray-600'}"
					>{formatAction(a.action)}</button>
				{/each}
			</div>
		</div>

		<PlayerSearch players={roster} bind:selected={primaryId} label="Player" recentsKey="edit" compact />

		{#if meta?.requiresReceiver}
			<PlayerSearch
				players={roster}
				bind:selected={secondaryId}
				label="Receiver"
				recentsKey="receiver"
				compact
			/>
		{/if}

		{#if meta?.requiresYards}
			<YardageInput bind:yards />
		{/if}

		<div class="grid grid-cols-2 gap-3">
			<label class="space-y-1">
				<span class="text-xs text-gray-400">Period</span>
				<input
					type="text"
					bind:value={quarter}
					placeholder="Q2"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none"
				/>
			</label>
			<label class="space-y-1">
				<span class="text-xs text-gray-400">Game clock</span>
				<input
					type="text"
					bind:value={gameClock}
					placeholder="08:41"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none"
				/>
			</label>
		</div>

		{#if hasLiveContext}
			<button
				onclick={useNow}
				class="rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-600"
			>Stamp with the clock as it reads now</button>
		{/if}

		<label class="block space-y-1">
			<span class="text-xs text-gray-400">Notes</span>
			<input
				type="text"
				bind:value={notes}
				placeholder="Optional"
				class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:outline-none"
			/>
		</label>

		{#if problem}
			<p class="text-xs text-red-400">{problem}</p>
		{/if}
	</div>

	{#snippet footer()}
		<button
			onclick={onClose}
			class="rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">Cancel</button
		>
		<button
			onclick={save}
			disabled={Boolean(problem)}
			class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
			>Save changes</button
		>
	{/snippet}
</Modal>
