const canvasPoints = [];
const canvasPoint_Colors = [];

const modes = ["BROKEN", "ALIGN", "MIRROR"];
let MODE = modes[0];

const canvasModes = ["draw", "move"];
let CANVASMODE = canvasModes[0];
let POINT_INDEX = -1;

const plotLayout = {
	showlegend: false,
  xaxis: { showticklabels: false },
  yaxis: { showticklabels: false },
  autosize: true,
  margin: {
  l: 10,
  r: 10,
  b: 10,
  t: 50,
  pad: 4
},
}

const plotConfig = {
	responsive: true,
	modeBarButtonsToRemove: ['hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines'],
	toImageButtonOptions: {
    format: 'svg', // one of png, svg, jpeg, webp
  }
}

const velocityData = [];
const velocityLayout = {
	...plotLayout,
	title: "Velocity"
}

const accelerationData = [];
const accelerationLayout = {
	...plotLayout,
	title: "Acceleration"
}

function init_view(){
  // Resize canvas when window is resized.
  window.addEventListener('resize', resizeCanvas);
  // Set canvas size for the first time.
  resizeCanvas();

	document.getElementById("broken").style.background = "#0da2f7";
	document.getElementById("aligned").style.background = "initial";
	document.getElementById("mirrored").style.background = "initial";

	Plotly.newPlot("velocityPlot", velocityData, velocityLayout, plotConfig);
	Plotly.newPlot("accelerationPlot", accelerationData, accelerationLayout, plotConfig);
}

// Runs each time the DOM window resize event fires.
function resizeCanvas() {
	plotCanvas = document.getElementById("plotCanvas");
	plotCanvasContainer = document.getElementById("plotCanvasContainer");
  plotCanvas.width = plotCanvasContainer.clientWidth;
  plotCanvas.height = plotCanvasContainer.clientHeight;
  draw_tangents();
}


/*
BUTTON CALLBACKS
*/

/*switch between drawing and moving points */
function switchCanvasMode() {
	var b = document.getElementById("canvas-mode");
	var cv = document.getElementById("plotCanvas");
	if (CANVASMODE == "draw") {
		CANVASMODE = canvasModes[1];
		// change canvas on click to moving points
		cv.onclick = findPoint;
		cv.onmousemove = movePoint;
		// change button text
		b.textContent = "switch to adding points";
	} else if (CANVASMODE == "move") {
		CANVASMODE = canvasModes[0];
		// change canvas on click to drawing points
		cv.onclick = getPoint;
		cv.onmousemove = '';
		// change button text
		b.textContent = "switch to moving points";
	}
}

/*clear canvas button*/
function resetCanvas() {
	//empty the points array
	canvasPoints.length = 0;
	velocityData.length = 0;
	accelerationData.length = 0;

	// remove all drawings
	clearCanvas();
}

function clearCanvas() {
	// remove all drawings from the main canvas
	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");
	ctx.clearRect(0, 0, cv.width, cv.height);

	// empty the velocity and acceleration plots
	Plotly.plot("velocityPlot", [], velocityLayout);
	Plotly.plot("accelerationPlot", [], accelerationLayout);
}

/*broken continuity button*/
function brokenContinuity() {
	MODE = modes[0];
	document.getElementById("broken").style.background = "#0da2f7";
	document.getElementById("aligned").style.background = "initial";
	document.getElementById("mirrored").style.background = "initial";
}

/*align continuity button*/
function alignContinuity() {
	MODE = modes[1];
	document.getElementById("broken").style.background = "initial";
	document.getElementById("aligned").style.background = "#0da2f7";
	document.getElementById("mirrored").style.background = "initial";

	calc_aligned_tangents();
	draw_tangents();
	updatePlots();
}

/*mirror continuity button*/
function mirrorContinuity() {
	MODE = modes[2];
	document.getElementById("broken").style.background = "initial";
	document.getElementById("aligned").style.background = "initial";
	document.getElementById("mirrored").style.background = "#0da2f7";

	calc_mirrored_tangents();
	draw_tangents();
	updatePlots();
}

/*
CANVAS INTERACTION
*/

/*on mouse down event*/
function findPoint(event) {
	var cv = document.getElementById("plotCanvas");
	let x = event.clientX - cv.getBoundingClientRect().left;
	let y = event.clientY - cv.getBoundingClientRect().top;

	if (POINT_INDEX < 0) {
		// if not currently moving a point: try to find point to move
		for(var i = 0; i < canvasPoints.length; i++) {
			var cvPt = canvasPoints[i];
			if (cvPt[0] <= (x+5) && cvPt[0] >= (x-5)
				&& cvPt[1] <= (y+5) && cvPt[1] >= (y-5)) {
				POINT_INDEX = i;
				break;
			}
		}
	}
	else {
		// currently moving a point, let point go
		POINT_INDEX = -1;
	}

}

/*on mouse move event*/
function movePoint(event) {
	if (POINT_INDEX >= 0) {
		// found a point that can be moved
		var cv = document.getElementById("plotCanvas");
		let x = event.clientX - cv.getBoundingClientRect().left;
		let y = event.clientY - cv.getBoundingClientRect().top;
		canvasPoints[POINT_INDEX] = [x, y];

		// check according to continuity mode
		// if broken, can just move the one point, same if first or last two points
		if (MODE == "ALIGN" && POINT_INDEX > 1 && POINT_INDEX < canvasPoints.length - 2) {
			calc_aligned_tangents();

		} else if (MODE == "MIRROR" && POINT_INDEX > 1 && POINT_INDEX < canvasPoints.length -2) {
			calc_mirrored_tangents();
		}

		// redraw canvas points and Bézier curves
		draw_tangents();
		// update velocity and acceleration points
		updatePlots();
	}
}

/*on click event*/
function getPoint(event) {
	/* 
	add a new point and draw it as well as the bézier curve
	*/
	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");

	let x = event.clientX - cv.getBoundingClientRect().left;
	let y = event.clientY - cv.getBoundingClientRect().top;

	//store point in list for bézier curve
	canvasPoints.push([x,y]);

	drawPoint(ctx, x, y);
	// if enough points: draw bezier curve
	l = canvasPoints.length;
	if(l >= 4 && (l-1) % 3 == 0) {
		//TODO: match trace color to curve
		// TODO: get colors from ColorBrewer
		var color = 'rgb(' + Math.floor(Math.random() * 256).toString() + ', ' + Math.floor(Math.random() * 256).toString() + ', ' + Math.floor(Math.random() * 256).toString() + ')';
		canvasPoint_Colors.push(color, color, color, color);
		brokenContinuity();
		draw_bezier_curve(ctx, canvasPoints[l-2], canvasPoints[l-3], canvasPoints[l-4], canvasPoints[l-1], l-1);
		updatePlots();
	}
}

function drawPoint(ctx, x, y) {
	//draw a point onto the canvas
	ctx.beginPath();
	ctx.arc(x, y, 3, 0, 2*Math.PI);
	ctx.stroke();
}

/*
DRAWING FUNCTIONS
*/

function updatePlots() {
	draw_velocity();
	draw_acceleration();
}

function draw_bezier_curve(ctx, pt1, pt2, pt3, pt4, index) {
	//draw curve
	ctx.lineWidth = 3;
	ctx.moveTo(pt4[0], pt4[1]);
	ctx.strokeStyle = canvasPoint_Colors[index];
	ctx.bezierCurveTo(pt1[0], pt1[1], pt2[0], pt2[1], pt3[0], pt3[1]);
	ctx.stroke();

	//draw splines
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 1;
	ctx.lineTo(pt2[0], pt2[1]);

	ctx.moveTo(pt4[0], pt4[1]);
	ctx.lineTo(pt1[0], pt1[1]);

	ctx.stroke();
}

function draw_tangents() {
	clearCanvas();

	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");

	for (var i = 0; i < canvasPoints.length; i++) {
		drawPoint(ctx, canvasPoints[i][0], canvasPoints[i][1]);
		if (i >= 3 && i % 3 == 0) {
			draw_bezier_curve(ctx, canvasPoints[i-1], canvasPoints[i-2], canvasPoints[i-3], canvasPoints[i], i);
		}
	}

}

function draw_velocity() {
	/*updates the velocity plot based on calc_velocity*/
	velocityData.length = 0;
	for (var i = 3; i <= canvasPoints.length; i+=3) {
		var b = [canvasPoints[i-3], canvasPoints[i-2], canvasPoints[i-1], canvasPoints[i]];
		var velocity = get_velocity_points(b, 3);
		var xData = [];
		var yData = [];
		for (var j = 0; j < velocity.length; j++) {
			xData.push(velocity[j][0]);
			yData.push(velocity[j][1]);
		}
			
		var data = {
			x: xData,
			y: yData,
			mode:"lines",
			line: {
				color: canvasPoint_Colors[i]
			}
		};
		velocityData.push(data);
		Plotly.newPlot("velocityPlot", velocityData, velocityLayout, plotConfig);
	}
}

function draw_acceleration() {
	/*updates the acceleration plot based on calc_acceleration*/
	accelerationData.length = 0;
	for (var i = 3; i <= canvasPoints.length; i+=3) {
		var b = [canvasPoints[i-3], canvasPoints[i-2], canvasPoints[i-1], canvasPoints[i]];
		var acceleration = get_acceleration_points(b, 3);
		var xData = [];
		var yData = [];
		for (var j = 0; j < acceleration.length; j ++) {
			xData.push(acceleration[j][0]);
			yData.push(acceleration[j][1]);
		}

		var data = {
			x: xData,
			y: yData,
			mode: "lines",
			line: {
				color: canvasPoint_Colors[i]
			}
		};
		accelerationData.push(data);
		Plotly.newPlot("accelerationPlot", accelerationData, accelerationLayout, plotConfig);
	}
}

/*
CALCULATIONS
*/

function calc_mirrored_tangents() {
	/*re-arranges the points so that the splines are of mirrored continuity */
	var newPoints = [];

	if (canvasPoints.length > 4) {
		for (var i = 3; i < canvasPoints.length; i += 3) {

			var pre = canvasPoints[i-1];
			var cur = canvasPoints[i];

			// get the distance of pre to cur
			var dist = [Math.abs(cur[0]-pre[0]), Math.abs(cur[1]-pre[1])];
			
			// calculate new successor
			var suc = [];
			if (cur[0] > pre[0]) 
				suc.push(cur[0]+dist[0]);
			else
				suc.push(cur[0]-dist[0]);
			if (cur[1] > pre[1]) 
				suc.push(cur[1]+dist[1]);
			else 
				suc.push(cur[1]-dist[1]);

			if (i >= canvasPoints.length-2)
				newPoints.push(pre, cur);
			else
				newPoints.push(pre, cur, suc);
		}
		while (canvasPoints.length > 2) {
			canvasPoints.pop();
		}
		while (newPoints.length > 0) {
			var pt = newPoints.shift();
			canvasPoints.push(pt);
		}
	}
}

function calc_aligned_tangents() {
	/*re-arranges the points so that the splines are of aligned continuity*/
	var newPoints = [];
	if (canvasPoints.length > 4) {
		for (var i = 3; i < canvasPoints.length; i += 3) {

			var pre = canvasPoints[i-1];
			var cur = canvasPoints[i];

			if (i == canvasPoints.length -1) {
				newPoints.push(pre, cur);
				break;
			}

			var suc = canvasPoints[i+1];

			// get the distance of pre to cur
			var dist = [Math.abs(cur[0]-pre[0]), Math.abs(cur[1]-pre[1])];
			
			// calculate new successor
			if (dist[0] < dist[1]) {
				// move in x direction
				var y_fac = Math.floor(dist[0] * Math.abs(suc[1]-cur[1])/dist[1]);
				if (cur[0] > pre[0])
					suc[0] = cur[0] + y_fac;
				else
					suc[0] = cur[0] - y_fac;
			}
			else {
				// move in y direction
				var x_fac = Math.floor(dist[1] * Math.abs(suc[0]-cur[0])/dist[0]);
				if (cur[1] > pre[1]) 
					suc[1] = cur[1] + x_fac;
				else 
					suc[1] = cur[1] - x_fac;
			}

			newPoints.push(pre, cur, suc);
		}
	}

	while (canvasPoints.length > 2) {
		canvasPoints.pop();
	}
	while (newPoints.length > 0) {
		var pt = newPoints.shift();
		canvasPoints.push(pt);
	}
}

function get_velocity_points(b, n) {
	/*Return the points to draw a velocity plot*/
	var data = [];
	for (var t = 0; t <= 1.01; t += 0.01) {
		//xData.push(t);
		data.push(calc_velocity(b, t, n));
	}
	return data;
}

function calc_velocity(b, t, n) {
	/*calculates the velocity of a cubic bézier curve (first derivative)*/
	var l = b.length;
	if (l == 2) {
		return [n * (b[1][0] - b[0][0]), n * (b[1][1] - b[0][1])];
	}
	else {
		var next_b = []
		for (var i=1; i < l; i++) {
			next_b.push([(1-t) * b[i-1][0] + t * b[i][0], (1-t) * b[i-1][1] + t * b[i][1]]);
		}
		return calc_velocity(next_b, t, n);
	}
}

function get_acceleration_points(b, n) {
	var data = [];
	for (var t = 0; t <= 1.01; t += 0.01) {
		data.push(calc_acceleration(b, t, n));
	}
	return data;
}

function calc_acceleration(b, t, n) {
	/*calculates the acceleration of a bézier curve (2nd derivative)*/
	if (b.length != 4) return [0, 0];
	b_1 = []
	for (var i = 1; i <= 3; i++) {
		b_1.push([(1-t) * b[i-1][0] + t*b[i][0], (1-t) * b[i-1][1] + t*b[i][1]]);
	}
	x =[n * (n-1) * (b_1[2][0] - 2 * b_1[1][0] + b_1[0][0]), n * (n-1) * (b_1[2][1] - 2 * b_1[1][1] + b_1[0][1])];
	return x;
}

