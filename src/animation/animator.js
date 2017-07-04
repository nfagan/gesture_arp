import { eventBus } from '../eventbus.js';
import { webAudio } from '../audio/webaudio.js';

function Animator(world, canvas) {
	this.world = world;
	this.canvas = canvas;
	this.shouldAnimate = true;
	this.isRecording = false;
	this.stroke = [];
	this.style = {
		editedVertices: {
			shape: 'circle',
			size: 30
		}
	}
	this.pendingNotes = [];
	this.activeNotes = [];
	this.noteTimeTolerance = 1/60
	this.subscribe();
}

Animator.prototype.subscribe = function() {
	let newNoteTimesTopic = eventBus.topicMap.newNoteTimesReady;
	eventBus.subscribe(newNoteTimesTopic, this.handleNewNoteTimes.bind(this));
}

Animator.prototype.handleNewNoteTimes = function(data) {
	for (let i=0; i<data.noteTimes.length; i++) {
		this.pendingNotes.push({
			noteTime: data.noteTimes[i],
			point: data.points[i],
			noteDuration: data.noteDuration,
			loopIndex: data.loopIndex
		});
	}
}

Animator.prototype.constructor = Animator;

Animator.prototype.animate = function() {

	if (!this.shouldAnimate) return;

	let world = this.world,
		canvas = this.canvas,
		editedShape = world.getEditedShape();

	this.updateActiveNotes();

	if (editedShape !== undefined && !this.isRecording) {
		editedShape.drawLine(canvas);
		editedShape.drawDots(canvas, 30, false);
	} else if (this.isRecording) {
		this.drawLine(this.stroke);
	} else {
		let ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	for (let i=0; i<this.activeNotes.length; i++) {
		if (editedShape !== undefined) {
			this.drawDots([this.activeNotes[i].point], 40, false);
		}
	}

	window.requestAnimationFrame(this.animate.bind(this));
}

Animator.prototype.updateActiveNotes = function() {
	let pendingNotes = [],
		expired = [];
	for (let i=0; i<this.pendingNotes.length; i++) {
		let note = this.pendingNotes[i],
			currentTime = webAudio.context.currentTime,
			noteTime = note.noteTime;
		if (Math.abs(noteTime-currentTime) < this.noteTimeTolerance) {
			this.activeNotes.push(note);
		} else {
			pendingNotes.push(note);
		}
	}
	for (let i=0; i<this.activeNotes.length; i++) {
		let note = this.activeNotes[i],
			currentTime = webAudio.context.currentTime,
			noteTime = note.noteTime,
			noteDuration = note.noteDuration;
		if ((currentTime-(noteTime+noteDuration)) > this.noteTimeTolerance) {
			expired.push(i-expired.length);
		}
	}
	for (let i=0; i<expired.length; i++) {
		this.activeNotes.splice(expired[i], 1);
	}
	this.pendingNotes = pendingNotes;
	// this.activeNotes = activeNotes;
}

Animator.prototype.drawLine = function(points, doClear) {
	let canvas = this.canvas,
		ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i=0; i<points.length-1; i++) {
		ctx.beginPath();
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[i+1].x, points[i+1].y);
		ctx.stroke();
	}
}

Animator.prototype.drawDots = function(points, width, doClear) {
	let canvas = this.canvas,
		ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (let i=0; i<points.length; i++) {
		ctx.fillStyle = 'gray';
		let x = points[i].x - width/2;
		let y = points[i].y - width/2;
		ctx.fillRect(x, y, width, width);
	}
}

export { Animator };