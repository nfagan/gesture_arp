import { eventBus } from '../eventbus.js';
import { webAudio } from '../audio/webaudio.js';
import instruments from '../audio/instruments.js';
import ease from './ease.js';

function Animator(world, canvas) {
	this.world = world;
	this.activeCanvas = canvas;
	this.instrumentCanvas = canvas;
	this.arrangementCanvases = world.arrangementCanvases;
	this.shouldAnimateInstrument = true;
	this.shouldAnimateArrangement = false;
	this.shouldDrawActiveNotes = true;
	this.isRecording = false;
	this.stroke = [];
	this.style = {
		editedVertices: {
			shape: 'circle',
			size: 30,
			blipIncrement: .8
		},
		drawCentroidArrangement: false,
		drawCentroidInstrument: false
	}
	this.ratio = window.devicePixelRatio || 1;
	this.pendingNotes = [];
	this.activeNotes = [];
	this.noteTimeTolerance = 1/50;
	this.mode = undefined;
	this.editedSequence = undefined;
	this.subscribe();
}

Animator.prototype.constructor = Animator;

Animator.prototype.subscribe = function() {
	let newNoteTimesTopic = eventBus.topicMap.newNoteTimesReady,
		canvasResizeTopic = eventBus.topicMap.canvasResize,
		newEditedSequenceTopic = eventBus.topicMap.newEditedSequence,
		modeChangeTopic = eventBus.topicMap.modeChange,
		deletedColumnTopic = eventBus.topicMap.deletedColumn;
	eventBus.subscribe(newNoteTimesTopic, this.handleNewNoteTimes.bind(this));
	eventBus.subscribe(canvasResizeTopic, this.handleCanvasResize.bind(this));
	eventBus.subscribe(newEditedSequenceTopic, this.handleNewEditedSequence.bind(this));
	eventBus.subscribe(modeChangeTopic, this.updateMode.bind(this));
	eventBus.subscribe(deletedColumnTopic, this.handleDeletedColumn.bind(this));
}

Animator.prototype.handleNewNoteTimes = function(data) {
	for (let i=0; i<data.noteTimes.length; i++) {
		this.pendingNotes.push({
			sequenceId: data.sequenceId,
			sequenceIndex: data.sequenceIndex,
			sequenceSetId: data.sequenceSetId,
			noteTime: data.noteTimes[i],
			point: data.points[i],
			coordinate: data.coordinates[i],
			noteDuration: data.noteDuration,
			loopIndex: data.loopIndex,
			filename: data.filename,
			constraint: data.constraint
		});
	}
}

Animator.prototype.updateMode = function(to) {
	this.mode = to;
	if (to === 'ARRANGEMENT') {
		this.shouldAnimateInstrument = false;
		this.shouldAnimateArrangement = true;
		this.clearArrangementCanvases();
		this.animateArrangement();
	} else {
		this.shouldAnimateInstrument = true;
		this.shouldAnimateArrangement = false;
		this.activeCanvas = this.instrumentCanvas;
		this.animateInstrument();
	}
}

Animator.prototype.handleCanvasResize = function() {
	if (this.mode === 'INSTRUMENT') {
		this.pendingNotes = [];
		this.activeNotes = [];
	}
}

Animator.prototype.handleDeletedColumn = function() {
	if (this.mode === 'INSTRUMENT') return;
	this.pendingNotes = [];
	this.activeNotes = [];
}

Animator.prototype.drawCircle = function(shape, dotSize, props) {
	this.drawArc(shape.center, shape.radius, true, props);
	this.drawDots([shape.center], dotSize, false, props);
}

Animator.prototype.drawRectTriLineRand = function(shape, dotSize, props) {
	let linePoints = shape.points.concat([shape.points[0]]),
		vertPoints = shape.points.concat([shape.center]);
	this.drawLine(linePoints, true, props);
	this.drawDots(vertPoints, dotSize, false, props);
}

Animator.prototype.drawShape = function(shape, dotSize, props) {
	if (shape.identity === 'circle') {
		this.drawCircle(shape, dotSize, props);
	} else {
		this.drawRectTriLineRand(shape, dotSize, props);
	}
}

Animator.prototype.animateArrangement = function() {

	let self = this,
		dotSize = this.style.editedVertices.size,
		blipIncrement = this.style.editedVertices.blipIncrement;

	const animator = function() {
		if (!self.shouldAnimateArrangement) return;

		self.updateActiveNotes();
		self.clearArrangementCanvases();

		for (let i=0; i<self.activeNotes.length; i++) {
			let note = self.activeNotes[i],
				sequenceIndex = note.sequenceIndex,
				canvas = self.getArrangementCanvas(note.sequenceSetId, sequenceIndex),
				ctx = canvas.getContext('2d'),
				now = Date.now(),
				start = note.start || now,
				sign = note.sign || 1,
				currentSize = note.currentSize || dotSize,
				duration = note.noteDuration/2 * 1000,
				p = (now-start) / duration,
				canvasSize = 100,
				canvasCenter = {
					x: canvasSize/2,
					y: canvasSize/2
				},
				val = ease.outQuad(p);
			if (p > .9) {
				note.sign = -1;
				start = now;
			}
			currentSize = currentSize + (val*blipIncrement*sign);
			note.start = start;
			note.currentSize = currentSize;

			self.activeCanvas = canvas;
			canvas.width = canvasSize * self.ratio;
			canvas.height = canvasSize * self.ratio;
			ctx.scale(self.ratio, self.ratio);

			let color = note.constraint.color,
			// let color = instruments[note.filename].rgbString,
				props = {
					fillStyle: color,
					strokeStyle: color
				};

			self.drawDots([canvasCenter], currentSize, false, props);

			if (self.style.drawCentroidArrangement) {
				self.drawDots([canvasCenter], currentSize/2, false, {
					fillStyle: instruments[note.filename].rgbString,
					strokeStyle: instruments[note.filename].rgbString
				});
			}
		}

		window.requestAnimationFrame(animator);
	}

	animator();

}

Animator.prototype.animateInstrument = function() {

	let self = this,
		dotSize = this.style.editedVertices.size,
		blipIncrement = this.style.editedVertices.blipIncrement;

	const animator = function() {
		if (!self.shouldAnimateInstrument) return;

		let world = self.world,
			canvas = self.activeCanvas,
			editedShape = world.getEditedShape(),
			needResize = canvas.width === 0 || (editedShape !== undefined &&
				editedShape.previousCanvasWidth === undefined),
			filename = self.editedSequence.filename,
			color = self.editedSequence.constraint.color,
			// color = instruments[filename].rgbString,
			props = {
				fillStyle: color,
				strokeStyle: color,
				lineWidth: 5
			}

		self.updateActiveNotes();

		if (needResize) {
			self.sizeCanvas();
		}

		if (editedShape !== undefined && !self.isRecording) {
			self.drawShape(editedShape, dotSize, props);
		} else if (self.isRecording) {
			self.drawLine(self.stroke, true, props);
		} else {
			let ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}

		for (let i=0; i<self.activeNotes.length; i++) {
			if (editedShape === undefined) continue;
			let note = self.activeNotes[i],
				coordinate = note.coordinate,
				now = Date.now(),
				start = note.start || now,
				sign = note.sign || 1,
				currentSize = note.currentSize || dotSize,
				duration = note.noteDuration/2 * 1000,
				p = (now-start) / duration,
				val = ease.outQuad(p),
				blipSizeUse
			if (p > .9) {
				note.sign = -1;
				start = now;
			}
			currentSize = currentSize + (val*blipIncrement*sign);
			note.start = start;
			note.currentSize = currentSize;
			if (note.sequenceId !== world.editedSequenceId) {
				continue;
			}
			self.drawDots([note.point], currentSize, false, props);

			/*
				MARK: Begin animating centroid
			*/

			if (self.style.drawCentroidInstrument) {
				let centerPoint,
					centerPointSize;
				if (editedShape.identity === 'random') {
					centerPoint = note.point;
				} else {
					centerPoint = editedShape.center;
				}
				if (editedShape.identity === 'circle' || 
					editedShape.identity === 'random') {
					centerPointSize = currentSize/4;
				} else {
					centerPointSize = dotSize/4;
				}
				self.drawDots([centerPoint], centerPointSize, false, {
					fillStyle: instruments[note.filename].rgbString,
					strokeStyle: instruments[note.filename].rgbString
				});
			}
		}

		window.requestAnimationFrame(animator);
	}

	animator();
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

	//	get rid of pending notes if the shape is marked
	// 	as undefined

	const expiredRemover = function(arr, id) {
		let expired = [];
		for (let i=0; i<arr.length; i++) {
			if (arr[i].sequenceId === id) {
				expired.push(i-expired.length);
			}
		}
		for (let i=0; i<expired.length; i++) {
			arr.splice(expired[i], 1);
		}
	}

	let editedShape = this.world.getEditedShape();
	if (editedShape === undefined) {
		expiredRemover(this.pendingNotes, this.world.editedSequenceId);
		expiredRemover(this.activeNotes, this.world.editedSequenceId);
	}
}

Animator.prototype.drawLine = function(points, doClear, props) {
	let canvas = this.activeCanvas,
		ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i=0; i<points.length-1; i++) {
		ctx.beginPath();
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[i+1].x, points[i+1].y);
		ctx.lineWidth = props.lineWidth;
		ctx.strokeStyle = props.strokeStyle;
		ctx.stroke();
	}
}

Animator.prototype.drawArc = function(center, radius, doClear, props) {
	let canvas = this.activeCanvas,
		ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.arc(center.x, center.y, radius, 0, Math.PI*2);
	ctx.strokeStyle = props.strokeStyle;
	ctx.lineWidth = props.lineWidth;
	ctx.stroke();
}

Animator.prototype.drawDots = function(points, width, doClear, props) {
	let canvas = this.activeCanvas,
		ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (let i=0; i<points.length; i++) {
		ctx.fillStyle = props.fillStyle;
		ctx.globalAlpha = props.alpha || 1;
		let x = points[i].x,
			y = points[i].y,
			r = width/2;
		r = Math.abs(r);
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI*2);
		ctx.closePath();
		ctx.fill();
	}
}

Animator.prototype.sizeCanvas = function() {
	let canvas = this.activeCanvas,
		ctx = canvas.getContext('2d');
	sizeCanvas();
	window.addEventListener('resize', sizeCanvas);
	function sizeCanvas() {
		var rect = canvas.getBoundingClientRect(),
			w = rect.width,
			h = rect.height,
			ratio = window.devicePixelRatio || 1;
		canvas.width = w * ratio;
		canvas.height = h * ratio;
		ctx.scale(ratio, ratio);
		eventBus.publish('canvasResize', {
			canvasWidth: canvas.width/ratio,
			canvasHeight: canvas.height/ratio
		});
	}
}

Animator.prototype.handleNewEditedSequence = function(data) {
	this.pendingNotes = [];
	this.activeNotes = [];
	this.editedSequence = data.sequence;
}

Animator.prototype.getArrangementCanvas = function(setId, index) {
	for (let i=0; i<this.arrangementCanvases.length; i++) {
		let canvasSet = this.arrangementCanvases[i],
			canvas = canvasSet.canvas,
			sequenceSetId = canvasSet.sequenceSetId,
			sequenceIndex = canvasSet.index;
		if (sequenceSetId === setId && sequenceIndex === index) {
			return canvas;
		}
	}
}

Animator.prototype.clearArrangementCanvases = function() {
	for (let i=0; i<this.arrangementCanvases.length; i++) {
		let canvas = this.arrangementCanvases[i].canvas,
			ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
}

Animator.prototype.clearActiveCanvas = function() {
	let canvas = this.activeCanvas,
		ctx = canvas.getContext('2d');
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export { Animator };