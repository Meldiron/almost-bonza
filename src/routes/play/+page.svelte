<script lang="ts">
	import P5 from 'p5-svelte';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { GameState } from '$lib/generator';

	let prepared = $state(false);
	let gameState = $state<GameState | null>(null);
	let isEditorMode = $state(false);

	let sketch: any;
	onMount(() => {
		const stateParam = $page.url.searchParams.get('state');
		const modeParam = $page.url.searchParams.get('mode');
		isEditorMode = modeParam === 'editor';
		
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
						},
						hover: {
							hoveredBorder: any | null
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
						},
						hover: {
							hoveredBorder: null
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
						
						// Draw hover indicator for borders (only in editor mode)
						if (isEditorMode && controls.hover.hoveredBorder) {
							drawBorderHighlight(p5, controls.hover.hoveredBorder);
						}
					};

					p5.mousePressed = () => {
					if(!gameState) {
					return;
					}
					
						const worldPos = screenToWorld(p5, p5.mouseX, p5.mouseY, controls);
						
						// Check if click is on a border first (only in editor mode)
						if (isEditorMode) {
							const borderInfo = getBorderAtPosition(worldPos.x, worldPos.y, gameState);
							if (borderInfo) {
								handleBorderClick(borderInfo, gameState);
								return;
							}
						}
						
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
							} else if (!isEditorMode) {
								// In non-editor mode, check for valid words and auto-merge
								checkAndMergeValidWords(gameState);
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

					p5.mouseMoved = () => {
						if (!gameState || !isEditorMode) {
							controls.hover.hoveredBorder = null;
							return;
						}
						
						const worldPos = screenToWorld(p5, p5.mouseX, p5.mouseY, controls);
						const borderInfo = getBorderAtPosition(worldPos.x, worldPos.y, gameState);
						controls.hover.hoveredBorder = borderInfo;
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

	function getBorderAtPosition(worldX: number, worldY: number, gameState: GameState) {
		const size = 64;
		const tolerance = 5; // pixels tolerance for clicking on border
		
		// Check horizontal borders (between vertically adjacent blocks)
		const gridX = Math.floor(worldX / size);
		const borderY = Math.round(worldY / size) * size;
		const distanceToHorizontalBorder = Math.abs(worldY - borderY);
		
		if (distanceToHorizontalBorder <= tolerance) {
			const topBlockY = Math.floor(borderY / size) - 1;
			const bottomBlockY = Math.floor(borderY / size);
			
			const topBlock = getBlockAtPosition(gridX, topBlockY, gameState);
			const bottomBlock = getBlockAtPosition(gridX, bottomBlockY, gameState);
			
			if (topBlock && bottomBlock) {
				return {
					type: 'horizontal',
					x: gridX,
					y: borderY / size,
					topBlock,
					bottomBlock,
					topBrick: topBlock ? getBrickContaining(topBlock, gameState) : null,
					bottomBrick: bottomBlock ? getBrickContaining(bottomBlock, gameState) : null
				};
			}
		}
		
		// Check vertical borders (between horizontally adjacent blocks)
		const gridY = Math.floor(worldY / size);
		const borderX = Math.round(worldX / size) * size;
		const distanceToVerticalBorder = Math.abs(worldX - borderX);
		
		if (distanceToVerticalBorder <= tolerance) {
			const leftBlockX = Math.floor(borderX / size) - 1;
			const rightBlockX = Math.floor(borderX / size);
			
			const leftBlock = getBlockAtPosition(leftBlockX, gridY, gameState);
			const rightBlock = getBlockAtPosition(rightBlockX, gridY, gameState);
			
			if (leftBlock && rightBlock) {
				return {
					type: 'vertical',
					x: borderX / size,
					y: gridY,
					leftBlock,
					rightBlock,
					leftBrick: leftBlock ? getBrickContaining(leftBlock, gameState) : null,
					rightBrick: rightBlock ? getBrickContaining(rightBlock, gameState) : null
				};
			}
		}
		
		return null;
	}

	function getBlockAtPosition(x: number, y: number, gameState: GameState) {
		for (const brick of gameState.bricks) {
			for (const block of brick.blocks) {
				if (block.x === x && block.y === y) {
					return block;
				}
			}
		}
		return null;
	}

	function getBrickContaining(targetBlock: any, gameState: GameState) {
		for (const brick of gameState.bricks) {
			for (const block of brick.blocks) {
				if (block === targetBlock) {
					return brick;
				}
			}
		}
		return null;
	}

	function handleBorderClick(borderInfo: any, gameState: GameState) {
		const { type, topBlock, bottomBlock, leftBlock, rightBlock, topBrick, bottomBrick, leftBrick, rightBrick } = borderInfo;
		
		let brick1: any, brick2: any;
		if (type === 'horizontal') {
			brick1 = topBrick;
			brick2 = bottomBrick;
		} else {
			brick1 = leftBrick;
			brick2 = rightBrick;
		}
		
		// If both sides have blocks and they're from different bricks, merge them
		if (brick1 && brick2 && brick1 !== brick2) {
			mergeBricks(brick1, brick2, gameState);
		}
		// If it's an internal border (same brick) or external border, split the brick
		else if (brick1) {
			splitBrick(brick1, borderInfo, gameState);
		} else if (brick2) {
			splitBrick(brick2, borderInfo, gameState);
		}
	}

	function mergeBricks(brick1: any, brick2: any, gameState: GameState) {
		// Combine all blocks from both bricks
		const mergedBlocks = [...brick1.blocks, ...brick2.blocks];
		
		// Create new merged brick
		const mergedBrick = {
			blocks: mergedBlocks,
			word: brick1.word + brick2.word // Combine words
		};
		
		// Remove original bricks and add merged brick
		const brick1Index = gameState.bricks.indexOf(brick1);
		const brick2Index = gameState.bricks.indexOf(brick2);
		
		// Remove bricks (remove higher index first to avoid index shifting)
		if (brick1Index > brick2Index) {
			gameState.bricks.splice(brick1Index, 1);
			gameState.bricks.splice(brick2Index, 1);
		} else {
			gameState.bricks.splice(brick2Index, 1);
			gameState.bricks.splice(brick1Index, 1);
		}
		
		gameState.bricks.push(mergedBrick);
	}

	function splitBrick(brick: any, borderInfo: any, gameState: GameState) {
		if (brick.blocks.length <= 1) {
			return; // Can't split a single block
		}
		
		// Create a map for quick block lookup
		const blockMap = new Map();
		brick.blocks.forEach((block: any) => {
			blockMap.set(`${block.x},${block.y}`, block);
		});
		
		// Determine split line based on border
		const { type, x, y } = borderInfo;
		
		// Separate blocks based on the split line
		const group1: any[] = [];
		const group2: any[] = [];
		
		for (const block of brick.blocks) {
			if (type === 'horizontal') {
				// Split horizontally - blocks above and below the line
				if (block.y < y) {
					group1.push(block);
				} else {
					group2.push(block);
				}
			} else {
				// Split vertically - blocks left and right of the line
				if (block.x < x) {
					group1.push(block);
				} else {
					group2.push(block);
				}
			}
		}
		
		// Only split if both groups have blocks
		if (group1.length > 0 && group2.length > 0) {
			// Remove original brick
			const brickIndex = gameState.bricks.indexOf(brick);
			gameState.bricks.splice(brickIndex, 1);
			
			// Add new bricks
			gameState.bricks.push({
				blocks: group1,
				word: group1.map((block: any) => block.letter).join('')
			});
			
			gameState.bricks.push({
				blocks: group2,
				word: group2.map((block: any) => block.letter).join('')
			});
		}
	}

	function drawBorderHighlight(p5: any, borderInfo: any) {
		const size = 64;
		const { type, x, y, topBrick, bottomBrick, leftBrick, rightBrick } = borderInfo;
		
		p5.stroke(150, 150, 150); // Light gray color for hover
		p5.strokeWeight(3);
		
		if (type === 'horizontal') {
			// Draw horizontal line
			const lineY = y * size;
			const startX = x * size;
			const endX = (x + 1) * size;
			p5.line(startX, lineY, endX, lineY);
		} else {
			// Draw vertical line
			const lineX = x * size;
			const startY = y * size;
			const endY = (y + 1) * size;
			p5.line(lineX, startY, lineX, endY);
		}
		
		p5.noStroke();
	}

	function checkAndMergeValidWords(gameState: GameState) {
		if (!gameState.words) return;
		
		// Find all possible sequences of adjacent blocks that could form words
		const sequences = findAllBlockSequences(gameState);
		
		// Check which sequences form valid words
		for (const sequence of sequences) {
			const word = sequence.blocks.map(block => block.letter).join('').toLowerCase();
			
			// Check if this word exists in gameState.words
			if (gameState.words.some(validWord => validWord.toLowerCase() === word)) {
				// Get all the bricks that contain these blocks
				const bricksToMerge = new Set();
				for (const block of sequence.blocks) {
					const brick = getBrickContaining(block, gameState);
					if (brick) {
						bricksToMerge.add(brick);
					}
				}
				
				// If blocks are from different bricks, merge them
				const bricksArray = Array.from(bricksToMerge);
				if (bricksArray.length > 1) {
					// Merge all bricks into the first one
					let baseBrick = bricksArray[0];
					for (let i = 1; i < bricksArray.length; i++) {
						const brickToMerge = bricksArray[i];
						baseBrick.blocks.push(...brickToMerge.blocks);
						baseBrick.word += brickToMerge.word;
						
						// Remove the merged brick from gameState
						const index = gameState.bricks.indexOf(brickToMerge);
						if (index > -1) {
							gameState.bricks.splice(index, 1);
						}
					}
				}
			}
		}
	}

	function findAllBlockSequences(gameState: GameState): Array<{blocks: any[], direction: 'horizontal' | 'vertical'}> {
		const sequences = [];
		const processedBlocks = new Set();
		
		// Get all blocks from all bricks
		const allBlocks = [];
		for (const brick of gameState.bricks) {
			allBlocks.push(...brick.blocks);
		}
		
		for (const startBlock of allBlocks) {
			const blockKey = `${startBlock.x},${startBlock.y}`;
			if (processedBlocks.has(blockKey)) continue;
			
			// Try horizontal sequence (right direction)
			const horizontalSequence = [startBlock];
			let currentX = startBlock.x + 1;
			const currentY = startBlock.y;
			
			while (true) {
				const nextBlock = allBlocks.find(block => block.x === currentX && block.y === currentY);
				if (!nextBlock) break;
				horizontalSequence.push(nextBlock);
				currentX++;
			}
			
			if (horizontalSequence.length > 1) {
				sequences.push({ blocks: horizontalSequence, direction: 'horizontal' });
				horizontalSequence.forEach(block => processedBlocks.add(`${block.x},${block.y}`));
			}
			
			// Try vertical sequence (down direction)
			if (!processedBlocks.has(blockKey)) {
				const verticalSequence = [startBlock];
				const currentX2 = startBlock.x;
				let currentY2 = startBlock.y + 1;
				
				while (true) {
					const nextBlock = allBlocks.find(block => block.x === currentX2 && block.y === currentY2);
					if (!nextBlock) break;
					verticalSequence.push(nextBlock);
					currentY2++;
				}
				
				if (verticalSequence.length > 1) {
					sequences.push({ blocks: verticalSequence, direction: 'vertical' });
					verticalSequence.forEach(block => processedBlocks.add(`${block.x},${block.y}`));
				} else {
					processedBlocks.add(blockKey);
				}
			}
		}
		
		return sequences;
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
