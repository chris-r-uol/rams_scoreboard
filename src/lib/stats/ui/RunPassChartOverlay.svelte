<script lang="ts">
	import type { GameState } from '../types';

	let { state }: { state: GameState } = $props();

	const team = $derived(state.team);
	const passes = $derived(state.teamStats.passing.attempts);
	const rushes = $derived(state.teamStats.rushing.attempts);
	const total = $derived(passes + rushes);

	// SVG donut helpers
	function polar(cx: number, cy: number, r: number, angleDeg: number) {
		const rad = (angleDeg - 90) * (Math.PI / 180);
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	function donutSlice(
		cx: number, cy: number,
		outerR: number, innerR: number,
		startDeg: number, sweepDeg: number
	): string {
		// An all-pass (or all-rush) game leaves the other slice with a negative
		// sweep once the 2° separator gap is subtracted, which rendered a stray
		// sliver instead of nothing. Clamp to a real range.
		if (sweepDeg <= 0) return '';
		const sweep = Math.min(sweepDeg, 359.9);
		const p1 = polar(cx, cy, outerR, startDeg);
		const p2 = polar(cx, cy, outerR, startDeg + sweep);
		const p3 = polar(cx, cy, innerR, startDeg + sweep);
		const p4 = polar(cx, cy, innerR, startDeg);
		const large = sweep > 180 ? 1 : 0;
		return `M${p1.x} ${p1.y} A${outerR} ${outerR} 0 ${large} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${innerR} ${innerR} 0 ${large} 0 ${p4.x} ${p4.y}Z`;
	}

	const passDeg = $derived(total > 0 ? (passes / total) * 360 : 180);
	const rushDeg = $derived(total > 0 ? (rushes / total) * 360 : 180);

	function pct(n: number): string {
		return total === 0 ? '—' : `${Math.round((n / total) * 100)}%`;
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
		<div style="font-weight:900;font-size:0.85rem;letter-spacing:0.08em;">RUN / PASS SPLIT</div>
		<div style="font-size:0.65rem;opacity:0.55;margin-left:auto;letter-spacing:0.1em;">{team.abbreviation}</div>
	</div>

	<!-- Chart body -->
	<div style="padding:12px 16px 16px;display:flex;align-items:center;gap:20px;">
		<!-- Donut SVG -->
		<svg viewBox="0 0 120 120" width="100" height="100" style="flex-shrink:0;">
			{#if total === 0}
				<!-- Empty state: dashed circle -->
				<circle cx="60" cy="60" r="42" fill="none" stroke="{team.textColor}" stroke-width="18" opacity="0.15" />
				<circle cx="60" cy="60" r="20" fill="{team.primaryColor}" />
			{:else}
				<!-- Pass slice -->
				<path d={donutSlice(60, 60, 52, 32, 0, passDeg)} fill={team.secondaryColor} />
				<!-- Rush slice (with small gap) -->
				<path d={donutSlice(60, 60, 52, 32, passDeg + 2, rushDeg - 2)} fill="{team.textColor}" opacity="0.45" />
				<!-- Centre hole fill — r must match innerR (32) or a ring of slice
				     colour bleeds through inside the hole. -->
				<circle cx="60" cy="60" r="32" fill="{team.primaryColor}" />
				<!-- Total label in centre -->
				<text x="60" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="{team.textColor}" opacity="0.9">{total}</text>
				<text x="60" y="68" text-anchor="middle" font-size="8" fill="{team.textColor}" opacity="0.5">PLAYS</text>
			{/if}
		</svg>

		<!-- Legend -->
		<div style="flex:1;display:flex;flex-direction:column;gap:10px;font-size:0.82rem;font-variant-numeric:tabular-nums;">
			<!-- Pass row -->
			<div style="display:flex;align-items:center;gap:8px;">
				<div style="width:10px;height:10px;border-radius:2px;background:{team.secondaryColor};flex-shrink:0;"></div>
				<div style="flex:1;font-weight:600;">PASS</div>
				<div style="font-weight:700;">{passes} <span style="opacity:0.6;font-size:0.75rem;">({pct(passes)})</span></div>
			</div>
			<!-- Rush row -->
			<div style="display:flex;align-items:center;gap:8px;">
				<div style="width:10px;height:10px;border-radius:2px;background:{team.textColor};opacity:0.45;flex-shrink:0;"></div>
				<div style="flex:1;font-weight:600;">RUSH</div>
				<div style="font-weight:700;">{rushes} <span style="opacity:0.6;font-size:0.75rem;">({pct(rushes)})</span></div>
			</div>
			<!-- Divider + passing yards -->
			<div style="border-top:1px solid {team.textColor}20;padding-top:8px;font-size:0.75rem;opacity:0.7;">
				<div style="display:flex;justify-content:space-between;"><span>Pass Yds</span><span>{state.teamStats.passing.yards}</span></div>
				<div style="display:flex;justify-content:space-between;"><span>Rush Yds</span><span>{state.teamStats.rushing.yards}</span></div>
				<div style="display:flex;justify-content:space-between;font-weight:700;opacity:1;"><span>Total Yds</span><span>{state.teamStats.totalOffensiveYards}</span></div>
			</div>
		</div>
	</div>
</div>
