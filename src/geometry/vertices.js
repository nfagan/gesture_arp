import { Util } from '../util.js';

/*
	VERTICES
*/

function Vertices(pts) {

	this.points = [];
	this.pointsSansAnchor = [];
	this.anchorPoint = undefined;
	this.firstPoint = undefined;
	this.hull = undefined;
	this.area = undefined;
	this.signedArea = undefined;
	this.perimeter = undefined;
	this.centroid = undefined;
	this.perimeterEfficiency = undefined;
	this.hullAreaRatio = 0;
	this.hullNRatio = 0;

	if (pts !== undefined) {
		this.addPoints(pts);
	}
}

/*
	INIT
*/

Vertices.prototype.constructor = Vertices;

Vertices.prototype.addPoints = function(pts) {
	for (var i=0; i<pts.length; i++) {
		this.addPoint(pts[i].x, pts[i].y, i);
	}
}

Vertices.prototype.addPointsWithIndex = function(pts) {
	for (var i=0; i<pts.length; i++) {
		this.addPoint(pts[i].x, pts[i].y, pts[i].index);
	}
}

Vertices.prototype.addPoint = function(x, y, index) {
	var ap = this.anchorPoint,
		point = new Point(x, y, index);

    if (ap === undefined) {
        this.anchorPoint = point;
        this.firstPoint = point;
        this.points.push(point);
        return;
    } else if (
        (ap.y > y && ap.x > x) ||
        (ap.y === y && ap.x > x) ||
        (ap.y > y && ap.x === x)
    ) {
        this.pointsSansAnchor.push(ap);
        this.anchorPoint = point;
    } else {
    	this.pointsSansAnchor.push(point);
    }
	this.points.push(point);
	if (this.firstPoint.index > point.index) {
		this.firstPoint = point;
	}
};

/*
	UTIL
*/

Vertices.prototype.pushFirstPoint = function() {
	this.points.push(this.points[0]);
}

Vertices.prototype.removeLastPoint = function() {
	this.points.splice(this.points.length-1, 1);
}

Vertices.prototype.copyPoints = function(arr) {
	return arr.map(function(pt) {
		return new Point(pt.x, pt.y, pt.index);
	});
}

/*
	OPERATIONS
*/

Vertices.prototype.arrayAdd = function(points, b) {
	for (var i=0; i<points.length; i++) {
		points[i].plus(b);
	}
}

Vertices.prototype.arrayMinus = function(points, b) {
	for (var i=0; i<points.length; i++) {
		points[i].minus(b);
	}
}

/*
	CONVEX HULL
*/

Vertices.prototype._sortPointsByPolarAngle = function() {
    var self = this;

    return this.pointsSansAnchor.sort(function(a, b) {
        var polarA = self._findPolarAngle(self.anchorPoint, a);
        var polarB = self._findPolarAngle(self.anchorPoint, b);

        if (polarA < polarB) return -1;
        if (polarA > polarB) return 1;
        return 0;
    });
}
Vertices.prototype._findPolarAngle = function(a, b) {
    var ONE_RADIAN = 57.295779513082;
    var deltaX, deltaY;

    if (!a || !b) return 0;

    deltaX = (b.x - a.x);
    deltaY = (b.y - a.y);

    if (deltaX == 0 && deltaY == 0) return 0;

    var angle = Math.atan2(deltaY, deltaX) * ONE_RADIAN;

    if (this.reverse) {
        if (angle <= 0) {
            angle += 360;
        }
    } else {
        if (angle >= 0) {
            angle += 360;
        }
    }
    return angle;
}
Vertices.prototype._ccw = function(p0, p1, p2) {
    var difAngle;
    var cwAngle = this._findPolarAngle(p0, p1);
    var ccwAngle = this._findPolarAngle(p0, p2);

    if (cwAngle > ccwAngle) {
        difAngle = cwAngle - ccwAngle;
        return !(difAngle > 180);
    } else if (cwAngle < ccwAngle) {
        difAngle = ccwAngle - cwAngle;
        return (difAngle > 180);
    }
    return true;
}
Vertices.prototype.getHull = function() {
    var hullPoints = [],
        points,
        pointsLength;

    this.reverse = this.pointsSansAnchor.every(function(point){
        return (point.x < 0 && point.y < 0);
    });

    points = this._sortPointsByPolarAngle();
    pointsLength = points.length;

    if (pointsLength < 3) {
        points.unshift(this.anchorPoint);
        return points;
    }

    hullPoints.push(points.shift(), points.shift());

    while (true) {
        var p0,
            p1,
            p2;

        hullPoints.push(points.shift());

        p0 = hullPoints[hullPoints.length - 3];
        p1 = hullPoints[hullPoints.length - 2];
        p2 = hullPoints[hullPoints.length - 1];

        if (this._ccw(p0, p1, p2)) {
            hullPoints.splice(hullPoints.length - 2, 1);
        }

        if (points.length == 0) {
            if (pointsLength == hullPoints.length) {
                var ap = this.anchorPoint;
                hullPoints = hullPoints.filter(function(p) { return !!p; });
                if (!hullPoints.some(function(p){
                        return(p.x == ap.x && p.y == ap.y);
                    })) {
                    hullPoints.unshift(this.anchorPoint);
                }
                return hullPoints;
            }
            points = hullPoints;
            pointsLength = points.length;
            hullPoints = [];
            hullPoints.push(points.shift(), points.shift());
        }
    }
}

/*
	UPDATES
*/

Vertices.prototype.updateMost = function() {
	this.updatePerimeter();
	this.updateArea();
	this.updatePerimeterEfficiency();
	this.updateCentroid();
}

Vertices.prototype.updateAll = function() {
	this.updateMost();
	this.updateHull();
	this.updateHullAreaRatio();
	this.updateHullNRatio();
}

Vertices.prototype.updateAllExceptHull = function() {
	this.updateMost();
}

Vertices.prototype.updateHull = function() {
	var hullPoints = this.getHull(),
		hull = new Vertices();
	hull.addPointsWithIndex(hullPoints);
	hull.updateAllExceptHull();
	hull.hull = hull;
	this.hull = hull;
}

Vertices.prototype.updateCentroid = function() {
	if (this.area === undefined) this.updateArea();
	this.pushFirstPoint();
	this.centroid = this.getCentroid(this.points, this.signedArea);
	this.removeLastPoint();
}

Vertices.prototype.updatePerimeter = function() {
	this.pushFirstPoint();
	this.perimeter = this.getPerimeter(this.points);
	this.removeLastPoint();
}

Vertices.prototype.updateArea = function() {
	this.pushFirstPoint();
	var area = this.getArea(this.points);
	this.area = Math.abs(area);
	this.signedArea = area;
	this.removeLastPoint();
}

Vertices.prototype.updatePerimeterEfficiency = function() {
	if (this.area === undefined || this.perimeter === undefined) {
		this.updateArea();
		this.updatePerimeter();
	}
	var	area = this.area,
		perim = this.perimeter;
	this.perimeterEfficiency = this.getPerimeterEfficiency(area, perim);
}

Vertices.prototype.updateHullAreaRatio = function() {
	if (this.area === undefined || this.hull === undefined) return;
	this.hullAreaRatio = this.hull.area / this.area;
}

Vertices.prototype.updateHullNRatio = function() {
	if (this.hull === undefined) return;
	this.hullNRatio = this.hull.points.length / this.points.length
}

/*
	BASIC GEOMETRY
*/

Vertices.prototype.getPerimeter = function(points) {
	var perim = 0,
		x1, x2, y1, y2;
	for (var i=1; i<points.length; i++) {
		x1 = points[i-1].x;
		x2 = points[i].x;
		y1 = points[i-1].y;
		y2 = points[i].y;
		var xsq = Math.pow(x2-x1, 2),
			ysq = Math.pow(y2-y1, 2);
		perim += Math.sqrt(xsq + ysq);
	}
	return perim
}

Vertices.prototype.getArea = function(points) {
	var x1, y1, x2, y2, sum = 0;
	for (var i=0; i<points.length-1; i++) {
		x1 = points[i].x;
		x2 = points[i+1].x;
		y1 = points[i].y;
		y2 = points[i+1].y;
		sum += (x1*y2) - (y1*x2);
	}
	return sum/2
}

Vertices.prototype.getPerimeterEfficiency = function(area, perim) {
	return (2*Math.sqrt(Math.PI*area))/perim
}

Vertices.prototype.getCentroid = function(points, area) {
	if (area === undefined) {
		area = getArea(points);
	}
	var xs = points.map(function(point) { return point.x }),
		ys = points.map(function(point) { return point.y });

	var Cx = 0, 
		Cy = 0;

	for (var i = 0; i<xs.length-1; i++) {
		var x0 = xs[i],
			x1 = xs[i+1],
			y0 = ys[i],
			y1 = ys[i+1],
			B = (x0*y1 - x1*y0);
		Cx += (x0+x1) * B;
		Cy += (y0+y1) * B;
	}

	Cx /= (6*area);
	Cy /= (6*area);

	return new Point(Cx, Cy, 0);
}

Vertices.prototype.getDistances = function(point, points) {
	var dist = [];
	for (var i=0; i<points.length; i++) {
		dist.push(this.getDistance(point, points[i]));
	}
	return dist;
}

Vertices.prototype.getDistance = function(a, b) {
	return Math.sqrt(Math.pow(b.x-a.x, 2) + Math.pow(b.y-a.y, 2));
}

Vertices.prototype.getPerpendicularDistance = function(p, v, w) {
	function sqr(x) { return x * x }
	function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }
	function distToSegmentSquared(p, v, w) {
	  var l2 = dist2(v, w);
	  if (l2 == 0) return dist2(p, v);
	  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
	  t = Math.max(0, Math.min(1, t));
	  return dist2(p, { x: v.x + t * (w.x - v.x),
	                    y: v.y + t * (w.y - v.y) });
	}
	return Math.sqrt(distToSegmentSquared(p, v, w));
}

Vertices.prototype.getConsecutiveDistances = function(points) {
	var D = [], a, b;
	for (var i=0; i<points.length-1; i++) {
		a = points[i];
		b = points[i+1];
		D.push(this.getDistance(a, b));
	}
	return D;
}

Vertices.prototype.getSlope = function(p1, p2) {
	return (p2.y - p1.y) / (p2.x - p1.x);
}

Vertices.prototype.getLineEquationY = function(p1, p2) {
	var m = this.getSlope(p1, p2),
		b = p2.y - (m * p2.x),
		func = function(x) { return m * x + b; };
	return func;
}

Vertices.prototype.getLineEquationX = function(p1, p2) {
	var m = this.getSlope(p1, p2),
		b = p2.y - (m * p2.x),
		func = function(y) { return (y - b)/m; };
	return func;
}

Vertices.prototype.getXAlongLineAtY = function(y, p1, p2) {
	var func = this.getLineEquationX(p1, p2);
	return func(y);
}

Vertices.prototype.getYAlongLineAtX = function(x, p1, p2) {
	var func = this.getLineEquationY(p1, p2);
	return func(x);
}

Vertices.prototype.getAngle = function(p1, p2, p3) {
	var p12 = this.getDistance(p1, p2),
		p13 = this.getDistance(p1, p3),
		p23 = this.getDistance(p2, p3),
		A1 = Math.pow(p12, 2),
		A2 = Math.pow(p13, 2),
		A3 = Math.pow(p23, 2);
	return Math.acos((A1 + A2 - A3) / (2 * p12 * p13));
}

/*
	CONDITIONS
*/

Vertices.prototype.isNearVertex = function(p1, p2, bounds) {
	return this.getDistance(p1, p2) <= bounds;
}

Vertices.prototype.isNearVertices = function(points, p2, bounds) {
	var M = [];
	for (var i=0; i<points.length; i++) {
		M.push(this.isNearVertex(points[i], p2, bounds));
	}
	return M;
}

Vertices.prototype.doesIntersect = function(p1, p2, p3, bounds) {
	var m = this.getSlope(p2, p3),
		b = p2.y - (m * p2.x),
		y = m * p1.x + b;
	return Math.abs(y-p1.y) <= bounds;
}

/*
	POINT
*/

function Point(x, y, index) {
	this.x = x;
	this.y = y;
	this.index = index;
}

Point.prototype.constructor = Point;

Point.prototype.copy = function() {
	return new Point(this.x, this.y, this.index);
}

Point.prototype.minus = function(b) {
	if (b instanceof Point) {
		this.x -= b.x;
		this.y -= b.y;
	} else {
		this.x -= b;
		this.y -= b;
	}
}

Point.prototype.plus = function(b) {
	if (b instanceof Point) {
		this.x += b.x;
		this.y += b.y;
	} else {
		this.x += b;
		this.y += b;
	}
}

export { Vertices, Point }