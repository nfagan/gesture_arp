import { Util } from '../util.js';
import { Vertices, Point } from './vertices.js'

/*
	SHAPE -- Rectangle, Triangle, Random ...
*/

function Shape(vertices, identity) {
	this.vertices = vertices;
	this.points = vertices.points;
	this.identity = identity;
	this.canvas = undefined;
	this.previousCanvasWidth = undefined;
	this.previousCanvasHeight = undefined;
	this.getCenter();
}

Shape.prototype.constructor = Shape;

Shape.prototype.getRescaledVertices = function(oldWidth, oldHeight, newWidth, newHeight) {
	if (oldWidth === newWidth && oldHeight === newHeight) return;
	let verts = this.vertices,
		scaleVecA = new Point(oldWidth, oldHeight, 0),
		scaleVecB = new Point(newWidth/oldWidth, newHeight/oldHeight, 0),
		center,
		points_;
	if (this.points.length > 1) {
		center = verts.copyPoint(this.center)
	} else {
		center = this.points[0];
	}

	center.divide(scaleVecA);
	center.times(new Point(newWidth, newHeight, 0));

	if (this.points.length > 1 ) {
		points_ = verts.copyPoints(this.points);
		verts.arrayMinus(points_, this.center);
		verts.arrayTimes(points_, scaleVecB);
		verts.arrayAdd(points_, center);
	} else {
		points_ = [center];
	}

	return new Vertices(points_);
}

Shape.prototype.rescale = function(pwidth, pheight, nwidth, nheight) {
	let newVertices = this.getRescaledVertices(pwidth, pheight, nwidth, nheight);
	this.vertices = newVertices;
	this.points = newVertices.points;
	this.update();
}

Shape.prototype.update = function() {
	this.vertices.updateAllExceptHull();
	this.getCenter();
}

Shape.prototype.getCenter = function() {
	this.center = this.vertices.centroid;
}

Shape.prototype.centerOn = function(pt) {
	pt.minus(this.center);
	this.vertices.arrayAdd(this.points, pt);
	this.update();
}

Shape.prototype.isNearVertices = function(coord, bounds) {
	return this.vertices.isNearVertices(this.points, coord, bounds);
}

Shape.prototype.getVerticesNear = function(coord, bounds) {
	var index = this.isNearVertices(coord, bounds);
	return Util.logicalKeep(this.points, index);
}

Shape.prototype.isNearCenter = function(coord, bounds) {
	return this.vertices.isNearVertices([this.center], coord, bounds)[0];
}

/*
	DISPLAY
*/

Shape.prototype.drawLine = function(canvas, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
		points = this.vertices.copyPoints(this.points);
	points.push(points[0]);
	if (doClear)  ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i=0; i<points.length-1; i++) {
		ctx.beginPath();
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[i+1].x, points[i+1].y);
		// ctx.moveTo(points[i].x*canvas.width/2, points[i].y*canvas.height/2);
		// ctx.lineTo(points[i+1].x*canvas.width/2, points[i+1].y*canvas.height/2);
		ctx.strokeStyle = 'gray';
		ctx.lineWidth = 5;
		ctx.stroke();
	}
}

Shape.prototype.drawDots = function(canvas, width, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
		points = this.vertices.copyPoints(this.points);
		points.push(this.center);
	if (doClear)  ctx.clearRect(0, 0, canvas.width, canvas.height);
	let canvasWidth = canvas.width/2,
		canvasHeight = canvas.height/2;
	for (var i=0; i<points.length; i++) {
		// var x = points[i].x - width/2;
		// var y = points[i].y - width/2;
		// ctx.fillRect(x, y, width, width);
		let x = points[i].x,
			y = points[i].y,
			r = width/2;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI*2);
		ctx.closePath();
		ctx.fillStyle = 'gray';
		ctx.fill();
	}
}

/*
	LINE
*/
	
function Line(vertices) {
	var N = vertices.points.length - 1;
	this.vertices = vertices;
	this.points = [vertices.points[0], vertices.points[N]];
	this.identity = 'line';
	this.getCenter();
}

Line.prototype = Object.create(Shape.prototype);

Line.prototype.constructor = Line;

Line.prototype.getCenter = function() {
	var points = this.points,
		verts = this.vertices,
		x = (points[1].x - points[0].x) / 2 + points[0].x,
		y = verts.getYAlongLineAtX(x, points[0], points[1]);
	this.center = new Point(x, y, 0);
}

Line.prototype.rescale = function(pwidth, pheight, nwidth, nheight) {
	let newVertices = this.getRescaledVertices(pwidth, pheight, nwidth, nheight),
		N = newVertices.points.length - 1;
	this.vertices = newVertices;
	this.points = [newVertices.points[0], newVertices.points[N]]
	this.update();
}

/*
	CIRCLE
*/

function Circle(vertices, center, radius) {
	this.vertices = vertices;
	this.center = center;
	this.radius = radius;
	this.points = [center];
	this.identity = 'circle';
}

Circle.prototype = Object.create(Shape.prototype);

Circle.prototype.constructor = Circle;

Circle.prototype.rescale = function(oldWidth, oldHeight, newWidth, newHeight) {
	if (oldWidth === newWidth && oldHeight === newHeight) return;
	let verts = this.vertices,
		scaleVecA = new Point(oldWidth, oldHeight, 0),
		scaleVecB = new Point(newWidth/oldWidth, newHeight/oldHeight, 0),
		center = this.center,
		radiusScale = ((newWidth/oldWidth) + (newHeight/oldHeight))/2;

	center.divide(scaleVecA);
	center.times(new Point(newWidth, newHeight, 0));
	this.radius *= radiusScale;
}

Circle.prototype.update = function() {
	this.vertices.updateAllExceptHull();
}

Circle.prototype.drawLine = function(canvas, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
		point = this.points[0],
		r = this.radius;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.arc(point.x, point.y, r, 0, Math.PI*2);
	ctx.strokeStyle = 'gray';
	ctx.lineWidth = 5;
	ctx.stroke();
}

export { Shape, Line, Circle }

