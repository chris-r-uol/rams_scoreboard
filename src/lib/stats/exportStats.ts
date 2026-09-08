/**
 * Game stats out of the app and into a spreadsheet.
 *
 * The row builders are pure, so the same three tables back both the workbook
 * and the individual CSVs, and neither can drift from the other.
 *
 * The workbook is written by this app's own minimal .xlsx writer rather than a
 * spreadsheet library — see xlsxWriter.ts for why.
 */
import type { GameState, Player, PlayerStats } from './types';
import { buildXlsx } from './xlsxWriter';
import { emptyPlayerStats } from './emptyStats';
import { possessionMs, formatPossession } from './drives';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number): string {
	if (b === 0) return '0.0%';
	return ((a / b) * 100).toFixed(1) + '%';
}

function avg(a: number, b: number): string {
	if (b === 0) return '0.0';
	return (a / b).toFixed(1);
}

function findPlayer(roster: Player[], id: string): Player | undefined {
	return roster.find((p) => p.id === id);
}

/** Team and date, safe for a filename. */
function fileStem(state: GameState): string {
	return `${(state.team.name || 'Team').replace(/\s+/g, '_')}_${state.gameDate}`;
}

/**
 * Quote every cell.
 *
 * A player name with a comma in it would otherwise split into two columns, and
 * a leading `=`, `+`, `-` or `@` is read as a formula by Excel and Sheets — a
 * roster is operator-supplied text, so it gets prefixed rather than executed.
 */
function csvCell(cell: string | number): string {
	// Numbers are never formulas, and a lost yardage is written -41 — prefixing
	// that would turn every sack and holding call in the log into text.
	if (typeof cell === 'number') return `"${cell}"`;
	const text = String(cell);
	const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
	return `"${safe.replace(/"/g, '""')}"`;
}

export function toCSV(rows: (string | number)[][]): string {
	return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export { buildTeamSummaryRows, buildPlayerRows, buildEventLogRows };

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildTeamSummaryRows(state: GameState): (string | number)[][] {
	const ts = state.teamStats;
	return [
		['TEAM SUMMARY', state.team.name],
		['Date', state.gameDate],
		['Venue', state.venue ?? ''],
		[],
		['PASSING'],
		['Pass Attempts', ts.passing.attempts],
		['Pass Completions', ts.passing.completions],
		['Completion %', pct(ts.passing.completions, ts.passing.attempts)],
		['Passing Yards', ts.passing.yards],
		['Yards per Attempt', avg(ts.passing.yards, ts.passing.attempts)],
		['Passing TDs', ts.passing.touchdowns],
		['Interceptions', ts.passing.interceptions],
		[],
		['RUSHING'],
		['Rush Attempts', ts.rushing.attempts],
		['Rushing Yards', ts.rushing.yards],
		['Yards per Carry', avg(ts.rushing.yards, ts.rushing.attempts)],
		['Rushing TDs', ts.rushing.touchdowns],
		[],
		['RECEIVING'],
		['Targets', ts.receiving.targets],
		['Receptions', ts.receiving.receptions],
		['Catch %', pct(ts.receiving.receptions, ts.receiving.targets)],
		['Receiving Yards', ts.receiving.yards],
		['Receiving TDs', ts.receiving.touchdowns],
		[],
		['DEFENCE'],
		['Tackles', ts.defence.tackles],
		['Solo Tackles', ts.defence.soloTackles],
		['Assisted Tackles', ts.defence.assistedTackles],
		['Passes Defended', ts.defence.passesDefended],
		['Fumble Recoveries', ts.defence.fumbleRecoveries],
		['Interception Return Yards', ts.defence.interceptionYards],
		['Fumble Return Yards', ts.defence.fumbleReturnYards],
		['Tackles for Loss', ts.defence.tacklesForLoss],
		['Sacks', ts.defence.sacks],
		['Sack Yards', ts.defence.sackYards],
		['Interceptions', ts.defence.interceptions],
		['Forced Fumbles', ts.defence.forcedFumbles],
		['Defensive Touchdowns', ts.defence.touchdowns],
		['Safeties', ts.defence.safeties],
		[],
		['SPECIAL TEAMS'],
		['Return Touchdowns', ts.specialTeams.touchdowns],
		['Kick Returns', ts.specialTeams.kickReturns],
		['Kick Return Yards', ts.specialTeams.kickReturnYards],
		['Yards per Kick Return', avg(ts.specialTeams.kickReturnYards, ts.specialTeams.kickReturns)],
		['Longest Kick Return', ts.specialTeams.longestKickReturn],
		['Punt Returns', ts.specialTeams.puntReturns],
		['Punt Return Yards', ts.specialTeams.puntReturnYards],
		['Yards per Punt Return', avg(ts.specialTeams.puntReturnYards, ts.specialTeams.puntReturns)],
		['Longest Punt Return', ts.specialTeams.longestPuntReturn],
		[],
		['SITUATIONAL'],
		['First Downs', ts.firstDowns.total],
		['First Downs Rushing', ts.firstDowns.rushing],
		['First Downs Passing', ts.firstDowns.passing],
		['Third Downs', `${ts.thirdDowns.conversions}/${ts.thirdDowns.attempts}`],
		['Third Down %', pct(ts.thirdDowns.conversions, ts.thirdDowns.attempts)],
		['Fourth Downs', `${ts.fourthDowns.conversions}/${ts.fourthDowns.attempts}`],
		['Time of Possession', formatPossession(possessionMs(state.currentDrive, state.completedDrives))],
		[],
		['TURNOVERS'],
		['Takeaways', ts.takeaways],
		['Giveaways', ts.giveaways],
		['Turnover Margin', ts.takeaways - ts.giveaways],
		['Fumbles', ts.turnovers.fumbles],
		['Fumbles Lost', ts.turnovers.fumblesLost],
		[],
		['KICKING'],
		['Field Goals', `${ts.kicking.fieldGoalsMade}/${ts.kicking.fieldGoalsAttempted}`],
		['Field Goal %', pct(ts.kicking.fieldGoalsMade, ts.kicking.fieldGoalsAttempted)],
		['Longest Field Goal', ts.kicking.longestFieldGoal],
		['Extra Points', `${ts.kicking.extraPointsMade}/${ts.kicking.extraPointsAttempted}`],
		['Two-Point Conversions', `${ts.conversions.twoPointMade}/${ts.conversions.twoPointAttempted}`],
		['Punts', ts.kicking.punts],
		['Punt Yards', ts.kicking.puntYards],
		['Yards per Punt', avg(ts.kicking.puntYards, ts.kicking.punts)],
		[],
		['PENALTIES'],
		['Offensive Penalties', ts.penalties.offensiveCount],
		['Offensive Yards Lost', ts.penalties.offensiveYards],
		['Defensive Penalties', ts.penalties.defensiveCount],
		['Defensive Yards Conceded', ts.penalties.defensiveYards],
		[],
		['OVERALL'],
		['Total Offensive Yards', ts.totalOffensiveYards],
		['Total Touchdowns', ts.totalTouchdowns],
		['Total Offensive Plays', ts.totalOffensivePlays],
		[],
		['POINTS FROM RECORDED PLAYS', ts.totalPoints],
		['  Offensive Touchdowns', (ts.passing.touchdowns + ts.rushing.touchdowns) * 6],
		['  Defensive Touchdowns', ts.defence.touchdowns * 6],
		['  Special Teams Touchdowns', ts.specialTeams.touchdowns * 6],
		['  Field Goals', ts.kicking.fieldGoalsMade * 3],
		['  Extra Points', ts.kicking.extraPointsMade],
		['  Two-Point Conversions', ts.conversions.twoPointMade * 2],
		['  Safeties', ts.defence.safeties * 2]
	];
}

function buildPlayerRows(state: GameState): (string | number)[][] {
	const header = [
		'Number', 'Player', 'Position',
		'Pass Att', 'Pass Comp', 'Comp%', 'Pass Yds', 'Yds/Att', 'Pass TD', 'INT',
		'Rush Att', 'Rush Yds', 'Yds/Car', 'Rush TD',
		'Tgt', 'Rec', 'Catch%', 'Rec Yds', 'Yds/Rec', 'Rec TD',
		'Fumbles', 'Fum Lost',
		'Tackles', 'Solo', 'Ast', 'TFL', 'Sacks', 'Sack Yds', 'Def INT', 'INT Yds', 'PBU',
		'FF', 'Fum Rec', 'Fum Ret Yds', 'Def TD', 'Safeties',
		'KR', 'KR Yds', 'KR Long', 'PR', 'PR Yds', 'PR Long', 'ST TD',
		'FG Made', 'FG Att', 'FG Long', 'XP Made', 'XP Att', 'Punts', 'Punt Yds', '2PT',
		'Off Pen', 'Off Pen Yds', 'Def Pen', 'Def Pen Yds'
	];
	const rows: (string | number)[][] = [header];

	for (const player of state.roster) {
		// Shared with the engine rather than restated here. The zero row was a
		// second copy of the shape, and adding kicking to one and not the other
		// is exactly how a column ends up silently blank for unused players.
		const ps: PlayerStats = state.playerStats[player.id] ?? emptyPlayerStats(player.id);
		rows.push([
			player.number,
			player.playerName,
			player.position,
			ps.passing.attempts,
			ps.passing.completions,
			pct(ps.passing.completions, ps.passing.attempts),
			ps.passing.yards,
			avg(ps.passing.yards, ps.passing.attempts),
			ps.passing.touchdowns,
			ps.passing.interceptions,
			ps.rushing.attempts,
			ps.rushing.yards,
			avg(ps.rushing.yards, ps.rushing.attempts),
			ps.rushing.touchdowns,
			ps.receiving.targets,
			ps.receiving.receptions,
			pct(ps.receiving.receptions, ps.receiving.targets),
			ps.receiving.yards,
			avg(ps.receiving.yards, ps.receiving.receptions),
			ps.receiving.touchdowns,
			ps.turnovers.fumbles,
			ps.turnovers.fumblesLost,
			ps.defence.tackles,
			ps.defence.soloTackles,
			ps.defence.assistedTackles,
			ps.defence.tacklesForLoss,
			ps.defence.sacks,
			ps.defence.sackYards,
			ps.defence.interceptions,
			ps.defence.interceptionYards,
			ps.defence.passesDefended,
			ps.defence.forcedFumbles,
			ps.defence.fumbleRecoveries,
			ps.defence.fumbleReturnYards,
			ps.defence.touchdowns,
			ps.defence.safeties,
			ps.specialTeams.kickReturns,
			ps.specialTeams.kickReturnYards,
			ps.specialTeams.longestKickReturn,
			ps.specialTeams.puntReturns,
			ps.specialTeams.puntReturnYards,
			ps.specialTeams.longestPuntReturn,
			ps.specialTeams.touchdowns,
			ps.kicking.fieldGoalsMade,
			ps.kicking.fieldGoalsAttempted,
			ps.kicking.longestFieldGoal,
			ps.kicking.extraPointsMade,
			ps.kicking.extraPointsAttempted,
			ps.kicking.punts,
			ps.kicking.puntYards,
			ps.conversions.twoPointMade,
			ps.penalties.offensiveCount,
			ps.penalties.offensiveYards,
			ps.penalties.defensiveCount,
			ps.penalties.defensiveYards
		]);
	}
	return rows;
}

function buildEventLogRows(state: GameState): (string | number)[][] {
	const header = ['Timestamp', 'Quarter', 'Clock', 'Down', 'Distance', 'Category', 'Action', 'Primary Player', 'Secondary Player', 'Yards', 'Notes'];
	const rows: (string | number)[][] = [header];

	for (const ev of state.events) {
		const primary = findPlayer(state.roster, ev.primaryPlayerId);
		const secondary = ev.secondaryPlayerId ? findPlayer(state.roster, ev.secondaryPlayerId) : null;
		rows.push([
			new Date(ev.timestamp).toLocaleTimeString(),
			ev.quarter ?? '',
			ev.gameClock ?? '',
			ev.down ?? '',
			ev.distance ?? '',
			ev.category,
			ev.action,
			primary ? `#${primary.number} ${primary.playerName}` : ev.primaryPlayerId,
			secondary ? `#${secondary.number} ${secondary.playerName}` : '',
			ev.yards ?? '',
			ev.notes ?? ''
		]);
	}
	return rows;
}

// ─── Public export functions ──────────────────────────────────────────────────

/** The three tables that make up an export, in the order they are presented. */
export function workbookSheets(state: GameState) {
	return [
		{ name: 'Team Summary', rows: buildTeamSummaryRows(state) },
		{ name: 'Player Stats', rows: buildPlayerRows(state) },
		{ name: 'Event Log', rows: buildEventLogRows(state) }
	];
}

export function exportXLSX(state: GameState): void {
	const bytes = buildXlsx(workbookSheets(state));
	download(
		new Blob([bytes as BlobPart], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		}),
		`${fileStem(state)}_Stats.xlsx`
	);
}

/**
 * Hand a file to the browser.
 *
 * Revoking straight after a programmatic click is safe: the browser has already
 * taken its own reference to the blob by the time click() returns.
 */
function download(blob: Blob, name: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	a.click();
	URL.revokeObjectURL(url);
}

const SHEETS = {
	team: { rows: buildTeamSummaryRows, label: 'Team' },
	players: { rows: buildPlayerRows, label: 'Players' },
	events: { rows: buildEventLogRows, label: 'Events' }
} as const;

export function exportCSV(state: GameState, sheet: keyof typeof SHEETS): void {
	const { rows, label } = SHEETS[sheet];
	download(
		new Blob([toCSV(rows(state))], { type: 'text/csv;charset=utf-8;' }),
		`${fileStem(state)}_${label}.csv`
	);
}
