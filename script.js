const canvasPoints = [];
const Colors = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00'];

const modes = ["BROKEN", "ALIGN", "MIRROR"];
let MODE = modes[0];

let MovingPointIdx = -1;
let EatTheNextClick = false;

const plotLayout = {
	showlegend: false,
	hovermode: false,
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

  // Register events for moving points
	plotCanvas = document.getElementById("plotCanvas");
	plotCanvas.addEventListener("mousedown", canvasMouseDown);
	plotCanvas.addEventListener("mousemove", canvasMouseMove);
	plotCanvas.addEventListener("mouseup", canvasMouseUp);
	plotCanvas.addEventListener("click", canvasClick);

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


function GetNearestPointIdx(x, y)
{
	//Find closest distance to any moveable point
	let MinDistance = 1000000;
	let MinPIdx = -1;
  for (var i = 0; i < canvasPoints.length; i++)
  {
    var cvPt = canvasPoints[i];
    var distance = Math.sqrt(Math.pow(cvPt[0] - x, 2) + Math.pow(cvPt[1] - y, 2));
    if (distance < MinDistance)
  	{
  		MinDistance = distance;
  		MinPIdx = i;
  	}
  }

  //Are we rather close?
  let DistanceThreshold = 10
  if (MinDistance <= DistanceThreshold)
  {
  	//We found a close point
  	return MinPIdx;
  }

  //We did not find something nearby
  return -1;
}


function canvasMouseDown(event)
{
	//Get the canvas and where we pressed the mouse button
	var cv = document.getElementById("plotCanvas");
	let x = event.clientX - cv.getBoundingClientRect().left;
	let y = event.clientY - cv.getBoundingClientRect().top;

	//If close to an existing point, then we move that point, else we add a new point.

	//Find closest distance to any moveable point
	NearestPointIdx = GetNearestPointIdx(x, y);
	if (NearestPointIdx >= 0 && !event.ctrlKey)
	{
  	//We found a point to move
  	MovingPointIdx = NearestPointIdx;
		EatTheNextClick = true;
  }
  else
  {
  	MovingPointIdx = -1;
  	//We will add the new point during the click event as it is standard on all GUIs.
  }
}

function canvasMouseMove()
{
	if (MovingPointIdx >= 0 && MovingPointIdx < canvasPoints.length)
	{
		//Move point to current cursor
	  var cv = document.getElementById("plotCanvas");
	  let x = event.clientX - cv.getBoundingClientRect().left;
	  let y = event.clientY - cv.getBoundingClientRect().top;

	  if (MovingPointIdx <= 1 || MovingPointIdx >= canvasPoints.length - 2)
	  {
		  //We can always move the first and last 2 points.
	  	canvasPoints[MovingPointIdx] = [x, y];
	  }
	  else
	  {
	  	//Adjust neighboring points while moving
	  	CurIdx = 3 * Math.trunc((MovingPointIdx + 1) / 3);
	  	PreIdx = CurIdx - 1;
	  	SucIdx = CurIdx + 1;
	  	Reference = MovingPointIdx - PreIdx;
	  	AlignPoints(PreIdx, CurIdx, SucIdx, Reference, [x, y]);
	  }

	  draw_tangents();
	  updatePlots();
	}	
}

function canvasMouseUp()
{
	MovingPointIdx = -1;	
}

function canvasClick(event)
{
	//If we are not moving a point, we add one.
	if (EatTheNextClick)
	{
		EatTheNextClick = false;
		return;
	}

	//Get the canvas and where we pressed the mouse button
	var cv = document.getElementById("plotCanvas");
	let x = event.clientX - cv.getBoundingClientRect().left;
	let y = event.clientY - cv.getBoundingClientRect().top;

	if (event.ctrlKey)
	{
		//Try removing a point
		PIdx = GetNearestPointIdx(x, y);
		if (PIdx >= 0)
		{
			canvasPoints.splice(PIdx, 1)
		}
	}
	else
	{
		//store point in list for bézier curve
		canvasPoints.push([x, y]);
	}

	draw_tangents();
	updatePlots();	
}

/*
BUTTON CALLBACKS
*/


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
	Plotly.plot("velocityPlot", [], velocityLayout, plotConfig);
	Plotly.plot("accelerationPlot", [], accelerationLayout, plotConfig);
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

	CalcContinuityAll();
	draw_tangents();
	updatePlots();
}

/*mirror continuity button*/
function mirrorContinuity() {
	MODE = modes[2];
	document.getElementById("broken").style.background = "initial";
	document.getElementById("aligned").style.background = "initial";
	document.getElementById("mirrored").style.background = "#0da2f7";

	CalcContinuityAll();
	draw_tangents();
	updatePlots();
}


function drawPoint(ctx, x, y) {
	//draw a point onto the canvas
	ctx.beginPath();
	ctx.arc(x, y, 3, 0, 2*Math.PI);
	ctx.stroke();
}

function draw_bezier_curve(ctx, pt1, pt2, pt3, pt4, BezierIdx)
{
	//draw curve
	ctx.lineWidth = 3;
	ctx.strokeStyle = Colors[BezierIdx % Colors.length];
	ctx.beginPath();
	ctx.moveTo(pt1[0], pt1[1]);
	ctx.bezierCurveTo(pt2[0], pt2[1], pt3[0], pt3[1], pt4[0], pt4[1]);
	ctx.stroke();

	//draw handles
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(pt1[0], pt1[1]);
	ctx.lineTo(pt2[0], pt2[1]);
	ctx.moveTo(pt4[0], pt4[1]);
	ctx.lineTo(pt3[0], pt3[1]);
	ctx.stroke();
}

function draw_tangents()
{
	clearCanvas();

	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");

	for (var i = 0; i < canvasPoints.length; i++)
	{
		drawPoint(ctx, canvasPoints[i][0], canvasPoints[i][1]);

		if (i >= 3 && i % 3 == 0)
		{
			//        i = 3, 6, 9, 12, 15, ...
			//BezierIdx = 0, 1, 2,  3,  4, ...
			const BezierIdx = (i-3) / 3;

			draw_bezier_curve(ctx, canvasPoints[i-3], canvasPoints[i-2],
														 canvasPoints[i-1], canvasPoints[i],
														 BezierIdx);
		}
	}
}


function updatePlots() {
	draw_velocity();
	draw_acceleration();
}

function draw_velocity() {
	/*updates the velocity plot based on calc_velocity*/
	velocityData.length = 0;
	for (var i = 3; i < canvasPoints.length; i+=3) {
		var b = [canvasPoints[i-3], canvasPoints[i-2], canvasPoints[i-1], canvasPoints[i]];
		var velocity = get_velocity_points(b, 3);
		var xData = [];
		var yData = [];
		for (var j = 0; j < velocity.length; j++) {
			xData.push(velocity[j][0]);
			yData.push(velocity[j][1]);
		}

		//        i = 3, 6, 9, 12, 15, ...
		//BezierIdx = 0, 1, 2,  3,  4, ...
		const BezierIdx = (i-3) / 3;
			
		var data = {
			x: xData,
			y: yData,
			mode:"lines",
			line: {
				color: Colors[BezierIdx % Colors.length]
			}
		};
		velocityData.push(data);
		Plotly.newPlot("velocityPlot", velocityData, velocityLayout, plotConfig);
	}
}

function draw_acceleration() {
	/*updates the acceleration plot based on calc_acceleration*/
	accelerationData.length = 0;
	for (var i = 3; i < canvasPoints.length; i+=3) {
		var b = [canvasPoints[i-3], canvasPoints[i-2], canvasPoints[i-1], canvasPoints[i]];
		var acceleration = get_acceleration_points(b, 3);
		var xData = [];
		var yData = [];
		for (var j = 0; j < acceleration.length; j ++) {
			xData.push(acceleration[j][0]);
			yData.push(acceleration[j][1]);
		}

		//        i = 3, 6, 9, 12, 15, ...
		//BezierIdx = 0, 1, 2,  3,  4, ...
		const BezierIdx = (i-3) / 3;
			
		var data = {
			x: xData,
			y: yData,
			mode: "lines",
			line: {
				color: Colors[BezierIdx % Colors.length]
			}
		};
		accelerationData.push(data);
		Plotly.newPlot("accelerationPlot", accelerationData, accelerationLayout, plotConfig);
	}
}

/*
CALCULATIONS
*/

function AlignPoints(PreIdx, CurIdx, SucIdx, Reference, NewPos)
{
	//Cur is the interpolated point on the spline.
	//Pre and Suc are the handles before and after Cur.
	//Reference is 0, 1, 2 and identifies which of pre, cur, suc are to be kept.
	//The reference point is typically the one that the user is interactively moving.
	//NewPos is the new position of the reference point.
	//We do the move here in this function.

	// console.log(PreIdx, CurIdx, SucIdx, Reference, NewPos);
	
	//Our computations go from Pre to Suc. This works well when Pre is the reference.
	//We can just switch Pre and Suc, when Suc is the reference.
	//If Cur is the reference, we deal with it later.
	if (Reference == 2)
	{
		[PreIdx, SucIdx] = [SucIdx, PreIdx];
	}

	var Pre = canvasPoints[PreIdx];
	var Cur = canvasPoints[CurIdx];
	var Suc = canvasPoints[SucIdx];

	//If the handles are moved, then we do the move before the calculations.
	if (Reference != 1)
	{
		Pre = NewPos;
	}

  // Normalized Vector of Pre to Cur
  const PreCur = [Cur[0] - Pre[0], Cur[1] - Pre[1]];
  const PreCurLength = Math.sqrt(Math.pow(PreCur[0], 2) + Math.pow(PreCur[1], 2));
  const PreCurNormalized = [PreCur[0] / PreCurLength, PreCur[1] / PreCurLength];
  // Length of the Vector of Cur to Suc
  const CurSuc = [Suc[0] - Cur[0], Suc[1] - Cur[1]];
  const CurSucLength = Math.sqrt(Math.pow(CurSuc[0], 2) + Math.pow(CurSuc[1], 2));

  //Which point are we moving? The one on the spline, or its handles?
	if (Reference == 1)
	{
		//Do the actual move of the interpolated point
		Cur = NewPos;
		//When the interpolated point is moved, we adjust both handles.
		Pre = [ Cur[0] - PreCur[0], Cur[1] - PreCur[1] ];
		Suc = [ Cur[0] + CurSuc[0], Cur[1] + CurSuc[1] ];
	}
	else
	{
	  //Calculate new Successor for when the handles are moved.
	  const NewCurSucLength = (MODE == "ALIGN") ? CurSucLength : PreCurLength;
		Suc = [ Cur[0] + NewCurSucLength * PreCurNormalized[0], Cur[1] + NewCurSucLength * PreCurNormalized[1] ];
	}

  //Re-assign new values.
	canvasPoints[PreIdx] = Pre;
	canvasPoints[CurIdx] = Cur;
	canvasPoints[SucIdx] = Suc;
}


function CalcContinuityAll()
{
  for (var i = 3; i < canvasPoints.length-1; i += 3)
  {
  	AlignPoints(i-1, i, i+1, 0, canvasPoints[i-1]);
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

