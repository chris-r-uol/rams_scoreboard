<script lang="ts">
	import type { Player, StatAction, StatCategory } from '../types';
	import { actionsFor, getActionMeta } from '../eventTypes';
	import PlayerSearch from './PlayerSearch.svelte';
	import YardageInput from './YardageInput.svelte';

	let {
		category,
		roster,
		primaryId = $bindable(''),
		secondaryId = $bindable(''),
		yards = $bindable(0),
		onAction
	}: {
		category: Extract<StatCategory, 'passing' | 'rushing' | 'defence' | 'kicking' | 'special_teams'>;
		roster: Player[];
		primaryId: string;
		secondaryId: string;
		yards: number;
		onAction: (action: StatAction) => void;
	} = $props();

	const LABELS: Record<string, { heading: string; tone: string; primary: string }> = {
		passing: { heading: 'Passing', tone: 'text-blue-400', primary: 'Passer' },
		rushing: { heading: 'Rushing', tone: 'text-green-400', primary: 'Ball Carrier' },
		defence: { heading: 'Defence', tone: 'text-red-400', primary: 'Defender' },
		kicking: { heading: 'Kicking', tone: 'text-yellow-400', primary: 'Kicker' },
		special_teams: { heading: 'Special Teams', tone: 'text-purple-400', primary: 'Returner' }
	};

	const meta = $derived(LABELS[category]);
	const actions = $derived(actionsFor(category));
	const needsReceiver = $derived(actions.some((a) => a.requiresReceiver));

	/** Show the default that will be applied when yardage is left at zero. */
	const yardHint = $derived.by(() => {
		if (yards !== 0) return '';
		const withDefaults = actions.filter((a) => a.defaultYards !== undefined);
		if (withDefaults.length === 0) return '';
		return `defaults: ${withDefaults.map((a) => `${a.label} ${a.defaultYards}`).join(', ')}`;
	});
</script>

<div class="space-y-3">
	<p class="text-sm font-bold uppercase tracking-wide {meta.tone}">{meta.heading}</p>

	{#if needsReceiver}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<PlayerSearch
				players={roster}
				bind:selected={primaryId}
				label={meta.primary}
				recentsKey="passer"
				focusKey="primary"
				compact
			/>
			<PlayerSearch
				players={roster}
				bind:selected={secondaryId}
				label="Receiver"
				recentsKey="receiver"
				compact
			/>
		</div>
	{:else}
		<PlayerSearch
			players={roster}
			bind:selected={primaryId}
			label={meta.primary}
			recentsKey={category}
			focusKey="primary"
		/>
	{/if}

	<YardageInput bind:yards hint={yardHint} />

	<!--
		Sticky so the action buttons stay reachable no matter how the panel above
		grows or how far the operator has scrolled. These are the buttons that get
		pressed dozens of times a game; they must never move.
	-->
	<div class="sticky bottom-0 -mx-4 -mb-4 border-t border-gray-700 bg-gray-800/95 px-4 py-3 backdrop-blur">
		<div class="grid gap-2 {actions.length > 4 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}">
			{#each actions as a (a.action)}
				<button
					onclick={() => onAction(a.action)}
					class="rounded-xl p-4 text-sm font-bold text-white transition active:scale-95 {a.tone}"
				>
					{a.label}
					{#if a.role === 'primary'}<span class="ml-1 text-[0.6rem] opacity-60">⏎</span>{/if}
					{#if a.role === 'touchdown'}<span class="ml-1 text-[0.6rem] opacity-60">⇧⏎</span>{/if}
				</button>
			{/each}
		</div>
		{#if getActionMeta(actions[0].action)}
			<p class="mt-2 text-center text-[0.65rem] text-gray-500">
				Press <kbd class="rounded bg-gray-700 px-1">?</kbd> for keyboard shortcuts
			</p>
		{/if}
	</div>
</div>
