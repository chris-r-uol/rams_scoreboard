<script lang="ts">
	let {
		yards = $bindable(0),
		hint = ''
	}: { yards: number; hint?: string } = $props();

	const QUICK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 50];

	// Zero has no sign of its own, so the operator's intent ("next number I type
	// is a loss") is tracked separately and applied as soon as they enter one.
	let negativeAtZero = $state(false);
	const effectiveSign = $derived(yards < 0 ? -1 : yards > 0 ? 1 : negativeAtZero ? -1 : 1);

	function apply(magnitude: number) {
		yards = effectiveSign * Math.abs(magnitude);
	}

	function toggleSign() {
		if (yards === 0) negativeAtZero = !negativeAtZero;
		else yards = -yards;
	}

	function clear() {
		yards = 0;
		negativeAtZero = false;
	}
</script>

<div class="space-y-2">
	<div class="flex items-baseline gap-2">
		<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Yards</p>
		{#if hint}<p class="text-xs text-gray-500">{hint}</p>{/if}
	</div>

	<div class="flex items-center gap-2">
		<button
			onclick={toggleSign}
			aria-label="Toggle positive or negative yards"
			aria-pressed={effectiveSign === -1}
			class="w-11 rounded-lg py-2 text-sm font-bold transition {effectiveSign === -1
				? 'bg-red-700 text-white'
				: 'bg-gray-700 text-white hover:bg-gray-600'}"
		>{effectiveSign === 1 ? '+' : '−'}</button>

		<input
			type="number"
			inputmode="numeric"
			aria-label="Yards"
			value={Math.abs(yards)}
			oninput={(e) => apply(Number((e.target as HTMLInputElement).value) || 0)}
			class="w-20 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-center text-white focus:border-blue-500 focus:outline-none"
		/>

		<span class="font-mono text-sm text-gray-400">= {yards > 0 ? '+' : ''}{yards}</span>

		<button
			onclick={clear}
			class="ml-auto rounded-lg bg-gray-700 px-3 py-2 text-xs text-gray-300 hover:bg-gray-600"
		>Clear</button>
	</div>

	<div class="flex flex-wrap gap-1">
		{#each QUICK as v}
			<button
				onclick={() => apply(v)}
				class="min-w-[2.5rem] rounded bg-gray-700 px-2 py-1 text-sm font-semibold text-white hover:bg-gray-600 active:bg-blue-600 {Math.abs(
					yards
				) === v
					? 'ring-2 ring-blue-500'
					: ''}"
			>{v}</button>
		{/each}
	</div>
</div>
