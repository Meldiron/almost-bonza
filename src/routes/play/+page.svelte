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
					const controls = {
						view: { x: 0, y: 0, zoom: 1 },
						viewPos: { prevX: null, prevY: null, isDragging: false }
					};

					p5.setup = () => {
						p5.createCanvas(window.innerWidth, window.innerHeight);
					};

					p5.draw = () => {
						p5.background(10, 10, 10);
						p5.translate(controls.view.x, controls.view.y);
						p5.scale(controls.view.zoom);

						if (!gameState) {
							return;
						}

						for (const block of gameState.blocks) {
							drawBlock(p5, block);
						}
					};

					p5.mousePressed = () => {
						controls.viewPos.isDragging = true;
						controls.viewPos.prevX = p5.mouseX;
						controls.viewPos.prevY = p5.mouseY;
					};

					p5.mouseDragged = () => {
						const { prevX, prevY, isDragging } = controls.viewPos;
						if (!isDragging) return;

						const pos = { x: p5.mouseX, y: p5.mouseY };
						const dx = pos.x - (prevX ?? 0);
						const dy = pos.y - (prevY ?? 0);

						if (prevX || prevY) {
							controls.view.x += dx;
							controls.view.y += dy;

							controls.viewPos.prevX = pos.x;
							controls.viewPos.prevY = pos.y;
						}
					};

					p5.mouseReleased = () => {
						controls.viewPos.isDragging = false;
						controls.viewPos.prevX = null;
						controls.viewPos.prevY = null;
					};

					p5.mouseWheel = (event: any) => {
						event.stopPropagation();
						event.preventDefault();

						const { deltaY } = event;
						const direction = deltaY > 0 ? -1 : 1;
						const factor = 0.05;
						const zoom = 1 * direction * factor;

						const wx = (p5.mouseX - controls.view.x) / (p5.width * controls.view.zoom);
						const wy = (p5.mouseY - controls.view.y) / (p5.height * controls.view.zoom);

						if (controls.view.zoom + zoom > 2) {
							return;
						}
						if (controls.view.zoom + zoom < 0.3) {
							return;
						}

						controls.view.x -= wx * p5.width * zoom;
						controls.view.y -= wy * p5.height * zoom;
						controls.view.zoom += zoom;
					};
				};
				prepared = true;
			}
		}
	});

	function drawBlock(p5: any, block: GeneratorResult['blocks'][number]) {
		const size = 64;
		p5.fill(23);
		p5.rect(block.x * size, block.y * size, size, size);
		p5.fill(245);
		p5.textSize(48);
		p5.textAlign(p5.CENTER);
		p5.text(block.letter.toUpperCase(), block.x * size + size / 2, block.y * size + size - 16);
	}
</script>

{#if prepared}
	<P5 {sketch} />
{/if}
