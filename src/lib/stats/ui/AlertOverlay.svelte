<script lang="ts">
	import type { AlertState, TeamConfig } from '../types';

	let {
		alert,
		team,
		now
	}: {
		alert: AlertState;
		team: TeamConfig;
		now: number;
	} = $props();

	const progress = $derived(Math.max(0, (alert.expiresAt - now) / 10000));
	const isBigPlay = $derived(alert.type === 'big_play');
</script>

<div
	style="width:380px; background:{team.primaryColor}; color:{team.textColor}; border:3px solid {team.secondaryColor}; border-radius:10px; font-family:sans-serif; box-shadow:0 12px 40px rgba(0,0,0,0.8); overflow:hidden;"
>
	<!-- Countdown progress bar -->
	<div style="height:4px; background:{team.secondaryColor}20; position:relative;">
		<div style="position:absolute;top:0;left:0;height:100%;background:{team.secondaryColor};width:{progress * 100}%;transition:width 0.5s linear;"></div>
	</div>

	<!-- Header -->
	<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:2px solid {team.secondaryColor}40;">
		{#if team.logoDataUrl}
			<img src={team.logoDataUrl} alt={team.abbreviation} style="height:32px;width:32px;object-fit:contain;flex-shrink:0;" />
		{/if}
		<div style="font-weight:900;font-size:1.35rem;letter-spacing:0.06em;">{alert.title}</div>
		<div style="margin-left:auto;font-size:0.65rem;opacity:0.6;letter-spacing:0.14em;text-transform:uppercase;">
			{isBigPlay ? 'BIG PLAY' : 'MILESTONE'}
		</div>
	</div>

	<!-- Body -->
	<div style="padding:12px 16px 16px;">
		{#if alert.playerNumber || alert.playerName}
			<div style="font-size:0.95rem;font-weight:700;letter-spacing:0.04em;margin-bottom:4px;">
				{alert.playerNumber ? `#${alert.playerNumber} ` : ''}{alert.playerName.toUpperCase()}
			</div>
		{/if}
		<div style="font-size:0.82rem;opacity:0.85;">{alert.subtitle}</div>
		{#if alert.yards !== undefined && isBigPlay}
			<div style="margin-top:6px;font-size:1.6rem;font-weight:900;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;color:{team.secondaryColor};">
				{alert.yards > 0 ? '+' : ''}{alert.yards} YDS
			</div>
		{/if}
	</div>
</div>
