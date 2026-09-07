<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		onClose,
		children,
		footer,
		width = 'max-w-sm'
	}: {
		title: string;
		onClose: () => void;
		children: Snippet;
		footer?: Snippet;
		width?: string;
	} = $props();

	let dialog = $state<HTMLDivElement | null>(null);
	let previouslyFocused: HTMLElement | null = null;

	function focusable(): HTMLElement[] {
		if (!dialog) return [];
		return Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
	}

	$effect(() => {
		previouslyFocused = document.activeElement as HTMLElement | null;
		focusable()[0]?.focus();
		return () => previouslyFocused?.focus();
	});

	// Escape to dismiss, Tab cycled within the dialog — a modal that traps focus
	// is the difference between "press Escape" and "hunt for the Cancel button"
	// when something opens by accident mid-play.
	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			onClose();
			return;
		}
		if (e.key !== 'Tab') return;
		const items = focusable();
		if (items.length === 0) return;
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
	role="presentation"
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
	<div
		bind:this={dialog}
		role="dialog"
		aria-modal="true"
		aria-label={title}
		class="w-full {width} space-y-4 rounded-xl bg-gray-800 p-6 shadow-2xl"
	>
		<div class="flex items-start gap-4">
			<h3 class="text-lg font-bold text-white">{title}</h3>
			<button
				onclick={onClose}
				aria-label="Close dialog"
				class="ml-auto -mt-1 rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
			>✕</button>
		</div>

		{@render children()}

		{#if footer}
			<div class="flex justify-end gap-2">{@render footer()}</div>
		{/if}
	</div>
</div>
