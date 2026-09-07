<script lang="ts">
	import type { TeamStats } from '../types';

	let { stats }: { stats: TeamStats } = $props();

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
