import { eventBus } from '../eventbus.js';
import { webAudio } from '../audio/webaudio.js';
import { world } from '../world.js';
import { Animator } from '../animation/animator.js';
import { Interaction } from '../interaction.js';

/*
	instrument
*/

let animator, interaction, canvas, pattern;

let awaitCanvas = new Promise(function(resolve, reject) {
	eventBus.subscribe('newSurface', function(data) {
		resolve(data);
	});
});

let instrumentRetrieved = awaitCanvas.then(postCanvasRetrieval);

function postCanvasRetrieval(data) {
	return new Promise(function(resolve, reject) {
		canvas = data.element,
		animator = new Animator(world, canvas),
		interaction = new Interaction(world, animator);

		interaction.handleTouch();
		animator.sizeCanvas();

		resolve(interaction);
	});
}

/*
	pattern
*/

let awaitPattern = new Promise(function(resolve, reject) {
	eventBus.subscribe('patternReady', function(data) {
		pattern = data.pattern;
		resolve(pattern);
	});
});

/*
	beatpad container
*/

let awaitBeatpadContainer = new Promise(function(resolve, reject) {
	eventBus.subscribe('beatpadContainerReady', function(data) {
		resolve(data);
	});
});

instrumentRetrieved.then(function(interaction) {
	awaitBeatpadContainer.then(postBeatpadContainerRetrieval);
	function postBeatpadContainerRetrieval(data) {
		interaction.beatpadContainer = data.element;
		awaitPattern.then(function(pattern) {
			interaction.pattern = pattern;
			interaction.handleBeatpadTouch();
			animator.pattern = pattern;
		});
	}
});