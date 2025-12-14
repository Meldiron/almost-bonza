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

export type GeneratorResult = {
	blocks: {
		x: number;
		y: number;
		letter: string;
	}[];
};

export function generateCrossword(words: string[]): GeneratorResult {
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
