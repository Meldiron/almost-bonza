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
		if (stateParam) {
			try {
				gameState = JSON.parse(atob(stateParam));
			} catch (error) {
				console.log(error);
				alert('Something went wrong.');
			}

			if (gameState) {
				sketch = (p5: any) => {
					const controls: {
						view: { x: number, y: number, zoom: number },
						viewPos: { prevX: number | null, prevY: number | null, isDragging: boolean },
						blockDrag: {
							isDragging: boolean,
							draggedBrick: GameState['bricks'][number] | null,
							originalPositions: Array<{ x: number, y: number }>,
							startPos: { x: number, y: number },
							offset: { x: number, y: number }
						}
					} = {
						view: { x: 0, y: 0, zoom: 0.5 },
						viewPos: { prevX: null, prevY: null, isDragging: false },
						blockDrag: {
							isDragging: false,
							draggedBrick: null,
							originalPositions: [],
							startPos: { x: 0, y: 0 },
							offset: { x: 0, y: 0 }
						}
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
					if(!gameState) {
					return;
					}
					
						const worldPos = screenToWorld(p5, p5.mouseX, p5.mouseY, controls);
						const clickedBrick = getBrickAtPosition(worldPos.x, worldPos.y, gameState);
						
						if (clickedBrick) {
							// Start dragging a brick
							controls.blockDrag.isDragging = true;
							controls.blockDrag.draggedBrick = clickedBrick;
							controls.blockDrag.originalPositions = clickedBrick.blocks.map(block => ({ x: block.x, y: block.y }));
							controls.blockDrag.startPos = { x: worldPos.x, y: worldPos.y };
							
							// Calculate offset from where we clicked relative to the first block's position
							const firstBlock = clickedBrick.blocks[0];
							const blockX = firstBlock.x * 64;
							const blockY = firstBlock.y * 64;
							controls.blockDrag.offset = {
								x: worldPos.x - blockX,
								y: worldPos.y - blockY
							};
						} else {
							// Start dragging the view
							controls.viewPos.isDragging = true;
							controls.viewPos.prevX = p5.mouseX;
							controls.viewPos.prevY = p5.mouseY;
						}
					};

					p5.mouseDragged = () => {
						if (controls.blockDrag.isDragging && controls.blockDrag.draggedBrick) {
							// Dragging a brick - preserve precise position
							const worldPos = screenToWorld(p5, p5.mouseX, p5.mouseY, controls);
							
							// Calculate new position for the first block (reference point) without snapping
							const targetX = worldPos.x - controls.blockDrag.offset.x;
							const targetY = worldPos.y - controls.blockDrag.offset.y;
							
							// Calculate the difference from original position in grid units
							const firstOriginalBlock = controls.blockDrag.originalPositions[0];
							const deltaX = (targetX / 64) - firstOriginalBlock.x;
							const deltaY = (targetY / 64) - firstOriginalBlock.y;
							
							// Update all blocks in the brick with precise positioning
							for (let i = 0; i < controls.blockDrag.draggedBrick.blocks.length; i++) {
								const block = controls.blockDrag.draggedBrick.blocks[i];
								const originalPos = controls.blockDrag.originalPositions[i];
								block.x = originalPos.x + deltaX;
								block.y = originalPos.y + deltaY;
							}
						} else if (controls.viewPos.isDragging) {
							// Dragging the view
							const { prevX, prevY } = controls.viewPos;
							const pos = { x: p5.mouseX, y: p5.mouseY };
							const dx = pos.x - (prevX ?? 0);
							const dy = pos.y - (prevY ?? 0);

							if (prevX || prevY) {
								controls.view.x += dx;
								controls.view.y += dy;
								controls.viewPos.prevX = pos.x;
								controls.viewPos.prevY = pos.y;
							}
						}
					};

					p5.mouseReleased = () => {
					if(!gameState) {
					return;
					}
					
						if (controls.blockDrag.isDragging && controls.blockDrag.draggedBrick) {
							// Snap to grid first
							for (const block of controls.blockDrag.draggedBrick.blocks) {
								block.x = Math.round(block.x);
								block.y = Math.round(block.y);
							}
							
							// Check for collisions with other bricks
							const hasCollision = checkCollisions(controls.blockDrag.draggedBrick, gameState);
							
							if (hasCollision) {
								// Revert to original positions
								for (let i = 0; i < controls.blockDrag.draggedBrick.blocks.length; i++) {
									const block = controls.blockDrag.draggedBrick.blocks[i];
									const originalPos = controls.blockDrag.originalPositions[i];
									block.x = originalPos.x;
									block.y = originalPos.y;
								}
							}
							
							// Reset drag state
							controls.blockDrag.isDragging = false;
							controls.blockDrag.draggedBrick = null;
							controls.blockDrag.originalPositions = [];
						}
						
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

	function screenToWorld(p5: any, screenX: number, screenY: number, controls: any) {
		const worldX = (screenX - controls.view.x) / controls.view.zoom;
		const worldY = (screenY - controls.view.y) / controls.view.zoom;
		return { x: worldX, y: worldY };
	}

	function getBrickAtPosition(worldX: number, worldY: number, gameState: GameState) {
		const gridX = Math.floor(worldX / 64);
		const gridY = Math.floor(worldY / 64);
		
		for (const brick of gameState.bricks) {
			for (const block of brick.blocks) {
				if (block.x === gridX && block.y === gridY) {
					return brick;
				}
			}
		}
		return null;
	}

	function checkCollisions(draggedBrick: any, gameState: GameState) {
		for (const block of draggedBrick.blocks) {
			// Check collision with other bricks
			for (const otherBrick of gameState.bricks) {
				if (otherBrick === draggedBrick) continue;
				
				for (const otherBlock of otherBrick.blocks) {
					if (block.x === otherBlock.x && block.y === otherBlock.y) {
						return true;
					}
				}
			}
		}
		return false;
	}

	function drawBlock(p5: any, block: GameState['bricks'][number]['blocks'][number]) {
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
