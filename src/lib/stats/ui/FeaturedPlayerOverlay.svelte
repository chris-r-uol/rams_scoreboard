<script lang="ts">
	import type { GameState, Player, PlayerStats } from '../types';

	let { state }: { state: GameState } = $props();

	const team = $derived(state.team);

	function getPlayer(): Player | undefined {
		const id = state.selectedOverlayPlayers[0];
		return id ? state.roster.find((p) => p.id === id) : undefined;
	}

	function getStats(id: string): PlayerStats | undefined {
		return state.playerStats[id];
	}

	const player = $derived(getPlayer());
	const ps = $derived(player ? getStats(player.id) : undefined);
</script>

{#if player && ps}
<div
	style="width:380px; background:{team.primaryColor}; color:{team.textColor}; border:3px solid {team.secondaryColor}; border-radius:10px; font-family:sans-serif; box-shadow:0 8px 32px rgba(0,0,0,0.5); overflow:hidden;"
>
	<!-- Header -->
	<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:2px solid {team.secondaryColor}40;">
		{#if team.logoDataUrl}
			<img src={team.logoDataUrl} alt={team.abbreviation} style="height:32px;width:32px;object-fit:contain;flex-shrink:0;" />
		{/if}
		<div>
			<div style="font-weight:900;font-size:1.05rem;letter-spacing:0.04em;">#{player.number} {player.playerName.toUpperCase()}</div>
			<div style="font-size:0.68rem;opacity:0.65;letter-spacing:0.12em;text-transform:uppercase;">{player.position} · {team.abbreviation}</div>
		</div>
	</div>

	<!-- Stacked stat rows -->
	<div style="padding:10px 16px;display:flex;flex-direction:column;gap:8px;">

		{#if ps.passing.attempts > 0}
			<div style="display:flex;align-items:baseline;gap:12px;">
				<span style="width:68px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">PASSING</span>
				<div style="display:flex;gap:14px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;">
					<span>{ps.passing.completions}/{ps.passing.attempts}</span>
					<span>{ps.passing.yards} YDS</span>
					<span>{ps.passing.touchdowns} TD</span>
				</div>
			</div>
		{/if}

		{#if ps.rushing.attempts > 0}
			<div style="display:flex;align-items:baseline;gap:12px;">
				<span style="width:68px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">RUSHING</span>
				<div style="display:flex;gap:14px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;">
					<span>{ps.rushing.attempts} ATT</span>
					<span>{ps.rushing.yards} YDS</span>
					<span>{ps.rushing.touchdowns} TD</span>
				</div>
			</div>
		{/if}

		{#if ps.receiving.receptions > 0}
			<div style="display:flex;align-items:baseline;gap:12px;">
				<span style="width:68px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">RECEIVING</span>
				<div style="display:flex;gap:14px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;">
					<span>{ps.receiving.receptions} REC</span>
					<span>{ps.receiving.yards} YDS</span>
					<span>{ps.receiving.touchdowns} TD</span>
				</div>
			</div>
		{/if}

		{#if ps.defence.tackles > 0 || ps.defence.sacks > 0 || ps.defence.interceptions > 0}
			<div style="display:flex;align-items:baseline;gap:12px;">
				<span style="width:68px;font-size:0.65rem;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;flex-shrink:0;">DEFENCE</span>
				<div style="display:flex;gap:14px;font-size:0.82rem;font-weight:600;font-variant-numeric:tabular-nums;">
					{#if ps.defence.tackles > 0}<span>{ps.defence.tackles} TKL</span>{/if}
					{#if ps.defence.sacks > 0}<span>{ps.defence.sacks} SK</span>{/if}
					{#if ps.defence.interceptions > 0}<span>{ps.defence.interceptions} INT</span>{/if}
				</div>
			</div>
		{/if}

	</div>
</div>
{/if}
