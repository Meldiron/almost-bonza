import { blocksToBricks, generateCrossword } from '$lib/generator';

function testBricks() {
	const words = ['matej', 'anet'];

	const blockCrossword = generateCrossword(words);
	const blocks = blockCrossword.blocks;
	
	console.log('Generated blocks:');
	console.log(JSON.stringify(blocks, null, 2));
	const brickCrossword = blocksToBricks(blocks);
	const bricks = brickCrossword.bricks;
	
	console.log('Generated bricks:');
	console.log(JSON.stringify(bricks, null, 2));
	
  const blocksCount = blocks.length;
  let bricksInBricksCount = 0;
  for(const brick of bricks) {
    bricksInBricksCount += brick.blocks.length;
  }
  if(bricksInBricksCount !== blocksCount) {
    throw new Error('Some blocks are missing in bricks. This likely hints to error in blocksToBricks() function.');
  }
	
	if (bricks.length <= 1) {
	 //  throw new Error('Only one brick generated.');
	}

	for (const brick of bricks) {
		if (brick.blocks.length <= 1) {
			// throw new Error('Brick with only one block generated.');
		}
		
    for (let i = 0; i < brick.blocks.length - 1; i++) {
      const nextBlock = brick.blocks[i + 1];
      const currentBlock = brick.blocks[i];
      
      if(!isNeighbour(currentBlock, nextBlock)) {
        console.log(brick);
        throw new Error('Brick with non-neighboring blocks generated.');
      }
    }
	}
	
  console.log(JSON.stringify(bricks, null, 2));
}

function isNeighbour(block1: { x: number, y: number, letter: string}, block2: { x: number, y: number, letter: string}) {
  const {x: x1, y: y1} = block1;
  const {x: x2, y: y2} = block2;

  return Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1;
}

testBricks();
