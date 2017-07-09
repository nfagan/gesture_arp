import { eventBus } from '../eventbus.js';
import { webAudio } from '../audio/webaudio.js';
import { world } from '../world.js';
import { Animator } from '../animation/animator.js';
import { Interaction } from '../interaction.js';

let awaitCanvas = new Promise(function(resolve, reject) {
	eventBus.subscribe('newSurface', function(data) {
		resolve(data);
	});
});

awaitCanvas.then(postCanvasRetrieval);

function postCanvasRetrieval(data) {
	var	canvas = data.element,
		animator = new Animator(world, canvas),
		interaction = new Interaction(world, animator);

	interaction.handleTouch();
	animator.sizeCanvas();
}