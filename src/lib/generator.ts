import * as clg from 'crossword-layout-generator';

type CLSResult = {
	cols: number;
	rows: number;
	table: string[][];
	table_string: string;
	result: {
		clue: string;
		answer: string;
		orientation: 'across' | 'down';
		position: number;
		startx: number;
		starty: number;
	}[];
};

export type GeneratorBlocksResult = {
	blocks: {
		x: number;
		y: number;
		letter: string;
	}[];
};

export type GeneratorBricksResult = {
	bricks: {
		blocks: {
			x: number;
			y: number;
			letter: string;
		}[];
	}[];
};

export type GameState = {
	bricks: GeneratorBricksResult['bricks'];
	hint: string;
};

export function generateCrossword(words: string[], retries = 1): GeneratorBlocksResult {
	const randomWords = words.sort(() => Math.random() - 0.5);

	const layout: CLSResult = clg.generateLayout(
		randomWords.map((word) => {
			return {
				clue: '',
				answer: word
			};
		})
	);

	const blockMap = new Map<string, { x: number; y: number; letter: string }>();
	for (const word of layout.result) {
		const { answer, startx, starty, orientation } = word;

		for (let i = 0; i < answer.length; i++) {
			const letter = answer[i];
			const x = orientation === 'across' ? startx + i : startx;
			const y = orientation === 'down' ? starty + i : starty;

			const key = `${x},${y}`;
			if (!blockMap.has(key)) {
				blockMap.set(key, { x, y, letter });
			}
		}
	}

	const output = {
		blocks: [...blockMap.values()]
	};

	if (!validateCrossword(output)) {
		if (retries > 10) {
			alert("Puzzle generated, but it's not valid because it consists of multiple continents.");
		} else {
			return generateCrossword(words, retries + 1);
		}
	}

	return output;
}

function validateCrossword(crossword: GeneratorBlocksResult): boolean {
	const blocks = crossword.blocks;

	if (blocks.length === 0) {
		return true;
	}

	// Start with the first block
	const visited = new Set<string>();
	const queue = [blocks[0]];
	visited.add(`${blocks[0].x},${blocks[0].y}`);

	// BFS to find all connected blocks
	while (queue.length > 0) {
		const currentBlock = queue.shift()!;

		// Check all 4 directions (up, down, left, right)
		const neighbors = [
			{ x: currentBlock.x, y: currentBlock.y + 1 },
			{ x: currentBlock.x, y: currentBlock.y - 1 },
			{ x: currentBlock.x + 1, y: currentBlock.y },
			{ x: currentBlock.x - 1, y: currentBlock.y }
		];

		for (const neighborPos of neighbors) {
			const neighborKey = `${neighborPos.x},${neighborPos.y}`;

			// Find if this neighbor position exists in our blocks
			const neighborBlock = blocks.find(
				(block) => block.x === neighborPos.x && block.y === neighborPos.y
			);

			// If neighbor exists and hasn't been visited, add to queue
			if (neighborBlock && !visited.has(neighborKey)) {
				visited.add(neighborKey);
				queue.push(neighborBlock);
			}
		}
	}

	// If we visited all blocks, the crossword is connected
	return visited.size === blocks.length;
}

export function blocksToBricks(
	blocks: GeneratorBlocksResult['blocks'],
	retries = 1
): GeneratorBricksResult {
	const areNeighbors = (
		block1: { x: number; y: number },
		block2: { x: number; y: number }
	): boolean => {
		return Math.abs(block1.x - block2.x) + Math.abs(block1.y - block2.y) === 1;
	};

	const bricks = [];
	const usedBlocks = new Set<string>();

	// Helper function to get block key
	const getBlockKey = (block: { x: number; y: number }) => `${block.x},${block.y}`;

	// Helper function to find neighbors
	const findNeighbors = (block: { x: number; y: number; letter: string }) => {
		const neighbors = [];
		const directions = [
			{ dx: 0, dy: 1 }, // up
			{ dx: 0, dy: -1 }, // down
			{ dx: 1, dy: 0 }, // right
			{ dx: -1, dy: 0 } // left
		];

		for (const dir of directions) {
			const neighborX = block.x + dir.dx;
			const neighborY = block.y + dir.dy;
			const neighborBlock = blocks.find((b) => b.x === neighborX && b.y === neighborY);

			if (neighborBlock && !usedBlocks.has(getBlockKey(neighborBlock))) {
				neighbors.push(neighborBlock);
			}
		}

		return neighbors;
	};

	// Helper function to get probability based on brick size
	const getProbability = (brickSize: number) => {
		if (brickSize < 2) return 1.0; // Always add first neighbor
		if (brickSize === 2) return 0.4;
		if (brickSize === 3) return 0.2;
		if (brickSize === 4) return 0.1;
		if (brickSize === 5) return 0.05;
		return 0.01; // 10% for 6+ blocks
	};

	// Recursive function to build a brick
	const buildBrick = (currentBrick: typeof blocks, startBlock: (typeof blocks)[0]) => {
		const neighbors = findNeighbors(startBlock);

		for (const neighbor of neighbors) {
			const probability = getProbability(currentBrick.length);

			if (Math.random() < probability) {
				usedBlocks.add(getBlockKey(neighbor));
				currentBrick.push(neighbor);
				buildBrick(currentBrick, neighbor);
			}
		}
	};

	// Sort blocks by edge priority
	const randomBlocks = blocks.sort(() => Math.random() - 0.5);

	// Process each block, starting with edge blocks
	for (const block of randomBlocks) {
		if (usedBlocks.has(getBlockKey(block))) {
			continue;
		}

		// Start a new brick
		const currentBrick = [block];
		usedBlocks.add(getBlockKey(block));

		// Build the brick recursively
		buildBrick(currentBrick, block);

		bricks.push({ blocks: currentBrick });
	}

	// Handle any remaining blocks that weren't processed
	for (const block of blocks) {
		if (!usedBlocks.has(getBlockKey(block))) {
			bricks.push({ blocks: [block] });
			usedBlocks.add(getBlockKey(block));
		}
	}

	// Handle single-block bricks by merging them with neighboring bricks
	for (let i = bricks.length - 1; i >= 0; i--) {
		const currentBrick = bricks[i];

		// If brick has only one block, try to merge it with an existing brick
		if (currentBrick.blocks.length === 1) {
			const singleBlock = currentBrick.blocks[0];
			let merged = false;

			// Loop through all other bricks
			for (let j = 0; j < bricks.length; j++) {
				if (i === j) continue; // Skip the current single-block brick

				const otherBrick = bricks[j];

				// Check if any block in the other brick is a neighbor of the single block
				for (const otherBlock of otherBrick.blocks) {
					if (areNeighbors(singleBlock, otherBlock)) {
						// Merge the single block into this brick
						otherBrick.blocks.push(singleBlock);
						merged = true;
						break;
					}
				}

				if (merged) break;
			}

			// Remove the single-block brick after merging
			if (merged) {
				bricks.splice(i, 1);
			}
		}
	}

	if (bricks.length === 1) {
		if (retries > 100) {
			throw new Error('Could not generate puzzle');
		}

		return blocksToBricks(blocks, retries + 1);
	}

	return {
		bricks: bricks
	};
}

export function shuffleBricks(bricks: GeneratorBricksResult["bricks"]): GeneratorBricksResult {
  // Shuffle bricks in a compact area near origin with 1-block gaps minimum
  
  // Keep track of occupied positions (including 1-block buffer zones)
  const occupiedPositions = new Set<string>();
  
  // Helper function to check if a position conflicts with occupied areas
  const isPositionValid = (brick: { blocks: { x: number; y: number; letter: string }[] }) => {
    for (const block of brick.blocks) {
      // Check if this exact block position is occupied
      const blockKey = `${block.x},${block.y}`;
      if (occupiedPositions.has(blockKey)) {
        return false;
      }
    }
    return true;
  };
  
  // Helper function to mark positions as occupied (including buffer zones)
  const markPositionsOccupied = (brick: { blocks: { x: number; y: number; letter: string }[] }) => {
    for (const block of brick.blocks) {
      // Mark only the block position and adjacent positions (not diagonals) as occupied
      const positions = [
        `${block.x},${block.y}`, // the block itself
        `${block.x + 1},${block.y}`, // right
        `${block.x - 1},${block.y}`, // left
        `${block.x},${block.y + 1}`, // up
        `${block.x},${block.y - 1}`  // down
      ];
      
      for (const key of positions) {
        occupiedPositions.add(key);
      }
    }
  };
  
  // Randomize the order of bricks to process
  const randomizedBricks = [...bricks].sort(() => Math.random() - 0.5);
  
  const shuffledBricks = [];
  
  for (const originalBrick of randomizedBricks) {
    // Find the bounds of this brick
    let brickMinX = Infinity, brickMaxX = -Infinity;
    let brickMinY = Infinity, brickMaxY = -Infinity;
    
    for (const block of originalBrick.blocks) {
      brickMinX = Math.min(brickMinX, block.x);
      brickMaxX = Math.max(brickMaxX, block.x);
      brickMinY = Math.min(brickMinY, block.y);
      brickMaxY = Math.max(brickMaxY, block.y);
    }
    
    // Try to place the brick starting from positions close to origin
    let placed = false;
    const maxAttempts = 1000;
    
    for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
      // Generate positions in expanding rings around origin
      const ring = Math.floor(attempt / 8);
      const ringPosition = attempt % 8;
      
      let targetX, targetY;
      
      if (ring === 0) {
        targetX = 0;
        targetY = 0;
      } else {
        // Place positions in a spiral pattern around origin
        const angle = (ringPosition / 8) * 2 * Math.PI;
        targetX = Math.round(Math.cos(angle) * ring);
        targetY = Math.round(Math.sin(angle) * ring);
      }
      
      // Calculate offset to move brick to target position
      const offsetX = targetX - brickMinX;
      const offsetY = targetY - brickMinY;
      
      // Create the brick at the new position
      const newBrick = {
        blocks: originalBrick.blocks.map(block => ({
          x: block.x + offsetX,
          y: block.y + offsetY,
          letter: block.letter
        }))
      };
      
      // Check if this position is valid
      if (isPositionValid(newBrick)) {
        shuffledBricks.push(newBrick);
        markPositionsOccupied(newBrick);
        placed = true;
      }
    }
    
    // If we couldn't place the brick, just place it somewhere that works
    if (!placed) {
      shuffledBricks.push(originalBrick);
      markPositionsOccupied(originalBrick);
    }
  }
  
  return {
    bricks: shuffledBricks
  };
}
