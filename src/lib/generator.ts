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

export function generateCrossword(words: string[]): GeneratorBlocksResult {
	const layout: CLSResult = clg.generateLayout(
		words.map((word) => {
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

	return {
		blocks: [...blockMap.values()]
	};
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

	// Helper function to find edge blocks (furthest from center)
	const findEdgeBlocks = () => {
		if (blocks.length === 0) return [];

		const minX = Math.min(...blocks.map((b) => b.x));
		const maxX = Math.max(...blocks.map((b) => b.x));
		const minY = Math.min(...blocks.map((b) => b.y));
		const maxY = Math.max(...blocks.map((b) => b.y));

		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;

		// Calculate distance from center for each block
		const blockDistances = blocks.map((block) => ({
			block,
			distance: Math.sqrt(Math.pow(block.x - centerX, 2) + Math.pow(block.y - centerY, 2))
		}));

		// Sort by distance descending (furthest first)
		blockDistances.sort((a, b) => b.distance - a.distance);

		return blockDistances.map((bd) => bd.block);
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
	const edgeBlocks = findEdgeBlocks();

	// Process each block, starting with edge blocks
	for (const block of edgeBlocks) {
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
			console.log('Fixing ', currentBrick.blocks[0].letter);
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
