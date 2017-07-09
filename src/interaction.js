import { Util } from './util.js';
import { Detector } from './geometry/detector.js';
import { Shape, Line, Circle } from './geometry/shape.js';
import { Vertices, Point } from './geometry/vertices.js';
import { eventBus } from './eventbus.js';
import { webAudio } from './audio/webaudio.js';
import interact from 'interact.js';

function Interaction(world, animator) {
	this.world = world;
	this.animator = animator;
}

Interaction.prototype.constructor = Interaction;

Interaction.prototype.handleTouch = function() {

	var self = this,	
		position,
		stroke = [],
		shouldContinue = true,
		shape,
		vertex,
		animator = this.animator,
		element = animator.instrumentCanvas,
		sequenceIdCurrent,
		sequenceIdOnDown,
		bounds = animator.style.editedVertices.size;

	animator.isRecording = false;

	interact(element)
		.on('down', down)
		.on('up', up)
		.on('move', move);

	function move(e) {
		e.preventDefault();
		position = correctPosition({x: e.clientX, y: e.clientY});
	}
	function down(e) {
		e.preventDefault();
		shouldContinue = true;
		webAudio.playDummySound();
		position = correctPosition({x: e.clientX, y: e.clientY});
		shape = self.world.getEditedShape();
		sequenceIdOnDown = self.world.editedSequenceId;
		sequenceIdCurrent = sequenceIdOnDown;
		//	we're making a new shape
		if (shape === undefined) {
			animator.isRecording = true;
			requestAnimationFrame(record);
			return;
		}
		var nearbyVertices = shape.getVerticesNear(position, bounds),
			isNearCenter = shape.isNearCenter(position, bounds);
		if (nearbyVertices.length === 0 && !isNearCenter) {
			self.publishNewShape(undefined);
			animator.isRecording = true;
			requestAnimationFrame(record);
			return;
		}
		animator.isRecording = false;
		if (nearbyVertices.length > 0) {
			vertex = nearbyVertices[0];
			requestAnimationFrame(modifyVertex);
		} else {
			requestAnimationFrame(modifyCenter);
		}
	}
	function updateCurrentSequenceId() {
		sequenceIdCurrent = self.world.editedSequenceId;
	}
	function correctPosition(pos) {
		let rect = self.animator.instrumentCanvas.getBoundingClientRect(),
			width = self.animator.instrumentCanvas.width,
			height = self.animator.instrumentCanvas.height,
			ratio = self.animator.ratio,
			x = Math.round((pos.x-rect.left)/(rect.right-rect.left)*width/ratio),
			y = Math.round((pos.y-rect.top)/(rect.bottom-rect.top)*height/ratio);
		return {x, y};
	}
	function convertToFractionalCoordinates(pos) {
		let rect = self.animator.instrumentCanvas.getBoundingClientRect(),
			percX = (pos.x - rect.left),
			percY = (pos.y - rect.top);
		return {x: percX, y: percY};
	}
	function up() {
		shouldContinue = false;
		updateCurrentSequenceId();
		if (!animator.isRecording) return;
		if (sequenceIdCurrent !== sequenceIdOnDown) return;
		animator.isRecording = false;
		self.handleNewStroke(stroke);
		stroke = [];
		animator.stroke = [];
	}
	function record() {
		updateCurrentSequenceId();
		if (!shouldContinue) return;
		if (sequenceIdCurrent !== sequenceIdOnDown) return;
		stroke.push(position);
		animator.stroke = stroke;
		requestAnimationFrame(record);
	}
	function modifyVertex() {
		updateCurrentSequenceId();
		if (!shouldContinue) return;
		if (sequenceIdCurrent !== sequenceIdOnDown) return;
		vertex.x = Math.round(position.x);
		vertex.y = Math.round(position.y);
		shape.update();			
		requestAnimationFrame(modifyVertex);
	}
	function modifyCenter() {
		updateCurrentSequenceId();
		if (!shouldContinue) return;
		if (sequenceIdCurrent !== sequenceIdOnDown) return;
		var pt = new Point(position.x, position.y, 0);
		shape.centerOn(pt);
		shape.update();
		requestAnimationFrame(modifyCenter);
	}
}

Interaction.prototype.publishNewShape = function(shape) {
	let sequenceId = this.world.editedSequenceId,
		sequenceSetId = this.world.activeSequenceSetId,
		newShapeTopic = eventBus.topicMap.newShapeReady;
	eventBus.publish(newShapeTopic, {shape, sequenceId, sequenceSetId});
}

Interaction.prototype.handleNewStroke = function(stroke) {
	stroke = Util.unique(Util.resample(stroke, 256));
	if (stroke[0] === undefined) {
		console.warn('No shape will be constructed.');
		return;
	}
	let verts = new Vertices(stroke);
	verts.updateAll();
	let detector = new Detector(verts);
	detector.updateEstimatedVertices();
	detector.identify();
	let shape = detector.getDetectedShape();
	shape.canvas = this.animator.instrumentCanvas;
	this.publishNewShape(shape);
}

export { Interaction };