import { eventBus } from '../eventbus.js';
import { webAudio } from '../audio/webaudio.js';
import instruments from '../audio/instruments.js';
import ease from './ease.js';

function Animator(world, canvas) {
	this.world = world;
	this.pattern = undefined;
	this.activeCanvas = canvas;
	this.instrumentCanvas = canvas;
	this.arrangementCanvases = world.arrangementCanvases;
	this.beatpadArrangementCanvases = [];
	this.beatpadCanvases = [];
	this.shouldAnimateInstrument = true;
	this.shouldAnimateArrangement = false;
	this.shouldAnimateBeatpad = false;
	this.shouldDrawActiveNotes = true;
	this.isRecording = false;
	this.stroke = [];
	this.style = {
		editedVertices: {
			shape: 'circle',
			size: 30,
			blipIncrement: .8
		},
		beatpadBlips: {
			size: 20
		},
		drawCentroidArrangement: false,
		drawCentroidInstrument: false
	}
	this.ratio = window.devicePixelRatio || 1;
	this.pendingNotes = [];
	this.activeNotes = [];
	this.noteTimeTolerance = 1/50;
	this.maxDuration = webAudio.interval/4;
	this.mode = undefined;
	this.editedSequence = undefined;
	this.subscribe();
	this.markReady();
}

Animator.prototype.constructor = Animator;

Animator.prototype.markReady = function() {
	let self = this;
	eventBus.publish(eventBus.topicMap.animatorReady, {animator: self});
}

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

	if (this.mode === 'BEATPAD') {
		if (data.kind !== 'pattern') return;
		this.pendingNotes = data.notes;
		return;
	}

	if (data.kind === 'pattern') {
		this.pendingNotes = this.pendingNotes.concat(data.notes);
		return;
	}

	for (let i=0; i<data.noteTimes.length; i++) {
		this.pendingNotes.push({
			kind: 'sequence',
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
	let prevMode = this.mode;
	this.mode = to;
	if (to === 'ARRANGEMENT') {
		if (prevMode === 'BEATPAD') {
			this.resetNotes(this.pendingNotes);
			this.resetNotes(this.activeNotes);
		}
		this.shouldAnimateInstrument = false;
		this.shouldAnimateArrangement = true;
		this.shouldAnimateBeatpad = false;
		this.clearArrangementCanvases();
		this.animateArrangement();
	} else if (to === 'INSTRUMENT') {
		this.shouldAnimateInstrument = true;
		this.shouldAnimateArrangement = false;
		this.shouldAnimateBeatpad = false;
		this.activeCanvas = this.instrumentCanvas;
		this.animateInstrument();
	} else if (to === 'BEATPAD') {
		this.shouldAnimateInstrument = false;
		this.shouldAnimateArrangement = false;
		this.shouldAnimateBeatpad = true;
		this.beatpadCanvases[0].element.width = 0;
		this.clearBeatpadCanvases();
		this.animateBeatpad();
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

	if (isNaN(shape.center.y) && shape.identity === 'line') {
		let y1 = shape.points[0].y,
			y2 = shape.points[1].y;
		shape.center.y = ((y2 - y1)/2) + y1;
	}

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

/*
	BEATPAD
*/

Animator.prototype.animateBeatpad = function() {

	let self = this,
		dotSize = this.style.beatpadBlips.size,
		blipIncrement = this.style.editedVertices.blipIncrement;

	const animator = function() {
		if (!self.shouldAnimateBeatpad) return;

		self.updateActiveNotes();
		self.clearBeatpadCanvases();

		if (self.beatpadCanvases[0].element.width === 0) {
			self.sizeBeatpadCanvases();
		}
		
		for (let i=0; i<self.activeNotes.length; i++) {
			let note = self.activeNotes[i];

			if (note.kind !== 'pattern') continue;

			// note.noteDuration = Math.min(note.noteDuration, self.maxDuration);

			let filename = note.fname,
				canvas = self.getBeatpadCanvas(filename),
				ctx = canvas.getContext('2d'),
				now = Date.now(),
				start = note.start || now,
				sign = note.sign || 1,
				currentSize = note.currentSize || dotSize,
				duration = Math.min(note.noteDuration, self.maxDuration)/2 * 1000,
				p = (now-start) / duration,
				canvasCenter = {
					x: (canvas.width/2) / self.ratio,
					y: (canvas.height/2) / self.ratio
				},
				val = ease.outQuad(p);
			if (p > .9) {
				note.sign = -1;
				start = now;
			}
			currentSize = currentSize + (val*blipIncrement*sign);
			note.start = start;
			note.currentSize = currentSize;

			if (currentSize < 0) continue;

			self.activeCanvas = canvas;

			// let color = instruments[filename].rgbString,
			let color = 'white',
				props = {
					fillStyle: color,
					strokeStyle: color
				};

			self.drawDots([canvasCenter], currentSize, false, props);
		}

		window.requestAnimationFrame(animator);
	}

	animator();	

}

/*
		ARRANGEMENT
*/

Animator.prototype.animateArrangement = function() {

	let self = this,
		dotSize = this.style.editedVertices.size,
		blipIncrement = this.style.editedVertices.blipIncrement;

	const animator = function() {
		if (!self.shouldAnimateArrangement) return;

		self.updateActiveNotes();
		self.clearArrangementCanvases();
		self.clearCanvases(self.beatpadArrangementCanvases);
		self.sizeBeatpadArrangementCanvases();

		for (let i=0; i<self.activeNotes.length; i++) {
			let note = self.activeNotes[i];

			/*
				handle beatpad 
			*/

			if (note.kind === 'pattern') {
				let filename = note.fname,
					canvas = self.getBeatpadArrangementCanvas(filename),
					ctx = canvas.getContext('2d'),
					now = Date.now(),
					start = note.start || now,
					sign = note.sign || 1,
					currentSize = note.currentSize || 3,
					duration = Math.min(note.noteDuration, self.maxDuration)/2 * 1000,
					p = (now-start) / duration,
					val = ease.outQuad(p);

				if (p > .9) {
					note.sign = -1;
					start = now;
				}

				currentSize = currentSize + (val*.1*sign);

				note.start = start;
				note.currentSize = currentSize;
				self.activeCanvas = canvas;

				let rect = canvas.parentElement.getBoundingClientRect(),
					width = rect.width,
					height = rect.height,
					canvasCenter = {
						x: (width/2),
						y: (height/2)
					}
				canvas.width = width * self.ratio;
				canvas.height = height * self.ratio;
				canvas.style.width = width + 'px';
				canvas.style.height = height + 'px';
				ctx.scale(self.ratio, self.ratio);
				ctx.clearRect(0, 0, canvas.width, canvas.height);

				if (currentSize < 0) continue;

				// let color = instruments[filename].rgbString;
				let color = 'white';
				let props = {
						fillStyle: color,
						strokeStyle: color
					};

				self.drawDots([canvasCenter], currentSize, false, props);
				continue;
			}

			/*
				handle non-beatpad
			*/

			let sequenceIndex = note.sequenceIndex,
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

			let note = self.activeNotes[i];

			if (note.kind === 'pattern') continue;

			let coordinate = note.coordinate,
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
	window.addEventListener('resize', this.sizeBeatpadCanvases.bind(this));
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

Animator.prototype.getBeatpadArrangementCanvas = function(filename) {
	return this.beatpadArrangementCanvases.filter(function(canvas) {
		return canvas.dataset.filename === filename;
	})[0];
}

Animator.prototype.getBeatpadCanvas = function(filename) {
	let canvasSet = this.beatpadCanvases.filter(function(canvas) {
		return canvas.filename === filename;
	});

	return canvasSet[0].element;
}

Animator.prototype.getBeatpadCanvases = function() {
	let canvases = [];
	for (let i=0; i<this.beatpadCanvases.length; i++) {
		canvases.push(this.beatpadCanvases[i].element);
	}
	return canvases;
}

Animator.prototype.clearBeatpadCanvases = function() {
	let canvases = this.getBeatpadCanvases();
	for (let i=0; i<canvases.length; i++) {
		let canvas = canvases[i],
			ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
}

Animator.prototype.sizeBeatpadCanvases = function() {
	let canvases = this.getBeatpadCanvases();
	for (let i=0; i<canvases.length; i++) {
		let canvas = canvases[i],
			ctx = canvas.getContext('2d'),
			parent = canvas.parentElement,
			rect = parent.getBoundingClientRect(),
			ratio = this.ratio;
		canvas.width = rect.width * ratio;
		canvas.height = rect.height * ratio;
		canvas.style.width = rect.width + 'px';
		canvas.style.height = rect.height + 'px';
		ctx.scale(this.ratio, this.ratio);
	}
}

Animator.prototype.sizeBeatpadArrangementCanvases = function() {
	for (let i=0; i<this.beatpadArrangementCanvases.length; i++) {
		let canvas = this.beatpadArrangementCanvases[i],
			ctx = canvas.getContext('2d'),
			rect = canvas.parentElement.getBoundingClientRect(),
			width = rect.width,
			height = rect.height,
			canvasCenter = {
				x: (width/2),
				y: (height/2)
			};
		canvas.width = width * self.ratio;
		canvas.height = height * self.ratio;
		canvas.style.width = width + 'px';
		canvas.style.height = height + 'px';
		ctx.scale(self.ratio, self.ratio);
	}
}

Animator.prototype.clearCanvases = function(canvases) {
	for (let i=0; i<canvases.length; i++) {
		let canvas = canvases[i],
			ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
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

Animator.prototype.resetNotes = function(notes) {
	for (let i=0; i<notes.length; i++) {
		notes[i].start = undefined;
		notes[i].sign = undefined;
		notes[i].currentSize = undefined;
	}
}

export { Animator };