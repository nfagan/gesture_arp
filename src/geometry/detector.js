import { Vertices, Point } from './vertices.js';
import { Shape, Line, Circle } from './shape.js';
import { Util } from '../util.js';

function Detector(vertices) {
	this.vertices = vertices;
	this.criteria = {
		rectangle: {
			axisRatioThreshold: .5
		},
		circle: {
			globalThreshold: .5
		},
		triangle: {
			globalThreshold: 10
		},
		line: {
			distanceThreshold: .4,
			perpDistanceThreshold: .05
		},
		random: {
			globalThreshold: .5
		}
	}
	this.estimatedVertices = {
		rectangle: [],
		circle: [],
		triangle: [],
		line: []
	}
	this.identity = undefined;
}

Detector.prototype.constructor = Detector;

/*
	UPDATE ESTIMATED VERTICES
*/

Detector.prototype.updateEstimatedVertices = function() {
	this.estimatedVertices.rectangle = this.getEstimatedRectVertices();
	this.estimatedVertices.triangle = this.getEstimatedTriangleVertices();
	this.estimatedVertices.circle = this.getEstimatedCircleVertices();
	this.estimatedVertices.line = this.getEstimatedLineVertices();
}

/*
	ESTIMATE VERTICES
*/


Detector.prototype.getEstimatedTriangleVertices = function() {
	var verts = this.vertices.hull,
		points = verts.points,
		inds = [];
	for (var i=0; i<points.length; i++) inds.push(i);
	var area = -Infinity,
		largestSet;
	inds = Util.combs(inds, 3);
	for (var i=0; i<inds.length; i++) {
		var set = inds[i],
			A = points[set[0]],
			B = points[set[1]],
			C = points[set[2]],
			tri = [A, B, C],
			currentArea = Math.abs(verts.getArea(tri));
		if (currentArea > area) {
			largestSet = [A, B, C];
			area = currentArea;
		}
	}
	return largestSet
}

Detector.prototype.getEstimatedRectVertices = function() {

	var verts = 		this.vertices.hull,
		points = 		verts.points,
		centroid = 		verts.centroid,
		topLeftPts = 	points.filter(topLeftFunc),
		topRightPts = 	points.filter(topRightFunc),
		btmLeftPts = 	points.filter(btmLeftFunc),
		btmRightPts = 	points.filter(btmRightFunc),
		nTopLeft = 		topLeftPts.length,
		nTopRight = 	topRightPts.length,
		nBtmLeft = 		btmLeftPts.length,
		nBtmRight = 	btmRightPts.length;

	if (nTopLeft === 0 || nTopRight === 0 
		|| nBtmLeft === 0 || nBtmRight === 0) {
		return [];
	}

	var topLeftDistances = 	verts.getDistances(centroid, topLeftPts),
		topRightDistances = verts.getDistances(centroid, topRightPts),
		btmLeftDistances = 	verts.getDistances(centroid, btmLeftPts),
		btmRightDistances = verts.getDistances(centroid, btmRightPts);

	var topLeftInd = 	Util.findMax(topLeftDistances),
		topRightInd = 	Util.findMax(topRightDistances),
		btmLeftInd = 	Util.findMax(btmLeftDistances),
		btmRightInd = 	Util.findMax(btmRightDistances);

	var topLeftPt = 	topLeftPts[topLeftInd],
		topRightPt = 	topRightPts[topRightInd],
		btmLeftPt = 	btmLeftPts[btmLeftInd],
		btmRightPt = 	btmRightPts[btmRightInd];

	return [topLeftPt, topRightPt, btmLeftPt, btmRightPt];

	function topLeftFunc(pt) { return pt.x < centroid.x && pt.y > centroid.y; }
	function topRightFunc(pt) { return pt.x > centroid.x && pt.y > centroid.y; }
	function btmLeftFunc(pt) { return pt.x < centroid.x && pt.y < centroid.y; }
	function btmRightFunc(pt) { return pt.x > centroid.x && pt.y < centroid.y; }
}

Detector.prototype.getEstimatedCircleVertices = function() {
	var verts = this.vertices,
		points = verts.hull.points,
		centroid = verts.hull.centroid,
		distances = verts.getDistances(centroid, points),
		summed = Util.sum(distances),
		N = distances.length,
		mean = summed/N;

	var radius = new Point(centroid.x, centroid.y+mean, 0);

	return [centroid, radius];
}

Detector.prototype.getEstimatedLineVertices = function() {
	var N = this.vertices.points.length;
	return [this.vertices.points[0], this.vertices.points[N-1]];
}

/*
	ASSESS SHAPE LIKELIHOOD
*/

Detector.prototype.getLikelihoodRect = function() {
	var rectVertices = this.estimatedVertices.rectangle;

	if (rectVertices.length === 0) return 0;

	var hull = 			this.vertices.hull,
		topLeftPt = 	rectVertices[0],
		topRightPt = 	rectVertices[1],
		btmLeftPt = 	rectVertices[2],
		btmRightPt = 	rectVertices[3],
		centroid = 		hull.centroid;

	var axis1Ratio = getSlopeRatio(topLeftPt, btmRightPt, centroid),
		axis2Ratio = getSlopeRatio(btmLeftPt, topRightPt, centroid),
		threshold = this.criteria.rectangle.axisRatioThreshold;

	return Math.max(axis1Ratio, axis2Ratio);

	function getSlopeRatio(p0, p1, centroid) {
		var slopeA = hull.getSlope(p0, centroid),
			slopeB = hull.getSlope(p1, centroid),
			slopeAB = hull.getSlope(p0, p1),
			ratio = (slopeA/slopeAB) * (slopeB/slopeAB);
		return ratio;
	}
}

Detector.prototype.getLikelihoodCircle = function() {
	var verts = this.vertices,
		hull = verts.hull,
		vertPoints = verts.points,
		hullPoints = hull.points,
		nSamples = vertPoints.length,
		nHull = hullPoints.length,
		nRatio = nHull / nSamples,
		realArea = verts.area,
		hullArea = hull.area,
		areaRatio = realArea / hullArea,
		perimEfficiency = verts.perimeterEfficiency,
		confidence = perimEfficiency * nRatio * areaRatio;

	return confidence;
}

Detector.prototype.getLikelihoodTriangle = function() {
	var triangleVertices = this.estimatedVertices.triangle,
		area = this.vertices.hull.area;
	if (triangleVertices === undefined) return Infinity;
	return area / Math.abs(this.vertices.getArea(triangleVertices));
}

Detector.prototype.getLikelihoodLine = function() {
	var verts = this.vertices,
		points = verts.points,
		pFirst = points[0],
		pLast = points[points.length-1],
		perpDistanceRatios = [],
		distances = [],
		lastDistance = verts.getDistance(pFirst, pLast),
		pDistance;
	for (var i=1; i<points.length-2; i++) {
		pDistance = verts.getPerpendicularDistance(points[i], pFirst, pLast);
		perpDistanceRatios.push(pDistance/lastDistance);
	}
	for (var i=0; i<points.length-2; i++) {
		distances.push(verts.getDistance(points[i], points[i+1]));
	}
	var summed = Util.sum(distances),
		distRatio = lastDistance / summed,
		maxPerpRatio = Math.max(...perpDistanceRatios);

	return {
		distanceRatio: distRatio,
		perpDistanceRatio: maxPerpRatio
	}
}

Detector.prototype.getLikelihoodRandom = function() {
	return this.vertices.perimeterEfficiency;
}

/*
	ASSIGN SHAPE IDENTITY
*/

Detector.prototype.isRectangle = function() {
	var estimate = this.getLikelihoodRect(),
		thresh = this.criteria.rectangle.axisRatioThreshold;
	return Math.abs(estimate - 1) < thresh;
}

Detector.prototype.isCircle = function() {
	var estimate = this.getLikelihoodCircle(),
		thresh = this.criteria.circle.globalThreshold;
	return estimate > thresh;
}

Detector.prototype.isTriangle = function() {
	var estimate = this.getLikelihoodTriangle(),
		thresh = this.criteria.triangle.globalThreshold;
	return estimate < thresh;
}

Detector.prototype.isLine = function() {
	var estimates = this.getLikelihoodLine(),
		distanceRatio = estimates.distanceRatio,
		perpRatio = estimates.perpDistanceRatio,
		distanceThresh = this.criteria.line.distanceThreshold,
		perpDistanceThresh = this.criteria.line.perpDistanceThreshold;

	return distanceRatio-1 < distanceThresh && perpRatio < perpDistanceThresh;
}

Detector.prototype.isRandom = function() {
	var estimate = this.getLikelihoodRandom(),
		thresh = this.criteria.random.globalThreshold;

	return estimate < thresh;
}

/*
	MODIFY VERTICES
*/

Detector.prototype.getAdjustedRectVertices = function() {
	var rectPoints = this.estimatedVertices.rectangle,
		rectVerts = new Vertices(rectPoints),
		points = rectVerts._sortPointsByPolarAngle();
	points.unshift(rectVerts.anchorPoint);
	rectVerts.points = points;
	rectVerts.updateAllExceptHull();
	points.push(points[0]);
	var distances = rectVerts.getConsecutiveDistances(points),
		L = Util.mean(distances),
		centroid = rectVerts.centroid,
		midPoint = new Point(L/2, L/2, 0),
		A = centroid.copy(),
		B = centroid.copy(),
		C = centroid.copy(),
		D = centroid.copy();

	A.minus(midPoint);
	B.x -= midPoint.x;
	B.y += midPoint.y;
	C.plus(midPoint);
	D.x += midPoint.x;
	D.y -= midPoint.y;

	var recombinedVerts = new Vertices([A, B, C, D]);
	recombinedVerts.updateAll();
	return recombinedVerts;
}

Detector.prototype.getAdjustedTriangleVertices = function() {
	var verts = this.vertices,
		triPoints = this.estimatedVertices.triangle,
		centroid = verts.hull.centroid,
		distances = verts.getDistances(centroid, triPoints),
		meanDist = Util.mean(distances) * .9,
		newVerts = [];

	for (var i=0; i<3; i++) {
		var center = centroid.copy();
		if (i === 0) {
			center.y -= meanDist;
		} else if (i === 1) {
			center.y += meanDist;
			center.x -= meanDist;
		} else {
			center.y += meanDist;
			center.x += meanDist;
		}
		newVerts.push(center);
	}
	var vertices = new Vertices(newVerts);
	vertices.updateAll();
	return vertices;
}

/*
	GET DETECTED SHAPE
*/

Detector.prototype.getLine = function() {
	return new Line(this.vertices);
}

Detector.prototype.getRectangle = function() {
	var verts = this.getAdjustedRectVertices();
	return new Shape(verts, 'rectangle');
}

Detector.prototype.getTriangle = function() {
	var verts = this.getAdjustedTriangleVertices();
	return new Shape(verts, 'triangle');
}

Detector.prototype.getCircle = function() {
	var verts = this.vertices,
		estimatedVertices = this.estimatedVertices.circle,
		center = estimatedVertices[0],
		radius = estimatedVertices[1].y - center.y;
	return new Circle(verts, center, radius);
}

Detector.prototype.getRandom = function() {
	return new Shape(this.vertices, 'random');
}

Detector.prototype.getDetectedShape = function() {
	switch (this.identity) {
		case 'line':
			return this.getLine();
		case 'rectangle':
			return this.getRectangle();
		case 'circle':
			return this.getCircle();
		case 'triangle':
			return this.getTriangle();
		case 'random':
			return this.getRandom();
		default:
			return this.getRandom();
	}
}

/*
	IDENTIFY
*/

Detector.prototype.identify = function() {
	var isRectangle = this.isRectangle(),
		isCircle = this.isCircle(),
		isTriangle = this.isTriangle(),
		isLine = this.isLine(),
		isRandom = this.isRandom(),
		identity;

	if (isLine) {
		identity = 'line';
	} else if (isRandom) {
		identity = 'random';
	} else if (isCircle) {
		identity = 'circle';
	} else if (isRectangle) {
		identity = 'rectangle';
	} else if (isTriangle) {
		identity = 'triangle';
	} else {
		identity = undefined;
	}

	this.identity = identity;
}

export { Detector };
