<script lang="ts">
	import P5 from 'p5-svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { GameState } from '$lib/generator';

	let prepared = $state(false);
	let gameState = $state<GameState | null>(null);

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
						view: { x: 0, y: 0, zoom: 0.5 },
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

						for (const brick of gameState.bricks) {
							drawBrick(p5, brick);
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

	function drawBlock(p5: any, block: GameState['blocks'][number]) {
		const size = 64;
		p5.fill(23);
		p5.rect(block.x * size, block.y * size, size, size);
		p5.fill(245);
		p5.textSize(48);
		p5.textAlign(p5.CENTER);
		p5.text(block.letter.toUpperCase(), block.x * size + size / 2, block.y * size + size - 16);
	}

	function drawBrick(p5: any, brick: GameState['bricks'][number]) {
		const size = 64;
		const borderWidth = 1;
		
		// First, draw all blocks in the brick
		for (const block of brick.blocks) {
			drawBlock(p5, block);
		}
		
		// Then, draw borders around the brick perimeter
		p5.stroke(70); // Yellow-orange border color
		p5.strokeWeight(borderWidth);
		p5.noFill();
		
		// Create a set of all block positions in this brick for quick lookup
		const blockPositions = new Set(brick.blocks.map(block => `${block.x},${block.y}`));
		
		// For each block, check which sides need borders (sides that don't touch other blocks in the same brick)
		for (const block of brick.blocks) {
			const x = block.x * size;
			const y = block.y * size;
			
			// Check each side and draw border if it's an external edge
			const neighbors = [
				{ dx: 0, dy: -1, side: 'top' },    // top
				{ dx: 1, dy: 0, side: 'right' },   // right  
				{ dx: 0, dy: 1, side: 'bottom' },  // bottom
				{ dx: -1, dy: 0, side: 'left' }    // left
			];
			
			for (const neighbor of neighbors) {
				const neighborKey = `${block.x + neighbor.dx},${block.y + neighbor.dy}`;
				
				// If neighbor position is not in this brick, draw border on this side
				if (!blockPositions.has(neighborKey)) {
					switch (neighbor.side) {
						case 'top':
							p5.line(x, y, x + size, y);
							break;
						case 'right':
							p5.line(x + size, y, x + size, y + size);
							break;
						case 'bottom':
							p5.line(x, y + size, x + size, y + size);
							break;
						case 'left':
							p5.line(x, y, x, y + size);
							break;
					}
				}
			}
		}
		
		// Reset stroke for other drawing operations
		p5.noStroke();
	}
</script>

{#if prepared}
	<P5 {sketch} />
{/if}
