<script lang="ts">
	import type { TeamStats, Drive } from '../types';
	import { possessionMs, formatPossession } from '../drives';

	let {
		stats,
		currentDrive = null,
		completedDrives = []
	}: { stats: TeamStats; currentDrive?: Drive | null; completedDrives?: Drive[] } = $props();

	/**
	 * Time of possession has to be told what time it is.
	 *
	 * `Date.now()` is not a reactive dependency, so a derived value that called
	 * it computed once when the drive opened and then sat at 0:00 for the whole
	 * possession. The ticker only runs while a drive is actually open — with
	 * none, the total is fixed and there is nothing to count.
	 */
	let now = $state(Date.now());
	$effect(() => {
		if (!currentDrive) return;
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const possession = $derived(formatPossession(possessionMs(currentDrive, completedDrives, now)));

	function pct(a: number, b: number): string {
		if (b === 0) return '—';
		return ((a / b) * 100).toFixed(1) + '%';
	}

	function avg(a: number, b: number): string {
		if (b === 0) return '—';
		return (a / b).toFixed(1);
	}
</script>

<div class="space-y-3 text-sm">
	<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Team Totals</p>

	<div class="grid grid-cols-2 gap-2">
		<!-- Passing -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-blue-400">Passing</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Att/Comp</span><span class="font-mono font-semibold">{stats.passing.completions}/{stats.passing.attempts}</span></div>
				<div class="flex justify-between"><span>Comp%</span><span class="font-mono font-semibold">{pct(stats.passing.completions, stats.passing.attempts)}</span></div>
				<div class="flex justify-between"><span>Yards</span><span class="font-mono font-semibold">{stats.passing.yards}</span></div>
				<div class="flex justify-between"><span>Yds/Att</span><span class="font-mono font-semibold">{avg(stats.passing.yards, stats.passing.attempts)}</span></div>
				<div class="flex justify-between"><span>TDs</span><span class="font-mono font-semibold">{stats.passing.touchdowns}</span></div>
				<div class="flex justify-between"><span>INT</span><span class="font-mono font-semibold">{stats.passing.interceptions}</span></div>
				<div class="flex justify-between"><span>Targets</span><span class="font-mono font-semibold">{stats.receiving.targets}</span></div>
			</div>
		</div>

		<!-- Rushing -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-green-400">Rushing</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Attempts</span><span class="font-mono font-semibold">{stats.rushing.attempts}</span></div>
				<div class="flex justify-between"><span>Yards</span><span class="font-mono font-semibold">{stats.rushing.yards}</span></div>
				<div class="flex justify-between"><span>Yds/Car</span><span class="font-mono font-semibold">{avg(stats.rushing.yards, stats.rushing.attempts)}</span></div>
				<div class="flex justify-between"><span>TDs</span><span class="font-mono font-semibold">{stats.rushing.touchdowns}</span></div>
			</div>
		</div>

		<!-- Defence -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-red-400">Defence</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Tackles</span><span class="font-mono font-semibold">{stats.defence.tackles}</span></div>
				<div class="flex justify-between"><span>Solo / Ast</span><span class="font-mono font-semibold">{stats.defence.soloTackles}/{stats.defence.assistedTackles}</span></div>
				<div class="flex justify-between"><span>PBU</span><span class="font-mono font-semibold">{stats.defence.passesDefended}</span></div>
				<div class="flex justify-between"><span>Fum Rec</span><span class="font-mono font-semibold">{stats.defence.fumbleRecoveries}</span></div>
				<div class="flex justify-between"><span>TFL</span><span class="font-mono font-semibold">{stats.defence.tacklesForLoss}</span></div>
				<div class="flex justify-between"><span>Sacks</span><span class="font-mono font-semibold">{stats.defence.sacks}</span></div>
				<div class="flex justify-between"><span>Sack Yds</span><span class="font-mono font-semibold">{stats.defence.sackYards}</span></div>
				<div class="flex justify-between"><span>INT</span><span class="font-mono font-semibold">{stats.defence.interceptions}</span></div>
				<div class="flex justify-between"><span>FF</span><span class="font-mono font-semibold">{stats.defence.forcedFumbles}</span></div>
				<div class="flex justify-between"><span>Def TDs</span><span class="font-mono font-semibold">{stats.defence.touchdowns}</span></div>
				<div class="flex justify-between"><span>Safeties</span><span class="font-mono font-semibold">{stats.defence.safeties}</span></div>
				<div class="flex justify-between"><span>ST TDs</span><span class="font-mono font-semibold">{stats.specialTeams.touchdowns}</span></div>
			</div>
		</div>

		<!-- Overall -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-yellow-400">Overall</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Total Yds</span><span class="font-mono font-semibold">{stats.totalOffensiveYards}</span></div>
				<div class="flex justify-between"><span>Total TDs</span><span class="font-mono font-semibold">{stats.totalTouchdowns}</span></div>
				<div class="flex justify-between"><span>Total Plays</span><span class="font-mono font-semibold">{stats.totalOffensivePlays}</span></div>
				<div class="flex justify-between"><span>Points</span><span class="font-mono font-semibold">{stats.totalPoints}</span></div>
			</div>
		</div>

		<!-- Situational — the numbers a commentator reaches for -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-purple-400">Situational</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>First Downs</span><span class="font-mono font-semibold">{stats.firstDowns.total}</span></div>
				<div class="flex justify-between"><span>By Rush / Pass</span><span class="font-mono font-semibold">{stats.firstDowns.rushing}/{stats.firstDowns.passing}</span></div>
				<div class="flex justify-between"><span>3rd Down</span><span class="font-mono font-semibold">{stats.thirdDowns.conversions}/{stats.thirdDowns.attempts} ({pct(stats.thirdDowns.conversions, stats.thirdDowns.attempts)})</span></div>
				<div class="flex justify-between"><span>4th Down</span><span class="font-mono font-semibold">{stats.fourthDowns.conversions}/{stats.fourthDowns.attempts}</span></div>
				<div class="flex justify-between"><span>Possession</span><span class="font-mono font-semibold">{possession}</span></div>
			</div>
		</div>

		<!-- Turnovers -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-red-400">Turnovers</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Takeaways</span><span class="font-mono font-semibold">{stats.takeaways}</span></div>
				<div class="flex justify-between"><span>Giveaways</span><span class="font-mono font-semibold">{stats.giveaways}</span></div>
				<div class="flex justify-between"><span>Margin</span><span class="font-mono font-semibold">{stats.takeaways - stats.giveaways > 0 ? '+' : ''}{stats.takeaways - stats.giveaways}</span></div>
				<div class="flex justify-between"><span>Fumbles / Lost</span><span class="font-mono font-semibold">{stats.turnovers.fumbles}/{stats.turnovers.fumblesLost}</span></div>
			</div>
		</div>

		<!-- Returns -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-cyan-400">Returns</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Kick Ret</span><span class="font-mono font-semibold">{stats.specialTeams.kickReturns} for {stats.specialTeams.kickReturnYards}</span></div>
				<div class="flex justify-between"><span>Avg / Long</span><span class="font-mono font-semibold">{avg(stats.specialTeams.kickReturnYards, stats.specialTeams.kickReturns)} / {stats.specialTeams.longestKickReturn || '—'}</span></div>
				<div class="flex justify-between"><span>Punt Ret</span><span class="font-mono font-semibold">{stats.specialTeams.puntReturns} for {stats.specialTeams.puntReturnYards}</span></div>
				<div class="flex justify-between"><span>Avg / Long</span><span class="font-mono font-semibold">{avg(stats.specialTeams.puntReturnYards, stats.specialTeams.puntReturns)} / {stats.specialTeams.longestPuntReturn || '—'}</span></div>
				<div class="flex justify-between"><span>INT / Fum Yds</span><span class="font-mono font-semibold">{stats.defence.interceptionYards}/{stats.defence.fumbleReturnYards}</span></div>
			</div>
		</div>

		<!-- Kicking -->
		<div class="rounded-lg bg-gray-800 p-3">
			<p class="mb-2 text-xs font-bold uppercase text-yellow-400">Kicking</p>
			<div class="space-y-1 text-gray-200">
				<div class="flex justify-between"><span>Field Goals</span><span class="font-mono font-semibold">{stats.kicking.fieldGoalsMade}/{stats.kicking.fieldGoalsAttempted}</span></div>
				<div class="flex justify-between"><span>FG%</span><span class="font-mono font-semibold">{pct(stats.kicking.fieldGoalsMade, stats.kicking.fieldGoalsAttempted)}</span></div>
				<div class="flex justify-between"><span>Longest</span><span class="font-mono font-semibold">{stats.kicking.longestFieldGoal || '—'}</span></div>
				<div class="flex justify-between"><span>Extra Points</span><span class="font-mono font-semibold">{stats.kicking.extraPointsMade}/{stats.kicking.extraPointsAttempted}</span></div>
				<div class="flex justify-between"><span>2PT</span><span class="font-mono font-semibold">{stats.conversions.twoPointMade}/{stats.conversions.twoPointAttempted}</span></div>
				<div class="flex justify-between"><span>Punts</span><span class="font-mono font-semibold">{stats.kicking.punts}</span></div>
				<div class="flex justify-between"><span>Yds/Punt</span><span class="font-mono font-semibold">{avg(stats.kicking.puntYards, stats.kicking.punts)}</span></div>
			</div>
		</div>

		<!-- Penalties -->
		<div class="rounded-lg bg-gray-800 p-3 col-span-2">
			<p class="mb-2 text-xs font-bold uppercase text-orange-400">Penalties</p>
			<div class="grid grid-cols-2 gap-x-6 text-gray-200 space-y-1">
				<div class="flex justify-between"><span>Off. Penalties</span><span class="font-mono font-semibold">{stats.penalties.offensiveCount}</span></div>
				<div class="flex justify-between"><span>Def. Penalties</span><span class="font-mono font-semibold">{stats.penalties.defensiveCount}</span></div>
				<div class="flex justify-between"><span>Off. Yards Lost</span><span class="font-mono font-semibold">{stats.penalties.offensiveYards}</span></div>
				<div class="flex justify-between"><span>Def. Yards Conceded</span><span class="font-mono font-semibold">{stats.penalties.defensiveYards}</span></div>
			</div>
		</div>
	</div>
</div>
