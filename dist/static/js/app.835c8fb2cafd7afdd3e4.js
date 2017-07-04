webpackJsonp([1],{

/***/ 16:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return Vertices; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Point; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util_js__ = __webpack_require__(3);


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

Vertices.prototype.addPoints = function (pts) {
	for (var i = 0; i < pts.length; i++) {
		this.addPoint(pts[i].x, pts[i].y, i);
	}
};

Vertices.prototype.addPointsWithIndex = function (pts) {
	for (var i = 0; i < pts.length; i++) {
		this.addPoint(pts[i].x, pts[i].y, pts[i].index);
	}
};

Vertices.prototype.addPoint = function (x, y, index) {
	var ap = this.anchorPoint,
	    point = new Point(x, y, index);

	if (ap === undefined) {
		this.anchorPoint = point;
		this.firstPoint = point;
		this.points.push(point);
		return;
	} else if (ap.y > y && ap.x > x || ap.y === y && ap.x > x || ap.y > y && ap.x === x) {
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

Vertices.prototype.pushFirstPoint = function () {
	this.points.push(this.points[0]);
};

Vertices.prototype.removeLastPoint = function () {
	this.points.splice(this.points.length - 1, 1);
};

Vertices.prototype.copyPoints = function (arr) {
	return arr.map(function (pt) {
		return new Point(pt.x, pt.y, pt.index);
	});
};

/*
	OPERATIONS
*/

Vertices.prototype.arrayAdd = function (points, b) {
	for (var i = 0; i < points.length; i++) {
		points[i].plus(b);
	}
};

Vertices.prototype.arrayMinus = function (points, b) {
	for (var i = 0; i < points.length; i++) {
		points[i].minus(b);
	}
};

/*
	CONVEX HULL
*/

Vertices.prototype._sortPointsByPolarAngle = function () {
	var self = this;

	return this.pointsSansAnchor.sort(function (a, b) {
		var polarA = self._findPolarAngle(self.anchorPoint, a);
		var polarB = self._findPolarAngle(self.anchorPoint, b);

		if (polarA < polarB) return -1;
		if (polarA > polarB) return 1;
		return 0;
	});
};
Vertices.prototype._findPolarAngle = function (a, b) {
	var ONE_RADIAN = 57.295779513082;
	var deltaX, deltaY;

	if (!a || !b) return 0;

	deltaX = b.x - a.x;
	deltaY = b.y - a.y;

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
};
Vertices.prototype._ccw = function (p0, p1, p2) {
	var difAngle;
	var cwAngle = this._findPolarAngle(p0, p1);
	var ccwAngle = this._findPolarAngle(p0, p2);

	if (cwAngle > ccwAngle) {
		difAngle = cwAngle - ccwAngle;
		return !(difAngle > 180);
	} else if (cwAngle < ccwAngle) {
		difAngle = ccwAngle - cwAngle;
		return difAngle > 180;
	}
	return true;
};
Vertices.prototype.getHull = function () {
	var hullPoints = [],
	    points,
	    pointsLength;

	this.reverse = this.pointsSansAnchor.every(function (point) {
		return point.x < 0 && point.y < 0;
	});

	points = this._sortPointsByPolarAngle();
	pointsLength = points.length;

	if (pointsLength < 3) {
		points.unshift(this.anchorPoint);
		return points;
	}

	hullPoints.push(points.shift(), points.shift());

	while (true) {
		var p0, p1, p2;

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
				hullPoints = hullPoints.filter(function (p) {
					return !!p;
				});
				if (!hullPoints.some(function (p) {
					return p.x == ap.x && p.y == ap.y;
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
};

/*
	UPDATES
*/

Vertices.prototype.updateMost = function () {
	this.updatePerimeter();
	this.updateArea();
	this.updatePerimeterEfficiency();
	this.updateCentroid();
};

Vertices.prototype.updateAll = function () {
	this.updateMost();
	this.updateHull();
	this.updateHullAreaRatio();
	this.updateHullNRatio();
};

Vertices.prototype.updateAllExceptHull = function () {
	this.updateMost();
};

Vertices.prototype.updateHull = function () {
	var hullPoints = this.getHull(),
	    hull = new Vertices();
	hull.addPointsWithIndex(hullPoints);
	hull.updateAllExceptHull();
	hull.hull = hull;
	this.hull = hull;
};

Vertices.prototype.updateCentroid = function () {
	if (this.area === undefined) this.updateArea();
	this.pushFirstPoint();
	this.centroid = this.getCentroid(this.points, this.signedArea);
	this.removeLastPoint();
};

Vertices.prototype.updatePerimeter = function () {
	this.pushFirstPoint();
	this.perimeter = this.getPerimeter(this.points);
	this.removeLastPoint();
};

Vertices.prototype.updateArea = function () {
	this.pushFirstPoint();
	var area = this.getArea(this.points);
	this.area = Math.abs(area);
	this.signedArea = area;
	this.removeLastPoint();
};

Vertices.prototype.updatePerimeterEfficiency = function () {
	if (this.area === undefined || this.perimeter === undefined) {
		this.updateArea();
		this.updatePerimeter();
	}
	var area = this.area,
	    perim = this.perimeter;
	this.perimeterEfficiency = this.getPerimeterEfficiency(area, perim);
};

Vertices.prototype.updateHullAreaRatio = function () {
	if (this.area === undefined || this.hull === undefined) return;
	this.hullAreaRatio = this.hull.area / this.area;
};

Vertices.prototype.updateHullNRatio = function () {
	if (this.hull === undefined) return;
	this.hullNRatio = this.hull.points.length / this.points.length;
};

/*
	BASIC GEOMETRY
*/

Vertices.prototype.getPerimeter = function (points) {
	var perim = 0,
	    x1,
	    x2,
	    y1,
	    y2;
	for (var i = 1; i < points.length; i++) {
		x1 = points[i - 1].x;
		x2 = points[i].x;
		y1 = points[i - 1].y;
		y2 = points[i].y;
		var xsq = Math.pow(x2 - x1, 2),
		    ysq = Math.pow(y2 - y1, 2);
		perim += Math.sqrt(xsq + ysq);
	}
	return perim;
};

Vertices.prototype.getArea = function (points) {
	var x1,
	    y1,
	    x2,
	    y2,
	    sum = 0;
	for (var i = 0; i < points.length - 1; i++) {
		x1 = points[i].x;
		x2 = points[i + 1].x;
		y1 = points[i].y;
		y2 = points[i + 1].y;
		sum += x1 * y2 - y1 * x2;
	}
	return sum / 2;
};

Vertices.prototype.getPerimeterEfficiency = function (area, perim) {
	return 2 * Math.sqrt(Math.PI * area) / perim;
};

Vertices.prototype.getCentroid = function (points, area) {
	if (area === undefined) {
		area = getArea(points);
	}
	var xs = points.map(function (point) {
		return point.x;
	}),
	    ys = points.map(function (point) {
		return point.y;
	});

	var Cx = 0,
	    Cy = 0;

	for (var i = 0; i < xs.length - 1; i++) {
		var x0 = xs[i],
		    x1 = xs[i + 1],
		    y0 = ys[i],
		    y1 = ys[i + 1],
		    B = x0 * y1 - x1 * y0;
		Cx += (x0 + x1) * B;
		Cy += (y0 + y1) * B;
	}

	Cx /= 6 * area;
	Cy /= 6 * area;

	return new Point(Cx, Cy, 0);
};

Vertices.prototype.getDistances = function (point, points) {
	var dist = [];
	for (var i = 0; i < points.length; i++) {
		dist.push(this.getDistance(point, points[i]));
	}
	return dist;
};

Vertices.prototype.getDistance = function (a, b) {
	return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};

Vertices.prototype.getPerpendicularDistance = function (p, v, w) {
	function sqr(x) {
		return x * x;
	}
	function dist2(v, w) {
		return sqr(v.x - w.x) + sqr(v.y - w.y);
	}
	function distToSegmentSquared(p, v, w) {
		var l2 = dist2(v, w);
		if (l2 == 0) return dist2(p, v);
		var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
		t = Math.max(0, Math.min(1, t));
		return dist2(p, { x: v.x + t * (w.x - v.x),
			y: v.y + t * (w.y - v.y) });
	}
	return Math.sqrt(distToSegmentSquared(p, v, w));
};

Vertices.prototype.getConsecutiveDistances = function (points) {
	var D = [],
	    a,
	    b;
	for (var i = 0; i < points.length - 1; i++) {
		a = points[i];
		b = points[i + 1];
		D.push(this.getDistance(a, b));
	}
	return D;
};

Vertices.prototype.getSlope = function (p1, p2) {
	return (p2.y - p1.y) / (p2.x - p1.x);
};

Vertices.prototype.getLineEquationY = function (p1, p2) {
	var m = this.getSlope(p1, p2),
	    b = p2.y - m * p2.x,
	    func = function func(x) {
		return m * x + b;
	};
	return func;
};

Vertices.prototype.getLineEquationX = function (p1, p2) {
	var m = this.getSlope(p1, p2),
	    b = p2.y - m * p2.x,
	    func = function func(y) {
		return (y - b) / m;
	};
	return func;
};

Vertices.prototype.getXAlongLineAtY = function (y, p1, p2) {
	var func = this.getLineEquationX(p1, p2);
	return func(y);
};

Vertices.prototype.getYAlongLineAtX = function (x, p1, p2) {
	var func = this.getLineEquationY(p1, p2);
	return func(x);
};

Vertices.prototype.getAngle = function (p1, p2, p3) {
	var p12 = this.getDistance(p1, p2),
	    p13 = this.getDistance(p1, p3),
	    p23 = this.getDistance(p2, p3),
	    A1 = Math.pow(p12, 2),
	    A2 = Math.pow(p13, 2),
	    A3 = Math.pow(p23, 2);
	return Math.acos((A1 + A2 - A3) / (2 * p12 * p13));
};

/*
	CONDITIONS
*/

Vertices.prototype.isNearVertex = function (p1, p2, bounds) {
	return this.getDistance(p1, p2) <= bounds;
};

Vertices.prototype.isNearVertices = function (points, p2, bounds) {
	var M = [];
	for (var i = 0; i < points.length; i++) {
		M.push(this.isNearVertex(points[i], p2, bounds));
	}
	return M;
};

Vertices.prototype.doesIntersect = function (p1, p2, p3, bounds) {
	var m = this.getSlope(p2, p3),
	    b = p2.y - m * p2.x,
	    y = m * p1.x + b;
	return Math.abs(y - p1.y) <= bounds;
};

/*
	POINT
*/

function Point(x, y, index) {
	this.x = x;
	this.y = y;
	this.index = index;
}

Point.prototype.constructor = Point;

Point.prototype.copy = function () {
	return new Point(this.x, this.y, this.index);
};

Point.prototype.minus = function (b) {
	if (b instanceof Point) {
		this.x -= b.x;
		this.y -= b.y;
	} else {
		this.x -= b;
		this.y -= b;
	}
};

Point.prototype.plus = function (b) {
	if (b instanceof Point) {
		this.x += b.x;
		this.y += b.y;
	} else {
		this.x += b;
		this.y += b;
	}
};



/***/ }),

/***/ 2:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return eventBus; });
// http://dev.housetrip.com/2014/09/15/decoupling-javascript-apps-using-pub-sub-pattern/

function EventBus() {
		this.topics = {};
		this.topicMap = {
				newShapeReady: 'newShapeReady',
				endOfSequence: 'endOfSequence',
				newSequenceSetCreated: 'newSequenceSetCreated',
				newSequenceCreated: 'newSequenceCreated',
				newActiveSequence: 'newActiveSequence',
				newEditedSequence: 'newEditedSequence',
				newActiveSequenceSet: 'newActiveSequenceSet',
				newNoteTimesReady: 'newNoteTimesReady'
		};
}

EventBus.prototype.constructor = EventBus;

EventBus.prototype.subscribe = function (topic, listener, id) {
		if (!this.topics[topic]) this.topics[topic] = [];

		this.topics[topic].push({ method: listener, id: id });
};

EventBus.prototype.publish = function (topic, data, to) {
		if (!this.topics[topic]) {
				throw new Error('No ' + topic + ' exists');
		}
		if (this.topics.length < 1) return;
		this.topics[topic].forEach(function (listener) {
				if (typeof to == 'undefined') {
						listener.method(data || {});
				} else {
						if (to === listener.id) {
								listener.method(data || {});
						}
				}
		});
};

var eventBus = new EventBus();



/***/ }),

/***/ 26:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return Shape; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Line; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return Circle; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_create__ = __webpack_require__(56);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_create___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_create__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__util_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__vertices_js__ = __webpack_require__(16);




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

Shape.prototype.update = function () {
	this.vertices.updateAllExceptHull();
	this.getCenter();
};

Shape.prototype.getCenter = function () {
	this.center = this.vertices.centroid;
};

Shape.prototype.centerOn = function (pt) {
	pt.minus(this.center);
	this.vertices.arrayAdd(this.points, pt);
	this.update();
};

Shape.prototype.isNearVertices = function (coord, bounds) {
	return this.vertices.isNearVertices(this.points, coord, bounds);
};

Shape.prototype.getVerticesNear = function (coord, bounds) {
	var index = this.isNearVertices(coord, bounds);
	return __WEBPACK_IMPORTED_MODULE_1__util_js__["a" /* Util */].logicalKeep(this.points, index);
};

Shape.prototype.isNearCenter = function (coord, bounds) {
	return this.vertices.isNearVertices([this.center], coord, bounds)[0];
};

/*
	DISPLAY
*/

Shape.prototype.drawLine = function (canvas, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
	    points = this.vertices.copyPoints(this.points);
	points.push(points[0]);
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < points.length - 1; i++) {
		ctx.beginPath();
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[i + 1].x, points[i + 1].y);
		ctx.stroke();
	}
};

Shape.prototype.drawDots = function (canvas, width, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
	    points = this.vertices.copyPoints(this.points);
	points.push(this.center);
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < points.length; i++) {
		if (points[i].index === 0) {
			// ctx.fillStyle = 'red';
			ctx.fillStyle = 'gray';
		} else if (points[i].index === 1) {
			ctx.fillStyle = 'gray';
		} else {
			ctx.fillStyle = 'gray';
		}
		var x = points[i].x - width / 2;
		var y = points[i].y - width / 2;
		ctx.fillRect(x, y, width, width);
	}
};

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

Line.prototype = __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_create___default()(Shape.prototype);

Line.prototype.constructor = Line;

Line.prototype.getCenter = function () {
	var points = this.points,
	    verts = this.vertices,
	    x = (points[1].x - points[0].x) / 2 + points[0].x,
	    y = verts.getYAlongLineAtX(x, points[0], points[1]);
	this.center = new __WEBPACK_IMPORTED_MODULE_2__vertices_js__["a" /* Point */](x, y, 0);
};

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

Circle.prototype = __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_create___default()(Shape.prototype);

Circle.prototype.constructor = Circle;

Circle.prototype.update = function () {
	this.vertices.updateAllExceptHull();
};

Circle.prototype.drawLine = function (canvas, doClear) {
	if (typeof doClear == 'undefined') doClear = true;
	var ctx = canvas.getContext('2d'),
	    point = this.points[0],
	    r = this.radius;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.beginPath();
	ctx.arc(point.x, point.y, r, 0, Math.PI * 2);
	ctx.stroke();
};



/***/ }),

/***/ 3:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Util; });
var Util = {};

Util.contains = function (arr, val) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] === val) return true;
	}
	return false;
};

Util.unique = function (arr) {
	var newArr = [arr[0]];
	for (var i = 1; i < arr.length; i++) {
		if (this.contains(newArr, arr[i])) continue;
		newArr.push(arr[i]);
	}
	return newArr;
};

Util.resample = function (arr, N) {
	if (arr.length <= N) return arr;
	var factor = Math.ceil(arr.length / N),
	    resampled = [],
	    stp = 0;
	while (stp < arr.length) {
		resampled.push(arr[stp]);
		stp += factor;
	}
	return resampled;
};

Util.findMin = function (arr) {
	var ind = -1,
	    minimum = Infinity;
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] < minimum) {
			ind = i;
			minimum = arr[i];
		}
	}
	return ind;
};

Util.findMax = function (arr) {
	var ind = -1,
	    maximum = -Infinity;
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] > maximum) {
			ind = i;
			maximum = arr[i];
		}
	}
	return ind;
};

Util.sum = function (arr) {
	var cumulative = 0;
	for (var i = 0; i < arr.length; i++) {
		cumulative += arr[i];
	}
	return cumulative;
};

Util.mean = function (arr) {
	return this.sum(arr) / arr.length;
};

Util.combs = function (arr, N) {
	var output = [];
	getAllPossibleCombinations(arr, N, output);
	return output;
	function getCombinations(array, size, start, initialStuff, output) {
		if (initialStuff.length >= size) {
			output.push(initialStuff);
		} else {
			var i;
			for (i = start; i < array.length; ++i) {
				getCombinations(array, size, i + 1, initialStuff.concat(array[i]), output);
			}
		}
	}
	function getAllPossibleCombinations(array, size, output) {
		getCombinations(array, size, 0, [], output);
	}
};

Util.logicalKeep = function (arr, ind) {
	var newArr = [];
	for (var i = 0; i < arr.length; i++) {
		if (!ind[i]) continue;
		newArr.push(arr[i]);
	}
	return newArr;
};

Util.randId = function (append) {
	var id = Math.random().toString(36).substring(7);
	if (append == null) return id;
	return append + id;
};



/***/ }),

/***/ 42:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_vue__ = __webpack_require__(25);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_vue_router__ = __webpack_require__(100);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_Hello__ = __webpack_require__(97);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__components_Hello___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_2__components_Hello__);




__WEBPACK_IMPORTED_MODULE_0_vue__["a" /* default */].use(__WEBPACK_IMPORTED_MODULE_1_vue_router__["a" /* default */]);

/* harmony default export */ __webpack_exports__["a"] = (new __WEBPACK_IMPORTED_MODULE_1_vue_router__["a" /* default */]({
  routes: [{
    path: '/',
    name: 'Hello',
    component: __WEBPACK_IMPORTED_MODULE_2__components_Hello___default.a
  }]
}));

/***/ }),

/***/ 43:
/***/ (function(module, exports, __webpack_require__) {

function injectStyle (ssrContext) {
  __webpack_require__(95)
}
var Component = __webpack_require__(41)(
  /* script */
  __webpack_require__(45),
  /* template */
  __webpack_require__(99),
  /* styles */
  injectStyle,
  /* scopeId */
  null,
  /* moduleIdentifier (server only) */
  null
)

module.exports = Component.exports


/***/ }),

/***/ 44:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__app_src_eventbus_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__app_src_audio_webaudio_js__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__app_src_audio_sequencesets_js__ = __webpack_require__(50);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__app_src_world_js__ = __webpack_require__(54);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__app_src_animation_animator_js__ = __webpack_require__(47);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__app_src_interaction_js__ = __webpack_require__(52);







let sequenceSetManager = new __WEBPACK_IMPORTED_MODULE_2__app_src_audio_sequencesets_js__["a" /* SequenceSets */](),
	filename = __WEBPACK_IMPORTED_MODULE_1__app_src_audio_webaudio_js__["a" /* webAudio */].filenames[0],
	sequenceSet = sequenceSetManager.createSet(filename),
	sequenceSet2 = sequenceSetManager.createSet(filename),
	canvas = document.createElement('canvas'),
	ctx = canvas.getContext('2d'),
	animator = new __WEBPACK_IMPORTED_MODULE_4__app_src_animation_animator_js__["a" /* Animator */](__WEBPACK_IMPORTED_MODULE_3__app_src_world_js__["a" /* world */], canvas),
	interaction = new __WEBPACK_IMPORTED_MODULE_5__app_src_interaction_js__["a" /* Interaction */](__WEBPACK_IMPORTED_MODULE_3__app_src_world_js__["a" /* world */], animator);

__WEBPACK_IMPORTED_MODULE_0__app_src_eventbus_js__["a" /* eventBus */].publish(__WEBPACK_IMPORTED_MODULE_0__app_src_eventbus_js__["a" /* eventBus */].topicMap.newActiveSequenceSet, {sequenceSetId: sequenceSet.id});
__WEBPACK_IMPORTED_MODULE_0__app_src_eventbus_js__["a" /* eventBus */].subscribe(__WEBPACK_IMPORTED_MODULE_0__app_src_eventbus_js__["a" /* eventBus */].topicMap.newNoteTimesReady, function(data) {
	// console.log(data);
});

sizeCanvas();

interaction.handleTouch();
animator.animate();

sequenceSet.createSequence(filename);
// sequenceSet.createSequence(filename);

sequenceSetManager.loop();

document.body.appendChild(canvas);

window.addEventListener('resize', sizeCanvas);

window.addEventListener('keydown', function(evt) {
	if (evt.keyCode === 27) {
		sequenceSetManager.cancelLoop();
	} else if (evt.keyCode === 32) {
		sequenceSetManager.loop();
	}
});

function sizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

/***/ }),

/***/ 45:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
//
//
//
//

/* harmony default export */ __webpack_exports__["default"] = ({
  name: 'app'
});

/***/ }),

/***/ 46:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//

/* harmony default export */ __webpack_exports__["default"] = ({
  name: 'hello',
  data: function data() {
    return {
      msg: 'Welcome to Your Vue.js App'
    };
  }
});

/***/ }),

/***/ 47:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Animator; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__eventbus_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__audio_webaudio_js__ = __webpack_require__(9);



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
	};
	this.pendingNotes = [];
	this.activeNotes = [];
	this.noteTimeTolerance = 1 / 60;
	this.subscribe();
}

Animator.prototype.subscribe = function () {
	var newNoteTimesTopic = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newNoteTimesReady;
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(newNoteTimesTopic, this.handleNewNoteTimes.bind(this));
};

Animator.prototype.handleNewNoteTimes = function (data) {
	for (var i = 0; i < data.noteTimes.length; i++) {
		this.pendingNotes.push({
			noteTime: data.noteTimes[i],
			point: data.points[i],
			noteDuration: data.noteDuration,
			loopIndex: data.loopIndex
		});
	}
};

Animator.prototype.constructor = Animator;

Animator.prototype.animate = function () {

	if (!this.shouldAnimate) return;

	var world = this.world,
	    canvas = this.canvas,
	    editedShape = world.getEditedShape();

	this.updateActiveNotes();

	if (editedShape !== undefined && !this.isRecording) {
		editedShape.drawLine(canvas);
		editedShape.drawDots(canvas, 30, false);
	} else if (this.isRecording) {
		this.drawLine(this.stroke);
	} else {
		var ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}

	for (var i = 0; i < this.activeNotes.length; i++) {
		if (editedShape !== undefined) {
			this.drawDots([this.activeNotes[i].point], 40, false);
		}
	}

	window.requestAnimationFrame(this.animate.bind(this));
};

Animator.prototype.updateActiveNotes = function () {
	var pendingNotes = [],
	    expired = [];
	for (var i = 0; i < this.pendingNotes.length; i++) {
		var note = this.pendingNotes[i],
		    currentTime = __WEBPACK_IMPORTED_MODULE_1__audio_webaudio_js__["a" /* webAudio */].context.currentTime,
		    noteTime = note.noteTime;
		if (Math.abs(noteTime - currentTime) < this.noteTimeTolerance) {
			this.activeNotes.push(note);
		} else {
			pendingNotes.push(note);
		}
	}
	for (var _i = 0; _i < this.activeNotes.length; _i++) {
		var _note = this.activeNotes[_i],
		    _currentTime = __WEBPACK_IMPORTED_MODULE_1__audio_webaudio_js__["a" /* webAudio */].context.currentTime,
		    _noteTime = _note.noteTime,
		    noteDuration = _note.noteDuration;
		if (_currentTime - (_noteTime + noteDuration) > this.noteTimeTolerance) {
			expired.push(_i - expired.length);
		}
	}
	for (var _i2 = 0; _i2 < expired.length; _i2++) {
		this.activeNotes.splice(expired[_i2], 1);
	}
	this.pendingNotes = pendingNotes;
	// this.activeNotes = activeNotes;
};

Animator.prototype.drawLine = function (points, doClear) {
	var canvas = this.canvas,
	    ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < points.length - 1; i++) {
		ctx.beginPath();
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[i + 1].x, points[i + 1].y);
		ctx.stroke();
	}
};

Animator.prototype.drawDots = function (points, width, doClear) {
	var canvas = this.canvas,
	    ctx = canvas.getContext('2d');
	if (typeof doClear == 'undefined') doClear = true;
	if (doClear) ctx.clearRect(0, 0, canvas.width, canvas.height);
	for (var i = 0; i < points.length; i++) {
		ctx.fillStyle = 'gray';
		var x = points[i].x - width / 2;
		var y = points[i].y - width / 2;
		ctx.fillRect(x, y, width, width);
	}
};



/***/ }),

/***/ 48:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Sequence; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__webaudio_js__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__eventbus_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__util_js__ = __webpack_require__(3);




function Sequence(sequenceSet, filename) {
	this.sequenceSet = sequenceSet;
	this.shape = undefined;
	this.id = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].randId();
	this.filename = filename;
	this.shouldLoop = true;
	this.isActive = false;
	this.loopIndex = 0;
	this.nBeats = 4;
	this.noteLength = 'quarter';
	this.currentBeat = __WEBPACK_IMPORTED_MODULE_0__webaudio_js__["a" /* webAudio */].getCurrentBeat();
	this.sources = [];
	this.subscribe();
}

Sequence.prototype.constructor = Sequence;

Sequence.prototype.subscribe = function () {
	var topicName = __WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].topicMap.newShapeReady;
	__WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].subscribe(topicName, this.registerShape.bind(this), this.id);
};

Sequence.prototype.registerShape = function (data) {
	var id = data.sequenceId,
	    shape = data.shape;
	if (id !== this.id) return;
	if (shape === undefined) {
		this.nBeats = 4;
		this.noteLength = 'quarter';
		this.shape = shape;
		for (var i = 0; i < this.sources.length; i++) {
			this.sources[i].stop(0);
		}
		return;
	}
	this.shape = shape;
	switch (shape.identity) {
		case 'triangle':
			this.nBeats = 4;
			this.noteLength = 'eighthTriplet';
			break;
		case 'rectangle':
			this.nBeats = 4;
			this.noteLength = 'quarter';
			break;
		case 'circle':
			this.nBeats = 4;
			this.noteLength = 'sixteenth';
			break;
		case 'line':
			this.nBeats = 4;
			this.noteLength = 'eighth';
			break;
		case 'random':
			this.nBeats = 4;
			this.noteLength = 'sixteenthTriplet';
			break;
	}
	// this.loopIndex = 0;
};

Sequence.prototype.loop = function () {
	var self = this,
	    newActiveSequenceTopic = __WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].topicMap.newActiveSequence;

	this.currentBeat = __WEBPACK_IMPORTED_MODULE_0__webaudio_js__["a" /* webAudio */].getCurrentBeat();
	this.shouldLoop = true;
	this.loopIndex = 0;

	//	mark that a new active sequence has begun

	__WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].publish(newActiveSequenceTopic, {
		sequenceId: this.id,
		sequenceSetId: this.sequenceSet.id
	});

	var looper = function looper() {

		if (!self.shouldLoop) return;

		var currentBeat = __WEBPACK_IMPORTED_MODULE_0__webaudio_js__["a" /* webAudio */].getCurrentBeat(),
		    nBeats = self.nBeats,
		    loopIndex = self.loopIndex,
		    filename = self.filename,
		    noteLength = self.noteLength,
		    shape = self.shape,
		    points = void 0,
		    newNotesReadyTopic = __WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].topicMap.newNoteTimesReady;

		if (shape !== undefined) {
			// points = shape.vertices.copyPoints(shape.points)
			points = shape.points;
			if (shape.identity === 'rectangle') {
				points = [points[loopIndex]];
			}
		}

		//	unless we've reached the next beat, do not proceed

		if (currentBeat === self.currentBeat) {
			window.requestAnimationFrame(looper);
			return;
		}

		//	Only calculate properties if we're the active sequence

		// if (this.isActive) {

		// }

		//	otherwise, schedule the appropriate number of notes associated with the
		//	current beat, and return the scheduled note times

		if (shape !== undefined) {
			var schedule = __WEBPACK_IMPORTED_MODULE_0__webaudio_js__["a" /* webAudio */].schedulePlay(filename, { noteLength: noteLength, sequence: self }),
			    currentTime = __WEBPACK_IMPORTED_MODULE_0__webaudio_js__["a" /* webAudio */].context.currentTime;
			//	mark self new note times are available
			__WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].publish(newNotesReadyTopic, {
				sequenceId: self.id,
				sequenceSetId: self.sequenceSet.id,
				noteTimes: schedule.noteTimes,
				noteDuration: schedule.noteDuration,
				currentTime: currentTime,
				loopIndex: loopIndex,
				shape: shape,
				points: points
			});
		}

		//	mark the updated currentBeat

		self.currentBeat = currentBeat;

		//	if we're on the last beat of the sequence,
		//	quit out of the looping function, and alert the parent
		//	self it should move to the next sequence

		if (loopIndex === nBeats - 1) {
			__WEBPACK_IMPORTED_MODULE_1__eventbus_js__["a" /* eventBus */].publish('endOfSequence', {}, self.sequenceSet.id);
			return;
		}

		//	otherwise, proceed to the next beat

		self.loopIndex++;

		window.requestAnimationFrame(looper);
	};

	looper();
};



/***/ }),

/***/ 49:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return SequenceSet; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__eventbus_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__webaudio_js__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__util_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__sequence_js__ = __webpack_require__(48);





function SequenceSet() {
	this.sequences = [];
	this.activeSequenceIndex = undefined;
	this.activeSequenceId = undefined;
	this.id = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].randId();
	this.subscribe();
}

SequenceSet.prototype.constructor = SequenceSet;

SequenceSet.prototype.subscribe = function () {
	var topicNextSequence = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.endOfSequence;
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(topicNextSequence, this.nextSequence.bind(this), this.id);
};

SequenceSet.prototype.cancelLoop = function () {
	if (this.sequences.length === 0) return;
	this.sequences[this.activeSequenceIndex].shouldLoop = false;
};

SequenceSet.prototype.loop = function () {
	if (this.sequences.length === 0) return;
	var currentSequence = this.sequences[this.activeSequenceIndex];
	this.activeSequenceId = currentSequence.id;
	currentSequence.loop();
};

SequenceSet.prototype.nextSequence = function () {
	if (this.activeSequenceIndex === this.sequences.length - 1) {
		this.activeSequenceIndex = 0;
	} else {
		this.activeSequenceIndex++;
	}
	this.loop();
};

SequenceSet.prototype.createSequence = function (filename) {
	var sequence = new __WEBPACK_IMPORTED_MODULE_3__sequence_js__["a" /* Sequence */](this, filename),
	    setId = this.id;
	this.sequences.push(sequence);
	if (this.sequences.length === 1) {
		this.activeSequenceIndex = 0;
		this.activeSequenceId = sequence.id;
	}
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].publish(__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newSequenceCreated, {
		sequenceId: sequence.id,
		sequenceSetId: setId
	});
};



/***/ }),

/***/ 50:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return SequenceSets; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__eventbus_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__sequenceset_js__ = __webpack_require__(49);



function SequenceSets() {
	this.sequenceSets = [];
}

SequenceSets.prototype.constructor = SequenceSets;

SequenceSets.prototype.createSet = function (filename) {
	var set = new __WEBPACK_IMPORTED_MODULE_1__sequenceset_js__["a" /* SequenceSet */](filename),
	    newSequenceSetTopicName = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newSequenceSetCreated;
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].publish(newSequenceSetTopicName, { sequenceSetId: set.id });
	this.sequenceSets.push(set);
	return set;
};

SequenceSets.prototype.loop = function () {
	for (var i = 0; i < this.sequenceSets.length; i++) {
		this.sequenceSets[i].loop();
	}
};

SequenceSets.prototype.cancelLoop = function () {
	for (var i = 0; i < this.sequenceSets.length; i++) {
		this.sequenceSets[i].cancelLoop();
	}
};



/***/ }),

/***/ 51:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Detector; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__vertices_js__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__shape_js__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__util_js__ = __webpack_require__(3);




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
	};
	this.estimatedVertices = {
		rectangle: [],
		circle: [],
		triangle: [],
		line: []
	};
	this.identity = undefined;
}

Detector.prototype.constructor = Detector;

/*
	UPDATE ESTIMATED VERTICES
*/

Detector.prototype.updateEstimatedVertices = function () {
	this.estimatedVertices.rectangle = this.getEstimatedRectVertices();
	this.estimatedVertices.triangle = this.getEstimatedTriangleVertices();
	this.estimatedVertices.circle = this.getEstimatedCircleVertices();
	this.estimatedVertices.line = this.getEstimatedLineVertices();
};

/*
	ESTIMATE VERTICES
*/

Detector.prototype.getEstimatedTriangleVertices = function () {
	var verts = this.vertices.hull,
	    points = verts.points,
	    inds = [];
	for (var i = 0; i < points.length; i++) {
		inds.push(i);
	}var area = -Infinity,
	    largestSet;
	inds = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].combs(inds, 3);
	for (var i = 0; i < inds.length; i++) {
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
	return largestSet;
};

Detector.prototype.getEstimatedRectVertices = function () {

	var verts = this.vertices.hull,
	    points = verts.points,
	    centroid = verts.centroid,
	    topLeftPts = points.filter(topLeftFunc),
	    topRightPts = points.filter(topRightFunc),
	    btmLeftPts = points.filter(btmLeftFunc),
	    btmRightPts = points.filter(btmRightFunc),
	    nTopLeft = topLeftPts.length,
	    nTopRight = topRightPts.length,
	    nBtmLeft = btmLeftPts.length,
	    nBtmRight = btmRightPts.length;

	if (nTopLeft === 0 || nTopRight === 0 || nBtmLeft === 0 || nBtmRight === 0) {
		return [];
	}

	var topLeftDistances = verts.getDistances(centroid, topLeftPts),
	    topRightDistances = verts.getDistances(centroid, topRightPts),
	    btmLeftDistances = verts.getDistances(centroid, btmLeftPts),
	    btmRightDistances = verts.getDistances(centroid, btmRightPts);

	var topLeftInd = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].findMax(topLeftDistances),
	    topRightInd = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].findMax(topRightDistances),
	    btmLeftInd = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].findMax(btmLeftDistances),
	    btmRightInd = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].findMax(btmRightDistances);

	var topLeftPt = topLeftPts[topLeftInd],
	    topRightPt = topRightPts[topRightInd],
	    btmLeftPt = btmLeftPts[btmLeftInd],
	    btmRightPt = btmRightPts[btmRightInd];

	return [topLeftPt, topRightPt, btmLeftPt, btmRightPt];

	function topLeftFunc(pt) {
		return pt.x < centroid.x && pt.y > centroid.y;
	}
	function topRightFunc(pt) {
		return pt.x > centroid.x && pt.y > centroid.y;
	}
	function btmLeftFunc(pt) {
		return pt.x < centroid.x && pt.y < centroid.y;
	}
	function btmRightFunc(pt) {
		return pt.x > centroid.x && pt.y < centroid.y;
	}
};

Detector.prototype.getEstimatedCircleVertices = function () {
	var verts = this.vertices,
	    points = verts.hull.points,
	    centroid = verts.hull.centroid,
	    distances = verts.getDistances(centroid, points),
	    summed = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].sum(distances),
	    N = distances.length,
	    mean = summed / N;

	var radius = new __WEBPACK_IMPORTED_MODULE_0__vertices_js__["a" /* Point */](centroid.x, centroid.y + mean, 0);

	return [centroid, radius];
};

Detector.prototype.getEstimatedLineVertices = function () {
	var N = this.vertices.points.length;
	return [this.vertices.points[0], this.vertices.points[N - 1]];
};

/*
	ASSESS SHAPE LIKELIHOOD
*/

Detector.prototype.getLikelihoodRect = function () {
	var rectVertices = this.estimatedVertices.rectangle;

	if (rectVertices.length === 0) return 0;

	var hull = this.vertices.hull,
	    topLeftPt = rectVertices[0],
	    topRightPt = rectVertices[1],
	    btmLeftPt = rectVertices[2],
	    btmRightPt = rectVertices[3],
	    centroid = hull.centroid;

	var axis1Ratio = getSlopeRatio(topLeftPt, btmRightPt, centroid),
	    axis2Ratio = getSlopeRatio(btmLeftPt, topRightPt, centroid),
	    threshold = this.criteria.rectangle.axisRatioThreshold;

	return Math.max(axis1Ratio, axis2Ratio);

	function getSlopeRatio(p0, p1, centroid) {
		var slopeA = hull.getSlope(p0, centroid),
		    slopeB = hull.getSlope(p1, centroid),
		    slopeAB = hull.getSlope(p0, p1),
		    ratio = slopeA / slopeAB * (slopeB / slopeAB);
		return ratio;
	}
};

Detector.prototype.getLikelihoodCircle = function () {
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
};

Detector.prototype.getLikelihoodTriangle = function () {
	var triangleVertices = this.estimatedVertices.triangle,
	    area = this.vertices.hull.area;
	if (triangleVertices === undefined) return Infinity;
	return area / Math.abs(this.vertices.getArea(triangleVertices));
};

Detector.prototype.getLikelihoodLine = function () {
	var verts = this.vertices,
	    points = verts.points,
	    pFirst = points[0],
	    pLast = points[points.length - 1],
	    perpDistanceRatios = [],
	    distances = [],
	    lastDistance = verts.getDistance(pFirst, pLast),
	    pDistance;
	for (var i = 1; i < points.length - 2; i++) {
		pDistance = verts.getPerpendicularDistance(points[i], pFirst, pLast);
		perpDistanceRatios.push(pDistance / lastDistance);
	}
	for (var i = 0; i < points.length - 2; i++) {
		distances.push(verts.getDistance(points[i], points[i + 1]));
	}
	var summed = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].sum(distances),
	    distRatio = lastDistance / summed,
	    maxPerpRatio = Math.max.apply(Math, perpDistanceRatios);

	return {
		distanceRatio: distRatio,
		perpDistanceRatio: maxPerpRatio
	};
};

Detector.prototype.getLikelihoodRandom = function () {
	return this.vertices.perimeterEfficiency;
};

/*
	ASSIGN SHAPE IDENTITY
*/

Detector.prototype.isRectangle = function () {
	var estimate = this.getLikelihoodRect(),
	    thresh = this.criteria.rectangle.axisRatioThreshold;
	return Math.abs(estimate - 1) < thresh;
};

Detector.prototype.isCircle = function () {
	var estimate = this.getLikelihoodCircle(),
	    thresh = this.criteria.circle.globalThreshold;
	return estimate > thresh;
};

Detector.prototype.isTriangle = function () {
	var estimate = this.getLikelihoodTriangle(),
	    thresh = this.criteria.triangle.globalThreshold;
	return estimate < thresh;
};

Detector.prototype.isLine = function () {
	var estimates = this.getLikelihoodLine(),
	    distanceRatio = estimates.distanceRatio,
	    perpRatio = estimates.perpDistanceRatio,
	    distanceThresh = this.criteria.line.distanceThreshold,
	    perpDistanceThresh = this.criteria.line.perpDistanceThreshold;

	return distanceRatio - 1 < distanceThresh && perpRatio < perpDistanceThresh;
};

Detector.prototype.isRandom = function () {
	var estimate = this.getLikelihoodRandom(),
	    thresh = this.criteria.random.globalThreshold;

	return estimate < thresh;
};

/*
	MODIFY VERTICES
*/

Detector.prototype.getAdjustedRectVertices = function () {
	var rectPoints = this.estimatedVertices.rectangle,
	    rectVerts = new __WEBPACK_IMPORTED_MODULE_0__vertices_js__["b" /* Vertices */](rectPoints),
	    points = rectVerts._sortPointsByPolarAngle();
	points.unshift(rectVerts.anchorPoint);
	rectVerts.points = points;
	rectVerts.updateAllExceptHull();
	points.push(points[0]);
	var distances = rectVerts.getConsecutiveDistances(points),
	    L = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].mean(distances),
	    centroid = rectVerts.centroid,
	    midPoint = new __WEBPACK_IMPORTED_MODULE_0__vertices_js__["a" /* Point */](L / 2, L / 2, 0),
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

	var recombinedVerts = new __WEBPACK_IMPORTED_MODULE_0__vertices_js__["b" /* Vertices */]([A, B, C, D]);
	recombinedVerts.updateAll();
	return recombinedVerts;
};

Detector.prototype.getAdjustedTriangleVertices = function () {
	var verts = this.vertices,
	    triPoints = this.estimatedVertices.triangle,
	    centroid = verts.hull.centroid,
	    distances = verts.getDistances(centroid, triPoints),
	    meanDist = __WEBPACK_IMPORTED_MODULE_2__util_js__["a" /* Util */].mean(distances) * .9,
	    newVerts = [];

	for (var i = 0; i < 3; i++) {
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
	var vertices = new __WEBPACK_IMPORTED_MODULE_0__vertices_js__["b" /* Vertices */](newVerts);
	vertices.updateAll();
	return vertices;
};

/*
	GET DETECTED SHAPE
*/

Detector.prototype.getLine = function () {
	return new __WEBPACK_IMPORTED_MODULE_1__shape_js__["a" /* Line */](this.vertices);
};

Detector.prototype.getRectangle = function () {
	var verts = this.getAdjustedRectVertices();
	return new __WEBPACK_IMPORTED_MODULE_1__shape_js__["b" /* Shape */](verts, 'rectangle');
};

Detector.prototype.getTriangle = function () {
	var verts = this.getAdjustedTriangleVertices();
	return new __WEBPACK_IMPORTED_MODULE_1__shape_js__["b" /* Shape */](verts, 'triangle');
};

Detector.prototype.getCircle = function () {
	var verts = this.vertices,
	    estimatedVertices = this.estimatedVertices.circle,
	    center = estimatedVertices[0],
	    radius = estimatedVertices[1].y - center.y;
	return new __WEBPACK_IMPORTED_MODULE_1__shape_js__["c" /* Circle */](verts, center, radius);
};

Detector.prototype.getRandom = function () {
	return new __WEBPACK_IMPORTED_MODULE_1__shape_js__["b" /* Shape */](this.vertices, 'random');
};

Detector.prototype.getDetectedShape = function () {
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
};

/*
	IDENTIFY
*/

Detector.prototype.identify = function () {
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
};



/***/ }),

/***/ 52:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return Interaction; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__util_js__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__geometry_detector_js__ = __webpack_require__(51);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__geometry_shape_js__ = __webpack_require__(26);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__geometry_vertices_js__ = __webpack_require__(16);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__eventbus_js__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_interact_js__ = __webpack_require__(96);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5_interact_js___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_5_interact_js__);







function Interaction(world, animator) {
	this.world = world;
	this.animator = animator;
}

Interaction.prototype.constructor = Interaction;

Interaction.prototype.handleTouch = function () {

	var self = this,
	    position = void 0,
	    stroke = [],
	    shouldContinue = true,
	    shape = void 0,
	    vertex = void 0,
	    animator = this.animator,
	    element = animator.canvas,
	    sequenceIdCurrent = void 0,
	    sequenceIdOnDown = void 0,
	    bounds = animator.style.editedVertices.size;

	animator.isRecording = false;

	__WEBPACK_IMPORTED_MODULE_5_interact_js___default()(element).on('down', down).on('up', up).on('move', move);

	function move(e) {
		position = { x: e.clientX, y: e.clientY };
	}
	function down(e) {
		shouldContinue = true;
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
		var pt = new __WEBPACK_IMPORTED_MODULE_3__geometry_vertices_js__["a" /* Point */](position.x, position.y, 0);
		shape.centerOn(pt);
		shape.update();
		requestAnimationFrame(modifyCenter);
	}
};

Interaction.prototype.publishNewShape = function (shape) {
	var sequenceId = this.world.editedSequenceId,
	    sequenceSetId = this.world.activeSequenceSetId,
	    newShapeTopic = __WEBPACK_IMPORTED_MODULE_4__eventbus_js__["a" /* eventBus */].topicMap.newShapeReady;
	__WEBPACK_IMPORTED_MODULE_4__eventbus_js__["a" /* eventBus */].publish(newShapeTopic, { shape: shape, sequenceId: sequenceId, sequenceSetId: sequenceSetId });
};

Interaction.prototype.handleNewStroke = function (stroke) {
	stroke = __WEBPACK_IMPORTED_MODULE_0__util_js__["a" /* Util */].unique(__WEBPACK_IMPORTED_MODULE_0__util_js__["a" /* Util */].resample(stroke, 256));
	var verts = new __WEBPACK_IMPORTED_MODULE_3__geometry_vertices_js__["b" /* Vertices */](stroke);
	verts.updateAll();
	var detector = new __WEBPACK_IMPORTED_MODULE_1__geometry_detector_js__["a" /* Detector */](verts);
	detector.updateEstimatedVertices();
	detector.identify();
	var shape = detector.getDetectedShape();
	this.publishNewShape(shape);
	// 	sequenceId = this.world.editedSequenceId,
	// 	sequenceSetId = this.world.activeSequenceSetId,
	// 	newShapeTopic = eventBus.topicMap.newShapeReady;
	// eventBus.publish(newShapeTopic, {shape, sequenceId, sequenceSetId});
};



/***/ }),

/***/ 53:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_vue__ = __webpack_require__(25);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__App__ = __webpack_require__(43);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__App___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__App__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__router__ = __webpack_require__(42);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__playground_circle_detect_stroke_record3_js__ = __webpack_require__(44);
// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.





__WEBPACK_IMPORTED_MODULE_0_vue__["a" /* default */].config.productionTip = false;

/* eslint-disable no-new */
new __WEBPACK_IMPORTED_MODULE_0_vue__["a" /* default */]({
  el: '#app',
  router: __WEBPACK_IMPORTED_MODULE_2__router__["a" /* default */],
  template: '<App/>',
  components: { App: __WEBPACK_IMPORTED_MODULE_1__App___default.a }
});

/***/ }),

/***/ 54:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return world; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__eventbus_js__ = __webpack_require__(2);


function World() {
	this.shapes = [];
	this.subscribe();
	this.editedSequenceId = undefined;
	this.activeSequenceIds = [];
	this.activeSequenceSetId = undefined;
}

World.prototype.constructor = World;

World.prototype.subscribe = function () {
	var newShapeReadyTopic = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newShapeReady,
	    newSequenceSetCreatedTopic = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newSequenceSetCreated,
	    newSequenceCreatedTopic = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newSequenceCreated,
	    newActiveSequenceTopic = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newActiveSequence,
	    newActiveSequenceSetTopic = __WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].topicMap.newActiveSequenceSet;

	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(newSequenceSetCreatedTopic, this.registerSequenceSet.bind(this));
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(newSequenceCreatedTopic, this.registerSequence.bind(this));
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(newShapeReadyTopic, this.registerShape.bind(this));
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(newActiveSequenceTopic, this.updateActiveSequence.bind(this));
	__WEBPACK_IMPORTED_MODULE_0__eventbus_js__["a" /* eventBus */].subscribe(newActiveSequenceSetTopic, this.updateActiveSequenceSet.bind(this));
};

World.prototype.updateEditedSequence = function () {
	var index = this.findActiveSequenceIdBySequenceSetId(this.activeSequenceSetId);
	this.editedSequenceId = this.activeSequenceIds[index].sequenceId;
};

World.prototype.updateActiveSequence = function (data) {
	var sequenceSetId = data.sequenceSetId,
	    setId = data.sequenceId,
	    index = this.findActiveSequenceIdBySequenceSetId(sequenceSetId);
	this.activeSequenceIds[index].sequenceId = setId;
	this.updateEditedSequence();
};

World.prototype.updateActiveSequenceSet = function (data) {
	this.activeSequenceSetId = data.sequenceSetId;
	this.updateEditedSequence();
};

World.prototype.registerSequenceSet = function (data) {
	this.activeSequenceIds.push({
		sequenceSetId: data.sequenceSetId,
		sequenceId: undefined
	});
};

World.prototype.registerSequence = function (data) {
	data.shape = undefined;
	this.registerShape(data);
};

World.prototype.registerShape = function (data) {
	var shape = data.shape,
	    sequenceId = data.sequenceId,
	    sequenceSetId = data.sequenceSetId;
	if (this.isShapeWithSequenceId(sequenceId)) {
		var ind = this.findShapeBySequenceId(sequenceId);
		this.shapes[ind].shape = shape;
	} else {
		this.shapes.push({
			shape: shape,
			sequenceId: sequenceId,
			sequenceSetId: sequenceSetId
		});
	}
};

World.prototype.findActiveSequenceIdBySequenceSetId = function (id) {
	for (var i = 0; i < this.activeSequenceIds.length; i++) {
		if (this.activeSequenceIds[i].sequenceSetId === id) return i;
	}
	return -1;
};

World.prototype.getShapesBySequenceSetId = function (id) {
	return this.shapes.filter(function (shape) {
		return shape.sequenceSetId === id;
	}).shape;
};

World.prototype.getShapeBySequenceId = function (id) {
	var ind = this.findShapeBySequenceId(id);
	if (ind === -1) return undefined;
	return this.shapes[ind].shape;
};

World.prototype.getEditedShape = function () {
	return this.getShapeBySequenceId(this.editedSequenceId);
};

World.prototype.findShapeBySequenceId = function (id) {
	for (var i = 0; i < this.shapes.length; i++) {
		if (this.shapes[i].sequenceId === id) return i;
	}
	return -1;
};

World.prototype.isShapeWithSequenceId = function (id) {
	return this.findShapeBySequenceId(id) !== -1;
};

var world = new World();



/***/ }),

/***/ 9:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return webAudio; });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_assign__ = __webpack_require__(55);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_assign___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_assign__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_babel_runtime_core_js_promise__ = __webpack_require__(57);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_babel_runtime_core_js_promise___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_babel_runtime_core_js_promise__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__util_js__ = __webpack_require__(3);




/*
	constructor
*/

function WebAudio(properties) {
	this.bpm = properties.bpm;

	this.interval = 60 / this.bpm;

	this.currentBeat = 1;

	//	initialize the AudioContext, or return -1
	//	if initialization fails

	this.context = this.initContext();

	//	array of buffer objects with <buffer> and <filename>
	//	properties

	this.buffers = [];
	this.filenames = properties.filenames;

	//	define default playing properties

	this.defaultPlayProperties = {
		audible: true,
		pitch: { min: 0, max: 0 }

		//	make sure the object was instantiated correctly

	};this.validate();

	//	for proper safari playback

	this.playedDummySound = false;
}

/*
	prototype
*/

WebAudio.prototype.constructor = WebAudio;

//	initialize the audio context, or return -1 if init fails

WebAudio.prototype.initContext = function () {
	var audioContext = window.AudioContext || window.webkitAudioContext || -1;
	if (audioContext === -1) return audioContext;
	return new audioContext();
};

//	make sure we can properly instantiate a new WebAudio

WebAudio.prototype.validate = function () {
	//	make sure we have window.requestAnimationFrame
	if (typeof window.requestAnimationFrame == 'undefined') {
		throw new Error('requestAnimationFrame is not supported in this browser');
	}
	//	make sure the audio context is valid
	if (this.context === -1) {
		throw new Error('Web audio is not supported in this browser');
	}
};

WebAudio.prototype.loadTestSounds = function () {
	var filenames = this.filenames,
	    that = this,
	    buffers = this.buffers;
	filenames.map(function (name) {
		var fullfile = 'https://dl.dropboxusercontent.com/s/mt0s5oj4tx1lre2/' + name,
		    request = new XMLHttpRequest();
		request.open('GET', fullfile, true);
		request.responseType = 'arraybuffer';
		request.onload = function () {
			that.context.decodeAudioData(request.response, function (buffer) {
				buffers.push({
					filename: name,
					buffer: buffer
				});
			});
		};
		request.send();
	});
};

WebAudio.prototype.loadSound = function (filename) {

	//	return a promise to load the given <filename>

	var that = this;

	return new __WEBPACK_IMPORTED_MODULE_1_babel_runtime_core_js_promise___default.a(function (resolve, reject) {
		var request = new XMLHttpRequest(),
		    fullfile = '/sounds/' + filename;

		request.open('GET', fullfile);
		request.responseType = 'arraybuffer';

		request.onload = function () {
			that.context.decodeAudioData(request.response, function (buffer) {
				resolve(buffer);
			});
		};

		request.onerror = function (err) {
			reject(err);
		};

		request.send();
	});
};

WebAudio.prototype.loadSounds = function () {

	//	given the array of stored filenames in <this>,
	//	resolve each promise to load the corresponding buffer, and
	//	push each buffer to the <buffers> array in <this>

	var promises = [],
	    buffers = this.buffers,
	    filenames = this.filenames,
	    that = this;

	filenames.map(function (file) {
		promises.push(that.loadSound(file));
	});

	var promise = __WEBPACK_IMPORTED_MODULE_1_babel_runtime_core_js_promise___default.a.all(promises).then(function (sounds) {
		for (var i = 0; i < sounds.length; i++) {
			buffers.push({
				filename: filenames[i],
				buffer: sounds[i]
			});
		}
	}).catch(function (err) {
		console.log('An error occurred while loading sounds');
	});

	return promise;
};

//	from the array of buffer objects in this.buffers,
//	return the buffer that matches <filename>

WebAudio.prototype.getBufferByFilename = function (filename) {
	var oneBuffer = this.buffers.filter(function (buffer) {
		return buffer.filename === filename;
	});
	if (oneBuffer.length === 0) return -1;
	if (oneBuffer.length > 1) {
		throw new Error('More than one buffer found for' + filename);
	}
	return oneBuffer[0].buffer;
};

WebAudio.prototype.getCurrentBeat = function () {
	var totalElapsedTime = this.context.currentTime,
	    interval = this.interval;
	return Math.floor(totalElapsedTime / interval);
};

//	schedule the playing of N number of notes, where N corresponds
//	to the note length specified in <props.noteLength>

WebAudio.prototype.schedulePlay = function (filename, props) {
	var interval = this.interval,
	    currentBeat = this.getCurrentBeat(),
	    noteLength = props.noteLength,
	    scheduledTime = void 0,
	    beatsToSchedule = void 0,
	    duration = void 0,
	    scheduledTimes = [];

	switch (noteLength) {
		case 'quarter':
			beatsToSchedule = 1;
			break;
		case 'eighth':
			beatsToSchedule = 2;
			break;
		case 'eighthTriplet':
			beatsToSchedule = 3;
			break;
		case 'sixteenth':
			beatsToSchedule = 4;
			break;
		case 'sixteenthTriplet':
			beatsToSchedule = 6;
			break;
		default:
			throw new Error('Unrecognized noteLength ' + noteLength);
	}

	//	first scheduled time

	scheduledTime = currentBeat * interval + interval / beatsToSchedule;

	//	note length

	duration = interval / beatsToSchedule;

	//	update the current beat

	this.currentBeat = currentBeat;

	props.sequence.sources = [];

	for (var i = 0; i < beatsToSchedule; i++) {
		var playTime = scheduledTime + interval / beatsToSchedule * i,
		    playProps = __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_assign___default()(props, { when: playTime });

		//	play each note at time <playTime>

		this.play(filename, playProps);

		//	for output

		scheduledTimes.push(playTime);
	}

	return { noteTimes: scheduledTimes, noteDuration: duration };
};

WebAudio.prototype.play = function (filename, props) {
	var source = this.context.createBufferSource(),
	    buffer = this.getBufferByFilename(filename),
	    defaultPlayProperties = this.defaultPlayProperties,
	    when = props.when || 0;

	if (buffer === -1) throw new Error('Could not find ' + filename);

	props = __WEBPACK_IMPORTED_MODULE_0_babel_runtime_core_js_object_assign___default()({}, defaultPlayProperties, props);

	props.sequence.sources.push(source);

	//	if this set of beats is set to be silent, return

	if (!props.audible) return;

	source.buffer = buffer;
	source.connect(this.context.destination);
	source.start(when);
};

WebAudio.prototype.playDummySound = function () {
	if (this.playedDummySound) return;

	var buffer = this.context.createBuffer(1, 22050, 44100),
	    source = this.context.createBufferSource();

	source.buffer = buffer;
	source.connect(this.context.destination);
	source.start(0);

	this.playedDummySound = true;
};

/*
	instantiate
*/

var webAudio = new WebAudio({
	bpm: 85, filenames: ['downychirp.wav']
});
webAudio.loadTestSounds();
webAudio.playDummySound();

// const webAudio = new WebAudio({
// 	bpm: 85, filenames: ['808_hi.mp3', 'perc_kick.mp3', 'piano_g.mp3', 'celeste_g.mp3']
// })



/***/ }),

/***/ 94:
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),

/***/ 95:
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),

/***/ 97:
/***/ (function(module, exports, __webpack_require__) {

function injectStyle (ssrContext) {
  __webpack_require__(94)
}
var Component = __webpack_require__(41)(
  /* script */
  __webpack_require__(46),
  /* template */
  __webpack_require__(98),
  /* styles */
  injectStyle,
  /* scopeId */
  "data-v-2d560100",
  /* moduleIdentifier (server only) */
  null
)

module.exports = Component.exports


/***/ }),

/***/ 98:
/***/ (function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    staticClass: "hello"
  }, [_c('h1', [_vm._v(_vm._s(_vm.msg))]), _vm._v(" "), _c('h2', [_vm._v("Essential Links")]), _vm._v(" "), _vm._m(0), _vm._v(" "), _c('h2', [_vm._v("Ecosystem")]), _vm._v(" "), _vm._m(1)])
},staticRenderFns: [function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('ul', [_c('li', [_c('a', {
    attrs: {
      "href": "https://vuejs.org",
      "target": "_blank"
    }
  }, [_vm._v("Core Docs")])]), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "https://forum.vuejs.org",
      "target": "_blank"
    }
  }, [_vm._v("Forum")])]), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "https://gitter.im/vuejs/vue",
      "target": "_blank"
    }
  }, [_vm._v("Gitter Chat")])]), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "https://twitter.com/vuejs",
      "target": "_blank"
    }
  }, [_vm._v("Twitter")])]), _vm._v(" "), _c('br'), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "http://vuejs-templates.github.io/webpack/",
      "target": "_blank"
    }
  }, [_vm._v("Docs for This Template")])])])
},function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('ul', [_c('li', [_c('a', {
    attrs: {
      "href": "http://router.vuejs.org/",
      "target": "_blank"
    }
  }, [_vm._v("vue-router")])]), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "http://vuex.vuejs.org/",
      "target": "_blank"
    }
  }, [_vm._v("vuex")])]), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "http://vue-loader.vuejs.org/",
      "target": "_blank"
    }
  }, [_vm._v("vue-loader")])]), _vm._v(" "), _c('li', [_c('a', {
    attrs: {
      "href": "https://github.com/vuejs/awesome-vue",
      "target": "_blank"
    }
  }, [_vm._v("awesome-vue")])])])
}]}

/***/ }),

/***/ 99:
/***/ (function(module, exports) {

module.exports={render:function (){var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;
  return _c('div', {
    attrs: {
      "id": "app"
    }
  })
},staticRenderFns: []}

/***/ })

},[53]);
//# sourceMappingURL=app.835c8fb2cafd7afdd3e4.js.map