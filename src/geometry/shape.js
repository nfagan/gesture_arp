import { Util } from '../util.js';
import { Vertices, Point } from './vertices.js'

/*
	SHAPE -- Rectangle, Triangle, Random ...
*/

function Shape(vertices, identity) {
	this.vertices = vertices;
	this.points = vertices.points;
	this.identity = identity;
	this.getCenter();
}

Shape.prototype.constructor = Shape;

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
		ctx.stroke();
	}
}

Shape.prototype.drawDots = function(canvas, width, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
		points = this.vertices.copyPoints(this.points);
		points.push(this.center);
	if (doClear)  ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i=0; i<points.length; i++) {
		if (points[i].index === 0) {
			// ctx.fillStyle = 'red';
			ctx.fillStyle = 'gray';
		} else if (points[i].index === 1) {
			ctx.fillStyle = 'gray';
		} else {
			ctx.fillStyle = 'gray';
		}
		var x = points[i].x - width/2;
		var y = points[i].y - width/2;
		ctx.fillRect(x, y, width, width);
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
	ctx.stroke();
}

export { Shape, Line, Circle }

