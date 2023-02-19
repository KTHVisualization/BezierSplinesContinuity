const canvasPoints = [];
const modes = ["BROKEN", "ALIGN", "MIRROR"];
let MODE = modes[0];

function init_view(){
	document.getElementById("plotCanvas").height=450;
	document.getElementById("plotCanvas").width=450;

	document.getElementById("broken").style.background = "#0da2f7";
	document.getElementById("aligned").style.background = "initial";
	document.getElementById("mirrored").style.background = "initial";

}

/*
BUTTON CALLBACKS
*/

/*clear canvas button*/
function resetCanvas() {
	//empty the points array
	canvasPoints.length = 0;

	// remove all drawings
	clearCanvas();
}

function clearCanvas() {
	// remove all drawings from the main canvas
	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");
	ctx.clearRect(0, 0, cv.width, cv.height);

	// empty the velocity and acceleration plots
	var plots = document.getElementsByClassName("plot");
	for (p of plots) {
		var ctx = p.getContext("2d");
		ctx.clearRect(0,0, p.width, p.height);
	}
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
}

/*mirror continuity button*/
function mirrorContinuity() {
	MODE = modes[2];
	document.getElementById("broken").style.background = "initial";
	document.getElementById("aligned").style.background = "initial";
	document.getElementById("mirrored").style.background = "#0da2f7";

	calc_mirrored_tangents();
	draw_tangents();
}

/*
CANVAS INTERACTION
*/


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
		brokenContinuity();
		draw_bezier_curve(ctx, canvasPoints[l-2], canvasPoints[l-3], canvasPoints[l-4], canvasPoints[l-1]);
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

function draw_bezier_curve(ctx, pt1, pt2, pt3, pt4) {
	//draw curve
	ctx.lineWidth = 3;
	ctx.moveTo(pt4[0], pt4[1]);
	ctx.bezierCurveTo(pt1[0], pt1[1], pt2[0], pt2[1], pt3[0], pt3[1]);
	ctx.stroke();

	//draw splines
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

	for (i = 0; i < canvasPoints.length; i++) {
		drawPoint(ctx, canvasPoints[i][0], canvasPoints[i][1]);
		if (i >= 3 && i % 3 == 0) {
			draw_bezier_curve(ctx, canvasPoints[i-1], canvasPoints[i-2], canvasPoints[i-3], canvasPoints[i]);
		}
	}

}

function draw_velocity() {
	/*updates the velocity plot based on calc_velocity*/
}

function draw_acceleration() {
	/*updates the acceleration plot based on calc_acceleration*/
}

/*
CALCULATIONS
*/

function calc_mirrored_tangents() {
	/*re-arranges the points so that the splines are C1 continuous (mirrored)*/
	var newPoints = [];

	if (canvasPoints.length > 4) {
		for (i = 3; i < canvasPoints.length; i += 3) {

			var pre = canvasPoints[i-1];
			var cur = canvasPoints[i];

			// get the distance of pre to cur
			var dist = [Math.abs(cur[0]-pre[0]), Math.abs(cur[1]-pre[1])];
			
			// calculate new successor
			var suc = [];
			if (cur[0] > pre[0]) {
				suc.push(cur[0]+dist[0]);
			} else {
				suc.push(cur[0]-dist[0]);

			}
			if (cur[1] > pre[1]) {
				suc.push(cur[1]+dist[1]);
			} else {
				suc.push(cur[1]-dist[1]);
			}

			if (i >= canvasPoints.length-2) {
				newPoints.push(pre, cur);
			}
			else {
				newPoints.push(pre, cur, suc);
			}
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

function calc_aligned_tangents() {
	/*re-arranges the points so that the splines are C0 continuous (aligned)*/
}

function calc_velocity() {
	/*calculates the velocity of a bézier curve (first derivative)*/
}

function calc_acceleration() {
	/*calculates the acceleration of a bézier curve (2nd derivative)*/
}

