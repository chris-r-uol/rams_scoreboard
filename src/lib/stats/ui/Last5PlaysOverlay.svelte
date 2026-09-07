<script lang="ts">
	import type { GameState, Player } from '../types';

	let { state }: { state: GameState } = $props();

	const team = $derived(state.team);

	const OFFENSIVE_ACTIONS = [
		'pass_attempt_incomplete', 'pass_completion', 'passing_td',
		'interception_thrown', 'rush_attempt', 'rush_td'
	];

	const ACTION_LABELS: Record<string, string> = {
		pass_attempt_incomplete: 'INC',
		pass_completion: 'CMP',
		passing_td: 'TD',
		interception_thrown: 'INT',
		rush_attempt: 'RUN',
		rush_td: 'TD'
	};

	function barColor(action: string, yards: number): string {
		if (action === 'passing_td' || action === 'rush_td') return '#22c55e';
		if (action === 'interception_thrown') return '#ef4444';
		if (yards < 0) return '#ef4444';
		if (yards === 0) return '#6b7280';
		return '#60a5fa';
	}

	const last5 = $derived(
		state.events
			.filter((e) => OFFENSIVE_ACTIONS.includes(e.action))
			.slice(-5)
	);

	const maxYards = $derived(Math.max(20, ...last5.map((e) => Math.abs(e.yards ?? 0))));

	// Bar scales: max bar = 90px one side, center at 50%
	function barStyle(action: string, yards: number): string {
		const abs = Math.abs(yards);
		const width = Math.round((abs / maxYards) * 90);
		const color = barColor(action, yards);
		if (yards > 0) {
			return `position:absolute;left:50%;top:1px;height:8px;width:${width}px;background:${color};border-radius:0 3px 3px 0;`;
		} else if (yards < 0) {
			return `position:absolute;right:50%;top:1px;height:8px;width:${width}px;background:${color};border-radius:3px 0 0 3px;`;
		}
		return `position:absolute;left:calc(50% - 1px);top:1px;height:8px;width:2px;background:${color};`;
	}

	function playerLabel(id: string): string {
		const p = state.roster.find((r) => r.id === id);
		return p ? `#${p.number}` : '—';
	}
</script>

<div
	style="width:380px; background:{team.primaryColor}; color:{team.textColor}; border:3px solid {team.secondaryColor}; border-radius:10px; font-family:sans-serif; box-shadow:0 8px 32px rgba(0,0,0,0.5); overflow:hidden;"
>
	<!-- Header -->
	<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:2px solid {team.secondaryColor}40;">
		{#if team.logoDataUrl}
			<img src={team.logoDataUrl} alt={team.abbreviation} style="height:32px;width:32px;object-fit:contain;flex-shrink:0;" />
		{/if}
		<div style="font-weight:900;font-size:0.85rem;letter-spacing:0.08em;">LAST 5 PLAYS</div>
		<div style="font-size:0.65rem;opacity:0.55;margin-left:auto;letter-spacing:0.1em;">{team.abbreviation}</div>
	</div>

	<!-- Play rows -->
	<div style="padding:10px 16px;display:flex;flex-direction:column;gap:7px;">
		{#if last5.length === 0}
			<div style="font-size:0.8rem;opacity:0.5;text-align:center;padding:8px 0;">No plays recorded yet</div>
		{:else}
			{#each last5 as ev}
				{@const yards = ev.yards ?? 0}
				<div style="display:flex;align-items:center;gap:8px;font-size:0.78rem;">
					<!-- Action label -->
					<span style="width:28px;font-weight:700;font-size:0.68rem;opacity:0.9;flex-shrink:0;">{ACTION_LABELS[ev.action] ?? ev.action}</span>
					<!-- Player # -->
					<span style="width:24px;font-size:0.68rem;opacity:0.6;flex-shrink:0;">{playerLabel(ev.primaryPlayerId)}</span>
					<!-- Bar chart area -->
					<div style="flex:1;position:relative;height:10px;">
						<!-- Centre line -->
						<div style="position:absolute;left:50%;top:0;width:1px;height:100%;background:{team.textColor}20;"></div>
						<!-- Bar -->
						<div style={barStyle(ev.action, yards)}></div>
					</div>
					<!-- Yards label -->
					<span style="width:32px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;font-size:0.75rem;flex-shrink:0;">{yards > 0 ? '+' : ''}{yards}</span>
				</div>
			{/each}
		{/if}
	</div>
</div>
