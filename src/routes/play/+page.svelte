<script lang="ts">
	import P5 from 'p5-svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { GeneratorResult } from '$lib/generator';

	let prepared = $state(false);
	let gameState = $state<GeneratorResult | null>(null);

	let sketch: any;
	onMount(() => {
		const stateParam = $page.url.searchParams.get('state');
		console.log(stateParam);
		if (stateParam) {
			try {
				gameState = JSON.parse(atob(stateParam));
			} catch (error) {
				console.log(error);
				alert('Something went wrong.');
			}

			if (gameState) {
				sketch = (p5: any) => {
					p5.setup = () => {
						p5.createCanvas(500, 500);
						p5.background(10, 10, 10);
					};

					p5.draw = () => {
						// p5.ellipse(50, 50, 30, 30);
					};
				};
				prepared = true;
			}
		}
	});
</script>

{#if prepared}
	<P5 {sketch} />
{/if}
