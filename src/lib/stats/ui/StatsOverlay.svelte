<script lang="ts">
	import type { GameState } from '../types';

	let { state }: { state: GameState } = $props();

	const team = $derived(state.team);
	const ts = $derived(state.teamStats);

	function comp(a: number, b: number): string {
		return `${a}/${b}`;
	}
function pct(a: number, b: number): string {
		return b === 0 ? '' : ` (${((a / b) * 100).toFixed(0)}%)`;
	}
</script>

<div
	class="shadow-2xl overflow-hidden"
	style="width:380px; background:{team.primaryColor}; color:{team.textColor}; border:3px solid {team.secondaryColor}; border-radius:10px; font-family:sans-serif;"
>
	<!-- Header -->
	<div class="flex items-center gap-3 px-4 py-3" style="border-bottom:2px solid {team.secondaryColor}40;">
		{#if team.logoDataUrl}
			<img src={team.logoDataUrl} alt={team.abbreviation} style="height:32px;width:32px;object-fit:contain;flex-shrink:0;" />
		{/if}
		<div style="font-weight:900;font-size:1.1rem;letter-spacing:0.08em;">{team.abbreviation || team.name}</div>
		<div style="font-size:0.7rem;opacity:0.6;margin-left:auto;letter-spacing:0.1em;text-transform:uppercase;">TEAM STATS</div>
	</div>

	<!-- Stacked stat rows -->
	<div style="padding:10px 16px;display:flex;flex-direction:column;gap:8px;">

		<!-- Passing -->
		<div style="display:flex;align-items:baseline;gap:12px;">
			<span style="width:44px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">PASS</span>
			<div style="display:flex;gap:16px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;flex-wrap:wrap;">
				<span>{comp(ts.passing.completions, ts.passing.attempts)}{pct(ts.passing.completions, ts.passing.attempts)}</span>
				<span>{ts.passing.yards} YDS</span>
				<span>{ts.passing.touchdowns} TD</span>
				{#if ts.passing.interceptions > 0}<span style="opacity:0.7;">{ts.passing.interceptions} INT</span>{/if}
			</div>
		</div>

		<!-- Rushing -->
		<div style="display:flex;align-items:baseline;gap:12px;">
			<span style="width:44px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">RUSH</span>
			<div style="display:flex;gap:16px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;flex-wrap:wrap;">
				<span>{ts.rushing.attempts} ATT</span>
				<span>{ts.rushing.yards} YDS</span>
				<span>{ts.rushing.touchdowns} TD</span>
			</div>
		</div>

		<!-- Defence -->
		<div style="display:flex;align-items:baseline;gap:12px;">
			<span style="width:44px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">DEF</span>
			<div style="display:flex;gap:16px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;flex-wrap:wrap;">
				<span>{ts.defence.tackles} TKL</span>
				<span>{ts.defence.sacks} SK</span>
				{#if ts.defence.interceptions > 0}<span>{ts.defence.interceptions} INT</span>{/if}
				{#if ts.defence.forcedFumbles > 0}<span>{ts.defence.forcedFumbles} FF</span>{/if}
			</div>
		</div>

		<!-- Kicking — only shown once someone has kicked -->
		{#if ts.kicking.fieldGoalsAttempted > 0 || ts.kicking.extraPointsAttempted > 0 || ts.conversions.twoPointMade > 0}
		<div style="display:flex;align-items:baseline;gap:12px;">
			<span style="width:44px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">KICK</span>
			<div style="display:flex;gap:16px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;flex-wrap:wrap;">
				{#if ts.kicking.fieldGoalsAttempted > 0}<span>{ts.kicking.fieldGoalsMade}/{ts.kicking.fieldGoalsAttempted} FG</span>{/if}
				{#if ts.kicking.longestFieldGoal > 0}<span style="opacity:0.7;">LNG {ts.kicking.longestFieldGoal}</span>{/if}
				{#if ts.kicking.extraPointsAttempted > 0}<span>{ts.kicking.extraPointsMade}/{ts.kicking.extraPointsAttempted} XP</span>{/if}
				{#if ts.conversions.twoPointMade > 0}<span>{ts.conversions.twoPointMade} 2PT</span>{/if}
			</div>
		</div>
		{/if}

		<!-- Penalties — only shown if any recorded -->
		{#if ts.penalties.offensiveCount > 0 || ts.penalties.defensiveCount > 0}
		<div style="display:flex;align-items:baseline;gap:12px;">
			<span style="width:44px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">PEN</span>
			<div style="display:flex;gap:16px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;flex-wrap:wrap;">
				{#if ts.penalties.offensiveCount > 0}<span style="opacity:0.75;">OFF {ts.penalties.offensiveCount} ({ts.penalties.offensiveYards} YDS)</span>{/if}
				{#if ts.penalties.defensiveCount > 0}<span style="opacity:0.75;">DEF {ts.penalties.defensiveCount} ({ts.penalties.defensiveYards} YDS)</span>{/if}
			</div>
		</div>
		{/if}

	</div>
</div>
