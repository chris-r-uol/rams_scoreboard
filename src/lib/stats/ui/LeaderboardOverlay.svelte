<script lang="ts">
	import type { GameState, Player, LeaderboardCategory } from '../types';

	let { state }: { state: GameState } = $props();

	const team = $derived(state.team);
	const category = $derived(state.leaderboardCategory);

	interface LeaderEntry { player: Player; value: number; label: string; }

	function getLeaders(): LeaderEntry[] {
		const entries: LeaderEntry[] = [];

		for (const player of state.roster) {
			const ps = state.playerStats[player.id];
			if (!ps) continue;

			let value = 0;
			let label = '';

			switch (category) {
				case 'passing': value = ps.passing.yards; label = `${ps.passing.yards} YDS`; break;
				case 'rushing': value = ps.rushing.yards; label = `${ps.rushing.yards} YDS`; break;
				case 'receiving': value = ps.receiving.yards; label = `${ps.receiving.yards} YDS`; break;
				case 'tackles': value = ps.defence.tackles; label = `${ps.defence.tackles} TKL`; break;
				case 'sacks': value = ps.defence.sacks; label = `${ps.defence.sacks} SK`; break;
				case 'kicking':
					// Ranked on points contributed, which is what a kicker is for;
					// the label still shows the record behind it.
					value = ps.kicking.fieldGoalsMade * 3 + ps.kicking.extraPointsMade;
					label = `${ps.kicking.fieldGoalsMade}/${ps.kicking.fieldGoalsAttempted} FG · ${ps.kicking.extraPointsMade}/${ps.kicking.extraPointsAttempted} XP`;
					break;
				case 'touchdowns':
					value = ps.passing.touchdowns + ps.rushing.touchdowns + ps.receiving.touchdowns;
					label = `${value} TD`;
					break;
			}

			if (value > 0) entries.push({ player, value, label });
		}

		return entries.sort((a, b) => b.value - a.value).slice(0, 5);
	}

	const TITLES: Record<LeaderboardCategory, string> = {
		passing: 'PASSING LEADERS',
		rushing: 'RUSHING LEADERS',
		receiving: 'RECEIVING LEADERS',
		tackles: 'TACKLES LEADERS',
		sacks: 'SACKS LEADERS',
		touchdowns: 'TOUCHDOWN LEADERS',
		kicking: 'KICKING'
	};

	const leaders = $derived(getLeaders());
</script>

{#if leaders.length > 0}
<div
	style="width:380px; background:{team.primaryColor}; color:{team.textColor}; border:3px solid {team.secondaryColor}; border-radius:10px; font-family:sans-serif; box-shadow:0 8px 32px rgba(0,0,0,0.5); overflow:hidden;"
>
	<!-- Header -->
	<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:2px solid {team.secondaryColor}40;">
		{#if team.logoDataUrl}
			<img src={team.logoDataUrl} alt="" style="height:32px;width:32px;object-fit:contain;flex-shrink:0;" />
		{/if}
		<div style="font-weight:900;font-size:0.8rem;letter-spacing:0.12em;opacity:0.9;">{TITLES[category]}</div>
		<div style="font-size:0.65rem;opacity:0.5;margin-left:auto;letter-spacing:0.1em;">{team.abbreviation}</div>
	</div>

	<!-- Stacked player rows -->
	<div style="padding:10px 16px;display:flex;flex-direction:column;gap:7px;">
		{#each leaders as entry, i}
			<div style="display:flex;align-items:baseline;gap:10px;font-variant-numeric:tabular-nums;">
				<span style="width:16px;font-size:0.65rem;opacity:0.45;font-weight:700;flex-shrink:0;">{i + 1}</span>
				<span style="font-size:0.68rem;opacity:0.6;width:28px;flex-shrink:0;">#{entry.player.number}</span>
				<span style="flex:1;font-size:0.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{entry.player.playerName}</span>
				<span style="font-size:0.82rem;font-weight:700;flex-shrink:0;">{entry.label}</span>
			</div>
		{/each}
	</div>
</div>
{/if}
