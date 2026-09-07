<script lang="ts">
	import type { Drive, DriveResult } from '../types';
	import { stats } from '../../statsStore.js';

	let { currentDrive, completedDrives }: { currentDrive: Drive | null; completedDrives: Drive[] } = $props();

	let startYardLineInput = $state('');
	let endResult = $state<DriveResult>('touchdown');

	const RESULTS: { value: DriveResult; label: string }[] = [
		{ value: 'touchdown', label: 'Touchdown' },
		{ value: 'punt', label: 'Punt' },
		{ value: 'field_goal', label: 'Field Goal' },
		{ value: 'turnover', label: 'Turnover' },
		{ value: 'turnover_on_downs', label: 'Turnover on Downs' },
		{ value: 'end_of_period', label: 'End of Period' },
		{ value: 'safety', label: 'Safety' }
	];

	const RESULT_COLORS: Record<DriveResult, string> = {
		touchdown: 'text-green-400',
		punt: 'text-gray-400',
		field_goal: 'text-yellow-400',
		turnover: 'text-red-400',
		turnover_on_downs: 'text-red-400',
		end_of_period: 'text-gray-400',
		safety: 'text-orange-400',
		ongoing: 'text-blue-400'
	};

	function start() {
		const yl = parseInt(startYardLineInput);
		stats.startDrive(isNaN(yl) ? undefined : yl);
		startYardLineInput = '';
	}

	function end() {
		stats.endDrive(endResult);
	}
</script>

<div class="space-y-3">
	<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Drive Tracker</p>

	{#if !currentDrive}
		<!-- Start a new drive -->
		<div class="flex gap-2 items-end">
			<label class="space-y-1 flex-1">
				<span class="text-xs text-gray-400">Starting yard line (optional)</span>
				<input
					type="number"
					bind:value={startYardLineInput}
					min="1" max="99"
					placeholder="e.g. 25"
					class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
				/>
			</label>
			<button
				onclick={start}
				class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 whitespace-nowrap"
			>Start Drive</button>
		</div>
	{:else}
		<!-- Active drive stats -->
		<div class="rounded-lg bg-gray-700 px-3 py-2 flex gap-4 text-sm">
			<div class="text-center">
				<div class="font-black text-lg text-white">{currentDrive.plays}</div>
				<div class="text-xs text-gray-400">Plays</div>
			</div>
			<div class="text-center">
				<div class="font-black text-lg text-white">{currentDrive.yardsGained > 0 ? '+' : ''}{currentDrive.yardsGained}</div>
				<div class="text-xs text-gray-400">Yards</div>
			</div>
			{#if currentDrive.startYardLine !== undefined}
				<div class="text-center">
					<div class="font-black text-lg text-white">Own {currentDrive.startYardLine}</div>
					<div class="text-xs text-gray-400">Start</div>
				</div>
			{/if}
		</div>

		<!-- End drive -->
		<div class="flex gap-2 items-end">
			<label class="space-y-1 flex-1">
				<span class="text-xs text-gray-400">Drive result</span>
				<select bind:value={endResult} class="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white text-sm focus:outline-none">
					{#each RESULTS as r}
						<option value={r.value}>{r.label}</option>
					{/each}
				</select>
			</label>
			<button
				onclick={end}
				class="rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 whitespace-nowrap"
			>End Drive</button>
			<button
				onclick={() => stats.cancelDrive()}
				class="rounded-lg bg-gray-700 px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-600"
			>Cancel</button>
		</div>
	{/if}

	<!-- Completed drive history (last 5) -->
	{#if completedDrives.length > 0}
		<div class="space-y-1">
			{#each completedDrives.slice(-5).reverse() as d}
				<div class="flex items-center gap-2 text-xs text-gray-300 rounded bg-gray-700/50 px-2 py-1">
					<span class="font-bold w-16 {RESULT_COLORS[d.result]}">{d.result.replace(/_/g,' ').toUpperCase()}</span>
					<span>{d.plays} plays</span>
					<span>{d.yardsGained > 0 ? '+' : ''}{d.yardsGained} yds</span>
					{#if d.startYardLine !== undefined}
						<span class="ml-auto text-gray-500">Own {d.startYardLine}</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
