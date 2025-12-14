<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription
	} from '$lib/components/ui/field/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { generateCrossword, type GeneratorResult } from '$lib/generator';

	let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> = $props();

	const id = $props.id();

	let gameState = $state<GeneratorResult | null>(null);
	let loading = $state(false);
	let words = $state('');
	let showRegenerate = $state(false);

	$effect(() => {
		if (words) {
			showRegenerate = false;
		}
	});

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();

		loading = true;
		await new Promise((resolve) => setTimeout(resolve, 300));

		const crossword = generateCrossword(words.split('\n'));

		showRegenerate = true;
		loading = false;
		
		gameState = crossword;
	}
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
	<Card.Root class="overflow-hidden p-0">
		<Card.Content class="grid p-0 md:grid-cols-2">
			<form class="p-6 md:p-8" onsubmit={onSubmit}>
				<FieldGroup>
					<div class="flex flex-col items-center gap-2 text-center">
						<h1 class="text-2xl font-bold">Bonza Generator</h1>
						<p class="text-balance text-muted-foreground">Create new levels for Almost Bonza</p>
					</div>
					<Field>
						<FieldLabel for="email-{id}">Word list</FieldLabel>
						<Textarea
							bind:value={words}
							name="words"
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
					</Field>
					<FieldDescription class="text-center">
						Want to play? <a href={resolve('/')}>Go to Almost Bonza</a>
					</FieldDescription>
				</FieldGroup>
			</form>
			<div class="relative bg-neutral-900 flex items-center justify-end">
				<iframe title="Game preview" src={`/play?state=${gameState ? btoa(JSON.stringify(gameState)) : ''}`} width="500" height="500"></iframe>
			</div>
		</Card.Content>
	</Card.Root>
	<FieldDescription class="px-6 text-center">
		Made with ❤️ by <a href="https://matejbaco.eu/">Meldiron</a>.
	</FieldDescription>
</div>
