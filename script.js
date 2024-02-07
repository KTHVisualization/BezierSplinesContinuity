const BezierPoints = 
[
    [
        600,
        100
    ],
    [
        400,
        100
    ],
    [
        350,
        150
    ],
    [
        350,
        200
    ],
    [
        350,
        250
    ],
    [
        550,
        350
    ],
    [
        550,
        400
    ],
    [
        550,
        450
    ],
    [
        500,
        500
    ],
    [
        300,
        500
    ]
];


// const BezierPoints = [];
const Colors = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00'];

const modes = ["BROKEN", "ALIGN", "MIRROR", "G2", "C2", "CURVE"];
var MODE = modes[0];

var MovingPointIdx = -1;
var EatTheNextClick = false;

const SamplePoints = [];
const NumSamplesPerBezier = 100;
var NearestSamplePIdx = -1;
var NearestSampleTangent = [];
var NearestSampleAcceleration = [];

const MoveDistanceThreshold = 10;
const TangentDistanceThreshold = 40;

const plotLayout1 = {
	showlegend: false,
	hovermode: false,
  xaxis: { showticklabels: false, autorange: true },
  yaxis: { showticklabels: false, autorange: true },
  autosize: true,
  margin:
  {
	  l: 10,
	  r: 10,
	  b: 10,
	  t: 50,
	  pad: 4
	},
};
// These layouts shall be indentical.
// However, without explicitly duplicating them, the plots will influence each other when sizing.
const plotLayout2 = {
	showlegend: false,
	hovermode: false,
  xaxis: { showticklabels: false, autorange: true },
  yaxis: { showticklabels: false, autorange: true },
  autosize: true,
  margin:
  {
	  l: 10,
	  r: 10,
	  b: 10,
	  t: 50,
	  pad: 4
	},
};

const plotConfig = {
	responsive: true,
	modeBarButtonsToRemove: ['hoverClosestCartesian', 'hoverCompareCartesian', 'toggleSpikelines'],
	toImageButtonOptions: {
    format: 'svg', // one of png, svg, jpeg, webp
  }
}

const velocityLayout = {
	...plotLayout1,
	title: "Velocity"
}

const accelerationLayout = {
	...plotLayout2,
	title: "Acceleration"
}

function init_view()
{
  // Resize canvas when window is resized.
  window.addEventListener('resize', resizeCanvas);
  // Set canvas size for the first time.
  resizeCanvas();

  // Register events for moving points
	var plotCanvas = document.getElementById("plotCanvas");
	plotCanvas.addEventListener("mousedown", canvasMouseDown);
	plotCanvas.addEventListener("mousemove", canvasMouseMove);
	plotCanvas.addEventListener("mouseup", canvasMouseUp);
	plotCanvas.addEventListener("click", canvasClick);

	//Register events for continuity buttons
	var ContinuityBtns = document.querySelectorAll("#ContinuityModes input");
	for (Btn of ContinuityBtns)
	{
		Btn.addEventListener("click", ContinuityClick);
	}

	Plotly.newPlot("velocityPlot", [], velocityLayout, plotConfig);
	Plotly.newPlot("accelerationPlot", [], accelerationLayout, plotConfig);
}

// Runs each time the DOM window resize event fires.
function resizeCanvas()
{
	plotCanvas = document.getElementById("plotCanvas");
	plotCanvasContainer = document.getElementById("plotCanvasContainer");
  plotCanvas.width = plotCanvasContainer.clientWidth;
  plotCanvas.height = plotCanvasContainer.clientHeight;
  UpdateCanvas();
}


function GetNearestPointIdx(PointSet, x, y, DistanceThreshold)
{
	//Find closest distance to a point in the given pointset.
	//Returns the Idx, if that closest distance is less than the given threshold.
	let MinDistance = 1000000;
	let MinPIdx = -1;
  for (var i = 0; i < PointSet.length; i++)
  {
    var cvPt = PointSet[i];
    var distance = Math.sqrt(Math.pow(cvPt[0] - x, 2) + Math.pow(cvPt[1] - y, 2));
    if (distance < MinDistance)
  	{
  		MinDistance = distance;
  		MinPIdx = i;
  	}
  }

  //Are we rather close?
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
	NearestPointIdx = GetNearestPointIdx(BezierPoints, x, y, MoveDistanceThreshold);
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
	//Get current cursor position. The moved point should go there, if possible.
  var cv = document.getElementById("plotCanvas");
  const x = event.clientX - cv.getBoundingClientRect().left;
  const y = event.clientY - cv.getBoundingClientRect().top;

	if (MovingPointIdx >= 0 && MovingPointIdx < BezierPoints.length)
	{
	  if (MODE == modes[0] || MODE == modes[1] || MODE == modes[2] || MODE == modes[5])
	  {
		  //We can always move the first and last 2 points,
		  // or if we are in the free modes ("Broken", "Curve")
		  if (MovingPointIdx <= 1 || MovingPointIdx >= BezierPoints.length - 2 || MODE == modes[0] || MODE == modes[5])
		  {
		  	BezierPoints[MovingPointIdx] = [x, y];
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
	  }
	  else
	  {
	  	// C2 / G2 modes. We need to solve for the spline.
	  	// And only the knots (interplated points) can be moved.
		  if (MovingPointIdx % 3 != 0) return; //Not a knot! :-)

		  //Knots can be moved.
	  	BezierPoints[MovingPointIdx] = [x, y];
	  	SolveSpline();
	  }

	  NearestSamplePIdx = -1;
	  UpdateCanvas();
	  UpdatePlots();
	}
	else
	{
		//We are not moving a point, but just moving the mouse over the canvas.
		//If we come close to the curve, we show the tangent.
		const PrevNearestSamplePIdx = NearestSamplePIdx;
		NearestSamplePIdx = GetNearestPointIdx(SamplePoints, x, y, TangentDistanceThreshold);
		if (PrevNearestSamplePIdx != NearestSamplePIdx)
		{
			if (NearestSamplePIdx >= 0 && NearestSamplePIdx < SamplePoints.length)
			{
				//On which Bezier is this sample?
				// NumSamplesPerBezier = 5
				// Samples: 0   1   2   3   4   5   6   7   8   9   10   11   12   13   14   15
				// Idx:     0   0   0   0   0   1   1   1   1   2    2    2    2    3    3    3
				// t:       0 .25  .5 .75   1 .25  .5 .75   1 .25   .5  .75    1  .25   .5  .75
				// const BezierIdx = Math.trunc(NearestSamplePIdx / NumSamplesPerBezier);
				const BezierIdx = (NearestSamplePIdx == 0) ? 0 : Math.trunc((NearestSamplePIdx - 1) / (NumSamplesPerBezier - 1));
				//Get the t-value
				const t = (NearestSamplePIdx - BezierIdx * (NumSamplesPerBezier - 1)) / (NumSamplesPerBezier - 1);

				// console.log(`BezierIdx = ${BezierIdx} and t = ${t}`);

				//Get the derivative / tangent
				const FD = GetFirstDerivative(BezierIdx);
				//Get the tangent
				NearestSampleTangent = [
							Math.pow(1-t, 2)                      * FD[0][0]
						+         (1-t)    * 2 *          t     * FD[1][0]
						+                        Math.pow(t, 2) * FD[2][0]
						,
							Math.pow(1-t, 2)                      * FD[0][1]
						+         (1-t)    * 2 *          t     * FD[1][1]
						+                        Math.pow(t, 2) * FD[2][1]
						];

				const SD = GetSecondDerivative(FD);
				NearestSampleAcceleration = [(1-t) * SD[0][0] + t * SD[1][0],
												             (1-t) * SD[0][1] + t * SD[1][1]];
			}

			UpdateCanvas();
			UpdatePlots();
		}
	}
}

function canvasMouseUp()
{
	MovingPointIdx = -1;
	if (EatTheNextClick) UpdateSamplePoints();
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
		PIdx = GetNearestPointIdx(BezierPoints, x, y, MoveDistanceThreshold);
		if (PIdx >= 0)
		{
			BezierPoints.splice(PIdx, 1)
		}
	}
	else
	{
		//store point in list for bézier curve
		BezierPoints.push([x, y]);
	}

	UpdateSamplePoints();
	UpdateCanvas();
	UpdatePlots();	
}

/*
BUTTON CALLBACKS
*/

/*clear canvas button*/
function resetCanvas()
{
	//empty the points arrays
	BezierPoints.length = 0;
	SamplePoints.length = 0;

	// remove all drawings
	clearCanvas();
	clearPlots();
}

function clearCanvas()
{
	// remove all drawings from the main canvas
	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");
	ctx.clearRect(0, 0, cv.width, cv.height);
}

function clearPlots()
{
	// empty the velocity and acceleration plots
	Plotly.react("velocityPlot", [], velocityLayout, plotConfig);
	Plotly.react("accelerationPlot", [], accelerationLayout, plotConfig);
}


function ContinuityClick(event)
{
	var SelectedMode = event.target.value;
	MODE = modes[SelectedMode];
	if (SelectedMode < 5)
	{
		CalcContinuityAll();
		UpdateSamplePoints();
	}
	UpdateCanvas();
	UpdatePlots();
}

function drawPoint(ctx, x, y)
{
	//draw a point onto the canvas
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(x, y, 5, 0, 2*Math.PI);
	ctx.fill();
	ctx.stroke();
}


function drawArrow(ctx, anchor, vector)
{
	//       p7
	//
	//  p6 p4   p3 p5
	//  
	//  
	//  
	//  
	//     p2   p1

	const Length = Math.sqrt(Math.pow(vector[0], 2) + Math.pow(vector[1], 2));
	const HeadLength = 80;
	const HeadWidth = 70;
	const Width = 30;
	const ScaleFactor = 0.2;

	//Angle to y-axis, since this is how we orient the basic, untransformed arrow.
	const Angle = Math.atan2(-vector[0], vector[1]);

	//We first scale, then rotate, then translate.
	//The first transformation will be called last.
	ctx.translate(anchor[0], anchor[1]);
	ctx.rotate(Angle);
	ctx.scale(ScaleFactor, ScaleFactor);

  const p1 = [0 + Width / 2, 0];
  const p2 = [0 - Width / 2, 0];
  const p3 = [0 + Width / 2, Length - HeadLength];
  const p4 = [0 - Width / 2, Length - HeadLength];
  const p5 = [0 + HeadWidth / 2, Length - HeadLength];
  const p6 = [0 - HeadWidth / 2, Length - HeadLength];
  const p7 = [0, Length];

	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 1;
  ctx.moveTo(p1[0], p1[1]);
  ctx.beginPath();
  ctx.lineTo(p3[0], p3[1]);
  ctx.lineTo(p5[0], p5[1]);
  ctx.lineTo(p7[0], p7[1]);
  ctx.lineTo(p6[0], p6[1]);
  ctx.lineTo(p4[0], p4[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.lineTo(p1[0], p1[1]);
  ctx.closePath();
  ctx.arc(0, 0, Width/2, 0, 2*Math.PI);
  ctx.fill();

  ctx.resetTransform();
}

function draw_bezier_curve(ctx, pt1, pt2, pt3, pt4, BezierIdx)
{
	//draw curve
	ctx.lineWidth = 5;
	ctx.strokeStyle = Colors[BezierIdx % Colors.length];
	ctx.beginPath();
	ctx.moveTo(pt1[0], pt1[1]);
	ctx.bezierCurveTo(pt2[0], pt2[1], pt3[0], pt3[1], pt4[0], pt4[1]);
	ctx.stroke();

	//draw handles
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(pt1[0], pt1[1]);
	ctx.lineTo(pt2[0], pt2[1]);
	ctx.moveTo(pt4[0], pt4[1]);
	ctx.lineTo(pt3[0], pt3[1]);
	ctx.stroke();
}

function draw_everything_as_bezier_curve(ctx, NumSteps)
{
	//Safety
	if (BezierPoints.length < 2) return;

	//Initialize the canvas
	ctx.lineWidth = 5;
	ctx.strokeStyle = Colors[0];
	ctx.beginPath();
	ctx.moveTo(BezierPoints[0][0], BezierPoints[0][1]);

	//Create a working copy of the points. We will overwrite this in every iteration.
	//The points in P represent a column of the de Casteljau scheme.
	//Only the first few points are valid, depending on the iteration.
	const P = [];
	P.length = BezierPoints.length;

	//Initialize the de Casteljau algorithm
	// - degree of the curve
	const n = P.length - 1;
	//Other variables:
	// r - iteration counter
	// i - index of point in P (column of de Casteljau scheme).
	// t - curve parameter between [0, 1].

	// for (var j=0;j<n+1;j++) {P[j] = [BezierPoints[j][0], BezierPoints[j][1]];}
	// console.log(BezierPoints);
	// console.log(P);

	for(var a=0;a<NumSteps;a++)
	{
		//Get the next sample point on the curve at the location of t.
		const t = a / (NumSteps - 1);

		//Init the de Casteljau scheme with the Bezier points.
		for (var j=0;j<n+1;j++) {P[j] = [BezierPoints[j][0], BezierPoints[j][1]];}

		//Execute the actual de Casteljau algorithm
		for(var r=0;r<n;r++)
		{
			for(var i=0;i<n-r;i++)
			{
				//Linear interpolation between neighboring points in P
				P[i][0] = (1-t) * P[i][0] + t * P[i+1][0];
				P[i][1] = (1-t) * P[i][1] + t * P[i+1][1];
			}
		}

		//Tell the Canvas to draw a straight line to the next point on the Bezier curve.
		ctx.lineTo(P[0][0], P[0][1]);
	}

	//Execute all drawing commands from above, closing the path.
	ctx.stroke();
}


function UpdateCanvas()
{
	clearCanvas();

	var cv = document.getElementById("plotCanvas");
	var ctx = cv.getContext("2d");

	for (var i = 0; i < BezierPoints.length; i++)
	{
		drawPoint(ctx, BezierPoints[i][0], BezierPoints[i][1]);

		if (i >= 3 && i % 3 == 0 && MODE != modes[5])
		{
			//        i = 3, 6, 9, 12, 15, ...
			//BezierIdx = 0, 1, 2,  3,  4, ...
			const BezierIdx = (i-3) / 3;

			draw_bezier_curve(ctx, BezierPoints[i-3], BezierPoints[i-2],
														 BezierPoints[i-1], BezierPoints[i],
														 BezierIdx);
		}
	}

	//Do not draw a spline. Draw the Bézier curve with its high polynomial degree.
	if (MODE == modes[5])
	{
		draw_everything_as_bezier_curve(ctx, 100);
	}

	// for (SP of SamplePoints)
	// {
	// 	ctx.beginPath();
	// 	ctx.arc(SP[0], SP[1], TangentDistanceThreshold / 2, 0, 2*Math.PI);
	// 	ctx.stroke();
	// }

	if (NearestSamplePIdx >= 0 && NearestSamplePIdx < SamplePoints.length)
	{
		drawArrow(ctx, SamplePoints[NearestSamplePIdx], NearestSampleTangent);
	}
}


function UpdateSamplePoints()
{
	SamplePoints.length = 0;

  for (var i = 3; i < BezierPoints.length; i += 3)
	{
		for(var j=(i==3) ? 0 : 1;j<NumSamplesPerBezier;j++)
		{
			const t = j / (NumSamplesPerBezier - 1);

			SamplePoints.push([
					Math.pow(1-t, 3)                      * BezierPoints[i-3][0]
				+ Math.pow(1-t, 2) * 3 *          t     * BezierPoints[i-2][0]
				+         (1-t)    * 3 * Math.pow(t, 2) * BezierPoints[i-1][0]
				+                        Math.pow(t, 3) * BezierPoints[i  ][0]
				,
					Math.pow(1-t, 3)                      * BezierPoints[i-3][1]
				+ Math.pow(1-t, 2) * 3 *          t     * BezierPoints[i-2][1]
				+         (1-t)    * 3 * Math.pow(t, 2) * BezierPoints[i-1][1]
				+                        Math.pow(t, 3) * BezierPoints[i  ][1]
				]);
		}
	}

	// //Find the largest distance between samples
	// MaxSamplePointDistance = 0;
	// for (var i=0;i<SamplePoints.length-1;i++)
	// {
	// 	const a = SamplePoints[i];
	// 	const b = SamplePoints[i+1];
	// 	const Distance = Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
	// 	if (MaxSamplePointDistance < Distance) MaxSamplePointDistance = Distance;
	// }
}


function UpdatePlots()
{
	if (MODE != modes[5])
	{
		[Velocity, Acceleration] = ComputeDerivativesFlipped();
		DrawVelocity(Velocity);
		DrawAcceleration(Acceleration);
	}
}

function ComputeDerivativesFlipped()
{
	// About the flipped version:
	// The WebGL coordinate system has its origin in the upper left corner.
	// The velocity plot is then confusing. One should be able to see the tangent
	// from the BezierSpline directly in the plot, but one would need to mirror at the y-axis.
	// Hence, we do it here after collecting the proper derivatives.

	FirstDerivatives = [];
	SecondDerivatives = [];
  for (var i = 3; i < BezierPoints.length; i += 3)
  {
    //        i = 3, 6, 9, 12, 15, ...
    //BezierIdx = 0, 1, 2,  3,  4, ...
    const BezierIdx = (i - 3) / 3;

    var FD = GetFirstDerivative(BezierIdx);
    if (FD.length != 3) break;
    FD[0][1] *= -1; FD[1][1] *= -1; FD[2][1] *= -1; //Flip!
    FirstDerivatives.push(FD);

    const SD = GetSecondDerivative(FD);
    if (SD.length != 2) break;
    SecondDerivatives.push(SD);
  }

  return [FirstDerivatives, SecondDerivatives];
}

function DrawVelocity(Velocity)
{
	// The first derivative is a quadratic Bezier curve
	// We use Plotly's ability to draw them directly.
	// We need to add the control points (DerivativePoints) of that curve as well,
	// so that Plotly scales nicely to the content.

	velocityPoints = [];
	velocityShapes = [];
  for (var i = 0; i < Velocity.length; i++)
  {
  	const D = Velocity[i];
    var DerivativePoints =
    {
      x: [D[0][0], D[1][0], D[2][0]],
      y: [D[0][1], D[1][1], D[2][1]],
      mode: "markers",
      marker:
      {
      	color: 'rgba(0,0,0,0)', //We hide them.
        size: 1
      }
    };

    velocityPoints.push(DerivativePoints);

    var DerivativeBezier =
    {
      type: 'path',
      path: `M ${D[0][0]},${D[0][1]} Q ${D[1][0]},${D[1][1]} ${D[2][0]},${D[2][1]}`,
      line:
      {
        color: Colors[i % Colors.length],
        width: 3
      }
    };

    velocityShapes.push(DerivativeBezier);
  }

  if (NearestSamplePIdx >= 0)
  {
    var TangentVector =
    {
      x: [0, NearestSampleTangent[0]],
      y: [0, -NearestSampleTangent[1]],
      mode: "lines+markers",
      line:
      {
      	width: 6
      },
      marker:
      {
      	color: 'rgba(0, 0, 0, 1)',
        size: [6, 18],
      }
    };
    velocityPoints.push(TangentVector);

    const SF = 0.2;
    var AccelerationVector =
    {
      x: [NearestSampleTangent[0], NearestSampleTangent[0] + SF *  NearestSampleAcceleration[0]],
      y: [-NearestSampleTangent[1], -NearestSampleTangent[1] + SF * -NearestSampleAcceleration[1]],
      mode: "lines+markers",
      line:
      {
      	width: 3,
      	dash: 'solid'
      },
      marker:
      {
      	color: 'rgba(0, 0, 0, 1)',
        size: [3, 9],
      }
    };
    velocityPoints.push(AccelerationVector);
	}

  Plotly.react("velocityPlot", velocityPoints,
  						{...velocityLayout, shapes: velocityShapes},
  						plotConfig);
}


function DrawAcceleration(Acceleration)
{
	accelerationPoints = [];
  for (var i = 0; i < Acceleration.length; i++)
  {
  	const A = Acceleration[i];
    var AccData =
    {
      x: [A[0][0], A[1][0]],
      y: [A[0][1], A[1][1]],
      mode: "lines",
      line:
      {
        color: Colors[i % Colors.length],
        width: 3
      }
    };

    accelerationPoints.push(AccData);
  }

  var AccelerationVector =
  {
    x: [0, NearestSampleAcceleration[0]],
    y: [0, -NearestSampleAcceleration[1]],
    mode: "lines+markers",
    line:
    {
    	width: 3,
    	dash: 'solid'
    },
    marker:
    {
    	color: 'rgba(0, 0, 0, 1)',
      size: [3, 9],
    }
  };
  accelerationPoints.push(AccelerationVector);

  Plotly.react("accelerationPlot", accelerationPoints, accelerationLayout, plotConfig);
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

	var Pre = BezierPoints[PreIdx];
	var Cur = BezierPoints[CurIdx];
	var Suc = BezierPoints[SucIdx];

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
	BezierPoints[PreIdx] = Pre;
	BezierPoints[CurIdx] = Cur;
	BezierPoints[SucIdx] = Suc;
}


function CalcContinuityAll()
{
  if (MODE == modes[1] || MODE == modes[2])
  {
	  for (var i = 3; i < BezierPoints.length-1; i += 3)
	  {
	  	AlignPoints(i-1, i, i+1, 0, BezierPoints[i-1]);
	  }
	}
	else if (MODE == modes[3] || MODE == modes[4])
	{
		SolveSpline();
	}
}


function SolveSpline()
{
	//Get every third canvas point
	Knots = [];
	for(var i=0;i<BezierPoints.length;i+=3)
	{
		Knots.push(BezierPoints[i]);
	}

	//Solve
	var Spline = (MODE == modes[3]) ? new BezierSpline(Knots) : new BezierSpline(Knots, () => 1);

	//Get the result
	BezierPoints.length = 0;
	for (var i=0;i<Spline.curves.length;i++)
	{
		for (var j=((i==0)?0:1);j<4;j++)
		{
			BezierPoints.push(Spline.curves[i][j]);
			// console.log(Spline.curves[i][j]);
		}
	}
}


function GetFirstDerivative(BezierIdx)
{
	const a = BezierIdx * 3;
	const b = a + 1;
	const c = b + 1;
	const d = c + 1;

	if (d >= BezierPoints.length) return [];

	const A = BezierPoints[a];
	const B = BezierPoints[b];
	const C = BezierPoints[c];
	const D = BezierPoints[d];

	const dpoints = 
	[
		[3 * (B[0]-A[0]), 3 * (B[1]-A[1])],
		[3 * (C[0]-B[0]), 3 * (C[1]-B[1])],
		[3 * (D[0]-C[0]), 3 * (D[1]-C[1])]
	];

	return dpoints;
}

function GetSecondDerivative(dpoints)
{
	if (dpoints.length != 3) return [];

	const A = dpoints[0];
	const B = dpoints[1];
	const C = dpoints[2];

	const ddpoints = 
	[
		[2 * (B[0]-A[0]), 2 * (B[1]-A[1])],
		[2 * (C[0]-B[0]), 2 * (C[1]-B[1])]
	];

	return ddpoints;
}

