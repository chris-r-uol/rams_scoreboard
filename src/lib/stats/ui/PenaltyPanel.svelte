<script lang="ts">
	import type { Player } from '../types';
	import PlayerSearch from './PlayerSearch.svelte';

	let {
		roster,
		side = $bindable<'offensive' | 'defensive'>('offensive'),
		playerId = $bindable(''),
		penaltyName = $bindable(''),
		yards = $bindable(5),
		onRecord
	}: {
		roster: Player[];
		side: 'offensive' | 'defensive';
		playerId: string;
		penaltyName: string;
		yards: number;
		onRecord: () => void;
	} = $props();

	interface PenaltyPreset {
		name: string;
		yards: number;
	}

	const OFFENSIVE_PRESETS: PenaltyPreset[] = [
		{ name: 'False Start', yards: 5 },
		{ name: 'Holding', yards: 10 },
		{ name: 'Illegal Formation', yards: 5 },
		{ name: 'Illegal Motion', yards: 5 },
		{ name: 'Illegal Procedure', yards: 5 },
		{ name: 'Ineligible Receiver', yards: 5 },
		{ name: 'Intentional Grounding', yards: 10 },
		{ name: 'Offensive PI', yards: 10 },
		{ name: 'Clipping', yards: 15 },
		{ name: 'Chop Block', yards: 15 }
	];

	const DEFENSIVE_PRESETS: PenaltyPreset[] = [
		{ name: 'Offsides', yards: 5 },
		{ name: 'Illegal Contact', yards: 5 },
		{ name: 'Neutral Zone Infraction', yards: 5 },
		{ name: 'Defensive Holding', yards: 5 },
		{ name: 'Pass Interference', yards: 15 },
		{ name: 'Face Mask', yards: 15 },
		{ name: 'Roughing the Passer', yards: 15 },
		{ name: 'Unnecessary Roughness', yards: 15 },
		{ name: 'Unsportsmanlike', yards: 15 },
		{ name: 'Late Hit', yards: 15 }
	];

	const presets = $derived(side === 'offensive' ? OFFENSIVE_PRESETS : DEFENSIVE_PRESETS);

	function switchSide(next: 'offensive' | 'defensive') {
		side = next;
		yards = 5;
		penaltyName = '';
	}

	function selectPreset(p: PenaltyPreset) {
		penaltyName = p.name;
		yards = p.yards;
	}
</script>

<div class="space-y-3">
	<p class="text-sm font-bold uppercase tracking-wide text-yellow-400">Penalties</p>

	<div class="flex gap-1 rounded-xl bg-gray-700 p-1">
		<button
			onclick={() => switchSide('offensive')}
			aria-pressed={side === 'offensive'}
			class="flex-1 rounded-lg py-2 text-sm font-bold transition {side === 'offensive'
				? 'bg-orange-700 text-white'
				: 'text-gray-400 hover:text-gray-200'}"
		>Offensive</button>
		<button
			onclick={() => switchSide('defensive')}
			aria-pressed={side === 'defensive'}
			class="flex-1 rounded-lg py-2 text-sm font-bold transition {side === 'defensive'
				? 'bg-blue-700 text-white'
				: 'text-gray-400 hover:text-gray-200'}"
		>Defensive</button>
	</div>

	<div>
		<p class="mb-2 text-xs text-gray-400">Common penalties</p>
		<div class="flex flex-wrap gap-1">
			{#each presets as p (p.name)}
				<button
					onclick={() => selectPreset(p)}
					class="rounded px-2 py-1 text-xs font-semibold transition {penaltyName === p.name
						? side === 'offensive'
							? 'bg-orange-700 text-white'
							: 'bg-blue-700 text-white'
						: 'bg-gray-700 text-gray-200 hover:bg-gray-600'}"
				>{p.name} <span class="opacity-60">({p.yards})</span></button>
			{/each}
		</div>
	</div>

	<div class="flex items-end gap-2">
		<label class="flex-1 space-y-1">
			<span class="text-xs text-gray-400">Penalty name (optional)</span>
			<input
				type="text"
				bind:value={penaltyName}
				placeholder="e.g. Holding"
				class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
			/>
		</label>
		<label class="w-20 space-y-1">
			<span class="text-xs text-gray-400">Yards</span>
			<input
				type="number"
				bind:value={yards}
				min="1"
				class="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-center text-sm text-white focus:border-blue-500 focus:outline-none"
			/>
		</label>
	</div>

	<PlayerSearch
		players={roster}
		bind:selected={playerId}
		label="Player (optional — leave blank for team penalty)"
		recentsKey="penalty"
		compact
	/>

	<div class="sticky bottom-0 -mx-4 -mb-4 border-t border-gray-700 bg-gray-800/95 px-4 py-3 backdrop-blur">
		<button
			onclick={onRecord}
			class="w-full rounded-xl py-4 text-sm font-bold text-white transition active:scale-95 {side ===
			'offensive'
				? 'bg-orange-700 hover:bg-orange-600'
				: 'bg-blue-700 hover:bg-blue-600'}"
		>
			Record {side === 'offensive' ? 'Offensive' : 'Defensive'} Penalty — {yards} yds
			<span class="ml-1 text-[0.6rem] opacity-60">⏎</span>
		</button>
	</div>
</div>
