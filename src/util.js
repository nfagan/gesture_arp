var Util = {};

Util.contains = function(arr, val) {
	for (var i=0; i<arr.length; i++) {
		if (arr[i] === val) return true;
	}
	return false;
}

Util.unique = function(arr) {
	var newArr = [arr[0]];
	for (var i=1; i<arr.length; i++) {
		if (this.contains(newArr, arr[i])) continue;
		newArr.push(arr[i]);
	}
	return newArr;
}

Util.resample = function(arr, N) {
	if (arr.length <= N) return arr;
	var factor = Math.ceil(arr.length / N),
		resampled = [],
		stp = 0;
	while (stp < arr.length) {
		resampled.push(arr[stp]);
		stp += factor;
	}
	return resampled;
}

Util.findMin = function(arr) {
	var ind = -1,
		minimum = Infinity;
	for (var i=0; i<arr.length; i++) {
		if (arr[i] < minimum) {
			ind = i;
			minimum = arr[i];
		}
	}
	return ind;
}

Util.findMax = function(arr) {
	var ind = -1,
		maximum = -Infinity;
	for (var i=0; i<arr.length; i++) {
		if (arr[i] > maximum) {
			ind = i;
			maximum = arr[i];
		}
	}
	return ind;
}

Util.sum = function(arr) {
	var cumulative = 0;
	for (var i=0; i<arr.length; i++) {
		cumulative += arr[i];
	}
	return cumulative;
}

Util.mean = function(arr) {
	return this.sum(arr) / arr.length;
}

Util.combs = function(arr, N) {
	var output = [];
	getAllPossibleCombinations(arr, N, output);
	return output;
	function getCombinations(array, size, start, initialStuff, output) {
	    if (initialStuff.length >= size) {
	        output.push(initialStuff);
	    } else {
	        var i;
	        for (i=start; i<array.length; ++i) {
		    	getCombinations(array, size, i + 1, initialStuff.concat(array[i]), output);
	        }
	    }
	}
	function getAllPossibleCombinations(array, size, output) {
	    getCombinations(array, size, 0, [], output);
	}
}

Util.logicalKeep = function(arr, ind) {
	var newArr = [];
	for (var i=0; i<arr.length; i++) {
		if (!ind[i]) continue;
		newArr.push(arr[i]);
	}
	return newArr;
}

Util.randId = function(append) {
	let id = Math.random().toString(36).substring(7);
	if (append == null) return id;
	return append + id;
}

Util.indexOf = function(arr, val) {
	for (let i=0; i<arr.length; i++) {
		if (arr[i] === val) return i;
	}
	return -1;
}

export { Util };