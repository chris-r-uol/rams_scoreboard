<script lang="ts">
	import type { GameState, Drive, DriveResult } from '../types';
	import { possessionMs, formatPossession } from '../drives';

	/**
	 * Named `game`, not `state`, unlike the other overlays.
	 *
	 * This one needs a ticking clock, and `$state(...)` inside a component with
	 * a prop called `state` is parsed as auto-subscribing to a store of that
	 * name — the rune never runs, and the component dies at runtime with
	 * `store_invalid_shape` while the build passes happily.
	 */
	let { game }: { game: GameState } = $props();

	const team = $derived(game.team);
	// Ticked rather than derived from Date.now(): a clock that only updates when
	// something else changes is not a clock. Only runs while a drive is open.
	let now = $state(Date.now());
	$effect(() => {
		if (!game.currentDrive) return;
		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const possession = $derived(
		formatPossession(possessionMs(game.currentDrive, game.completedDrives, now))
	);
	const drive = $derived(game.currentDrive);
	const completed = $derived(game.completedDrives.slice(-3).reverse());

	const RESULT_LABEL: Record<DriveResult, string> = {
		touchdown: 'TD',
		punt: 'PUNT',
		field_goal: 'FG',
		turnover: 'TO',
		turnover_on_downs: 'DOWNS',
		end_of_period: 'END',
		safety: 'SAFETY',
		ongoing: 'ACTIVE'
	};

	const RESULT_COLOR: Record<DriveResult, string> = {
		touchdown: '#22c55e',
		punt: '#9ca3af',
		field_goal: '#fbbf24',
		turnover: '#ef4444',
		turnover_on_downs: '#ef4444',
		end_of_period: '#9ca3af',
		safety: '#ef4444',
		ongoing: '#60a5fa'
	};

	function yardLine(drive: Drive): string {
		if (drive.startYardLine === undefined) return '';
		const end = drive.startYardLine + drive.yardsGained;
		return `Own ${drive.startYardLine} → ${end > 50 ? `Opp ${100 - end}` : `Own ${end}`}`;
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
		<div style="font-weight:900;font-size:0.85rem;letter-spacing:0.08em;">DRIVE SUMMARY</div>
		<!-- Time of possession belongs on the drive panel: it is the sum of
		     exactly what this panel is showing. -->
		<div style="font-size:0.65rem;opacity:0.55;margin-left:auto;letter-spacing:0.1em;text-align:right;">
			<div>{team.abbreviation}</div>
			<div style="font-variant-numeric:tabular-nums;">TOP {possession}</div>
		</div>
	</div>

	<!-- Current drive -->
	<div style="padding:10px 16px;border-bottom:1px solid {team.textColor}15;">
		{#if drive}
			<div style="font-size:0.65rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">CURRENT DRIVE</div>
			<div style="display:flex;gap:20px;font-variant-numeric:tabular-nums;">
				<div>
					<div style="font-size:1.2rem;font-weight:900;">{drive.plays}</div>
					<div style="font-size:0.65rem;opacity:0.6;text-transform:uppercase;">PLAYS</div>
				</div>
				<div>
					<div style="font-size:1.2rem;font-weight:900;">{drive.yardsGained > 0 ? '+' : ''}{drive.yardsGained}</div>
					<div style="font-size:0.65rem;opacity:0.6;text-transform:uppercase;">YARDS</div>
				</div>
				{#if drive.startYardLine !== undefined}
					<div style="align-self:flex-end;font-size:0.72rem;opacity:0.7;padding-bottom:2px;">{yardLine(drive)}</div>
				{/if}
			</div>
		{:else}
			<div style="font-size:0.8rem;opacity:0.45;text-align:center;padding:6px 0;">No active drive</div>
		{/if}
	</div>

	<!-- Completed drives -->
	{#if completed.length > 0}
		<div style="padding:8px 16px;display:flex;flex-direction:column;gap:6px;">
			<div style="font-size:0.65rem;opacity:0.55;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px;">RECENT DRIVES</div>
			{#each completed as d}
				<div style="display:flex;align-items:baseline;gap:10px;font-size:0.78rem;font-variant-numeric:tabular-nums;">
					<span style="font-weight:700;color:{RESULT_COLOR[d.result]};width:52px;flex-shrink:0;">{RESULT_LABEL[d.result]}</span>
					<span style="opacity:0.7;">{d.plays} plays</span>
					<span style="opacity:0.7;">{d.yardsGained > 0 ? '+' : ''}{d.yardsGained} yds</span>
					{#if d.startYardLine !== undefined}
						<span style="opacity:0.45;font-size:0.7rem;margin-left:auto;">Own {d.startYardLine}</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
