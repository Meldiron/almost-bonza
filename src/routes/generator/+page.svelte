<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription
	} from '$lib/components/ui/field/index.js';
	import { resolve } from '$app/paths';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Textarea } from '$lib/components/ui/textarea';
	import { blocksToBricks, generateCrossword, shuffleBricks, type GameState } from '$lib/generator';
	import Input from '$lib/components/ui/input/input.svelte';
	import FieldSeparator from '$lib/components/ui/field/field-separator.svelte';

	const templates: {
		[key: string]: { hint: string; words: string[] };
	} = {
		chess: {
			hint: 'Chess pieces',
			words: ['rook', 'knight', 'bishop', 'king']
		},
		languages: {
			hint: 'Coding languages',
			words: ['javascript', 'python', 'ruby', 'php', 'go', 'rust', 'typescript']
		},
		colors: {
			hint: 'Color names',
			words: ['blue', 'green', 'yellow', 'orange', 'black', 'white', 'pink', 'brown']
		}
	};

	const id = $props.id();

	let gameState = $state<GameState | null>(null);
	let loading = $state(false);
	let words = $state('');
	let hint = $state('');
	let showRegenerate = $state(false);

	$effect(() => {
		if (words) {
			showRegenerate = false;
		}
	});

	function onShuffle() {
		if (!gameState) {
			return;
		}

		const bricks = gameState.bricks;
		const result = shuffleBricks(bricks);

		gameState.bricks = result.bricks;
		gameState = gameState;
	}

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();

		loading = true;
		await new Promise((resolve) => setTimeout(resolve, 300));

		const blockCrossword = generateCrossword(words.split('\n'));
		const brickCrossword = blocksToBricks(blockCrossword.blocks);

		showRegenerate = true;
		loading = false;

		gameState = {
			hint,
			bricks: brickCrossword.bricks
		};
	}

	function generateTemplate(templateKey: string) {
		const template = templates[templateKey];
		if (!template) {
			return;
		}

		words = template.words.join('\n');
		hint = template.hint;

		onSubmit(new SubmitEvent('submit'));
	}
</script>

<div
	class="flex min-h-svh flex-col items-center justify-center bg-linear-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6 md:p-10"
>
	<div class="w-full max-w-sm md:max-w-5xl">
		<div class="flex flex-col gap-6">
			<Card.Root class="overflow-hidden p-0">
				<Card.Content class="grid p-0 md:grid-cols-2">
					<form class="p-6 md:p-8" onsubmit={onSubmit}>
						<FieldGroup>
							<div class="flex flex-col items-center gap-2 text-center">
								<h1 class="text-2xl font-bold">Bonza Generator</h1>
								<p class="text-balance text-muted-foreground">Create new levels for Almost Bonza</p>
							</div>

							<Field>
								<FieldLabel for="email-{id}">Words hint</FieldLabel>
								<Input bind:value={hint} placeholder="Food and vegetables" required />
							</Field>

							<Field>
								<FieldLabel for="email-{id}">Word list</FieldLabel>
								<Textarea
									bind:value={words}
									class="h-40"
									placeholder="Enter words on separate lines"
									required
								/>
							</Field>
							<Field>
								{#if loading}
									<Button class="cursor-pointer" type="button" disabled>
										<Spinner />
									</Button>
								{:else}
									<Button class="cursor-pointer" type="submit">
										{showRegenerate ? 'Re-generate' : 'Generate'}
									</Button>
								{/if}

								{#if showRegenerate}
									<Button
										class="cursor-pointer"
										type="button"
										onclick={() => onShuffle()}
										variant="outline"
									>
										Shuffle pieces
									</Button>
								{/if}
							</Field>
							<FieldSeparator class="*:data-[slot=field-separator-content]:bg-card">
								Or try our examples
							</FieldSeparator>
							<Field class="grid grid-cols-3 gap-4">
								{#each Object.keys(templates) as templateKey (templateKey)}
									<Button
										onclick={() => generateTemplate(templateKey)}
										variant="outline"
										class="cursor-pointer text-xs font-light"
										type="button"
									>
										{templates[templateKey].hint}
									</Button>
								{/each}
							</Field>

							<FieldDescription class="text-center">
								Want to play? <a href={resolve('/')}>Go to Almost Bonza</a>
							</FieldDescription>
						</FieldGroup>
					</form>
					<div class="relative flex flex-col items-center justify-end gap-2 bg-neutral-900">
						<p class="font-semibold text-balance text-foreground">Game preview</p>
						<div class="mb-1.5 overflow-hidden rounded-xl border border-neutral-800">
							<iframe
								title="Game preview"
								src={`/play?state=${gameState ? btoa(JSON.stringify(gameState)) : ''}`}
								width="500"
								height="500"
							></iframe>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
			<FieldDescription class="px-6 text-center">
				Made with ❤️ by <a href="https://matejbaco.eu/">Meldiron</a>.
			</FieldDescription>
		</div>
	</div>
</div>
