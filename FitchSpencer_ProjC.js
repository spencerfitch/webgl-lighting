/*
Comp_Sci 351-1 : Project B
Name: Spencer Fitch
Email: SpencerFitch2022@u.northwestern.edu
*/

// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables
//------------For WebGL-----------------------------------------------
var gl;           // webGL Rendering Context. Set in main(), used everywhere.
var g_canvas = document.getElementById('webgl');     
				  // our HTML-5 canvas object that uses 'gl' for drawing.
                  
// ----------For tetrahedron & its matrix---------------------------------
var g_vertsMax = 0;                 // number of vertices held in the VBO 
var floatsPerVertex = 7;
var mvpMatrix = new Matrix4();  // Construct 4x4 matrix; contents get sent
                                    //		 to the GPU/Shaders as a 'uniform' var.
var g_modelMatLoc;                  // that uniform's location in the GPU

//------------For Animation---------------------------------------------
var g_isRun = true;                 // run/stop for animation; used in tick().
var g_lastMS = Date.now();    		// Timestamp for most-recently-drawn image; 
									// 		in milliseconds; 
									// Used by 'animate()' to find time elapsed
									//		since last on-screen image.
									
var g_angle01 = 0;                  // Initial plane rotation angle
var g_angle01Rate = 120.0;          // Plane rotation speed, in degrees/second 
var g_angle01Accel = 3.0;			// Rate of acceleration for rotation speed, in degrees/second^2
var g_angle01RateMin = 0.0;			// Minimum plane speed (deg/sec)
var g_angle01RateMax = 270;			// Maximum plane speed (deg/sec)


var g_angle_roll = -45.0;			// Initial plane roll angle

var g_angle_wingpitch = 0;			// Initial wing-pitch angle
var g_angle_wingpitchRate = 30;		// Rotation speed for wing-pitch change
var g_angle_wingpitchMin = -30;		// Minimum rotation angle for wing-pitch (updated by user slider)
var g_angle_wingpitchMax = 30;		// Maximum rotation angle for wing-pitch (updated by user slider)

var g_angle_gyro = 0;				// Angle of rotating ring
var g_angle_gyroRate = 90;			// Rate of rotation for rotating ring (deg/sec)

// Globals to know if WASD or arrow keys pressed for camera controls
var W_keyActive = false;
var A_keyActive = false;
var S_keyActive = false;
var D_keyActive = false;

var U_arrowActive = false;
var L_arrowActive = false;
var D_arrowActive = false;
var R_arrowActive = false;


var g_angle_box = 0.0;				// Initial angle between the faces of the cube
var g_angle_boxRate = 45;			// Rotation speed for sides of cube
var g_angle_boxMax = 90.0;			// Maximum amount cube faces can rotate
var g_angle_boxMin = 0.0;			// Minimum amount cube faces can rotate

// Globals to know if keys pressed to move the box
var X_keyActive = false;
var C_keyActive = false;

// Global to know if pause is activated
var Plane_paused = false;



// -----------For 3D camera controls ----------------------------------
var e_x = 0		// \
var e_y = -6		//  -> Camera eye locations
var e_z = 1		// /

var theta_H = 90*Math.PI/180;	// Horizontal pitch (in radians for JS trig functions)
var theta_V = -5*Math.PI/180;	// Vertical pitch	(in radians for JS trig functions)

var L_x = e_x + Math.cos(theta_H);	// \ 
var L_y = e_y + Math.sin(theta_H);	//  -> Camera lookat locations
var L_z = e_z + Math.sin(theta_V);	// /

//------------For mouse click-and-drag: -------------------------------
var g_isDrag=false;		// Indicates we are tracking mouse
var g_xMclik=0.0;		// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0;   

var qNew = new Quaternion(0,0,0,1);		// most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);		// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();			// Rotation matrix (made from latest qTot)



function main() {
//==============================================================================

	// Get gl, the rendering context for WebGL, from our 'g_canvas' object
	gl = getWebGLContext(g_canvas);
	if (!gl) {
    	console.log('Failed to get the rendering context for WebGL');
    	return;
  	}

  	// Initialize shaders
  	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    	console.log('Failed to intialize shaders.');
    	return;
  	}

  	// Initialize a Vertex Buffer in the graphics system to hold our vertices
  	g_maxVerts = initVertexBuffer(gl);  
  	if (g_maxVerts < 0) {
   		console.log('Failed to set the vertex information');
    	return;
  	}

	// Add keyboard event listeners
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);

	// Add Mouse click event listeners 
	window.addEventListener("mousedown", myMouseDown); 
	window.addEventListener("mousemove", myMouseMove); 
	window.addEventListener("mouseup", myMouseUp);			
	
	// Specify the color for clearing <canvas>
	gl.clearColor(0.25, 0.2, 0.25, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
	gl.enable(gl.DEPTH_TEST); 	  
	
	// Get handle to graphics system's storage location of u_ModelMatrix
	g_modelMatLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!g_modelMatLoc) { 
    	console.log('Failed to get the storage location of u_ModelMatrix');
    	return;
	}

	// Draw canvas at size based on browser window
	resizeCanvas();
	tick();
	
}


function resizeCanvas() {
	// Resize WebGL canvas based on browser window size

	var xtraMargin = 16;	// Maintain a margin (to prevent scroll bar)

	g_canvas.width = innerWidth - xtraMargin;
	g_canvas.height = (innerHeight*0.70) - xtraMargin;

}


// ANIMATION: create 'tick' variable whose value is this function:
//----------------- 
function tick() {

	// Update rotating ring speed from slider
	g_angle_gyroRate = document.getElementById('aileronSlider').value
	
	// Display current speed next to slidebar
	document.getElementById('aileronMaxDisplay').innerHTML = g_angle_gyroRate


    animate();		// Update the rotation angle
	drawAll();		// Draw all parts
	

	// Display information about plane
	document.getElementById('CurRotationSpeed').innerHTML=
		'Current Camera Eye Position= &emsp;&emsp;(' + e_x.toFixed(1) + ', ' + e_y.toFixed(1) + ', ' + e_z.toFixed(1) + ')';
	document.getElementById('CurRollAngleDisplay').innerHTML= 
		'Horizontal Rotation Angle (deg)= &emsp;'+(theta_H*180.0/Math.PI).toFixed(1);
	document.getElementById('CurWingAngleDisplay').innerHTML=
		'Vertial Pitch Angle (deg)= &emsp;&emsp;&emsp;&emsp;'+(theta_V*180.0/Math.PI).toFixed(1);

	// Display information about box
	document.getElementById('CurBoxAngleDisplay').innerHTML=
		'Angle between faces of the box= '+(g_angle_box+90).toFixed(1);


	//--------------------------------
    requestAnimationFrame(tick, g_canvas);   
    									// Request that the browser re-draw the webpage
    									// (causes webpage to endlessly re-draw itself)
};


function initVertexBuffer() {
//==============================================================================

	var atop = 0.1 + .004/.3;		// Top of aileron edge height
	var abtm = 0.1 - .002/.3;		// Bottom of aileron edge height
	var f23 = 2.0/3.0;				// Exact 2/3 value 

  	var colorObjects = new Float32Array([
	// ---------------------- Part1 (Plane) ---------------------- //
	// ----------------------    0-237      ---------------------- //
	// --- Plane Body --- //
	// ---    0-23   --- //
	// Bottom Face
	0.0, 0.0, 0.0, 1.0,		1.0, 1.0, 1.0, // Node 0 (White)
	0.2, 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0, // Node 1 (Red)
	0.0, 0.0, 1.0, 1.0,		0.0, 1.0, 0.0, // Node 2 (Green)
	0.2, 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0, // Node 1 (Red)
	0.0, 0.0, 1.0, 1.0,		0.0, 1.0, 0.0, // Node 2 (Green)
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 1.0, // Node 3 (Blue)
	// Top Face
	0.0, 0.2, 0.0, 1.0,		0.0, 1.0, 1.0, // Node 4 (Cyan)
	0.2, 0.2, 0.0, 1.0, 	1.0, 1.0, 0.0, // Node 5 (Yellow)
	0.0, 0.2, 1.0, 1.0,		1.0, 0.0, 1.0, // Node 6 (Purple)
	0.2, 0.2, 0.0, 1.0, 	1.0, 1.0, 0.0, // Node 5 (Yellow)
	0.0, 0.2, 1.0, 1.0,		1.0, 0.0, 1.0, // Node 6 (Purple)
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (White)
	// Side Face 1
	0.0, 0.0, 1.0, 1.0,		0.0, 1.0, 0.0, // Node 2 (Green)
	0.0, 0.0, 0.0, 1.0,		1.0, 1.0, 1.0, // Node 0 (White)
	0.0, 0.2, 1.0, 1.0,		1.0, 0.0, 1.0, // Node 6 (Purple)
	0.0, 0.2, 0.0, 1.0,		0.0, 1.0, 1.0, // Node 4 (Cyan)
	0.0, 0.0, 0.0, 1.0,		1.0, 1.0, 1.0, // Node 0 (White)
	0.0, 0.2, 1.0, 1.0,		1.0, 0.0, 1.0, // Node 6 (Purple)
	// Side Face 2
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 1.0, // Node 3 (Blue)
	0.2, 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0, // Node 1 (Red)
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)
	0.2, 0.2, 0.0, 1.0, 	1.0, 1.0, 0.0, // Node 5 (Yellow)
	0.2, 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0, // Node 1 (Red)
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)



	// --- Plane Nose --- //
	// ---   24-35   --- //
	// Nose Bottom
	0.1,0.05, 1.3, 1.0,		1.0, 1.0, 0.0, // Node 8 (Yellow) 	(nose point) 
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 1.0, // Node 3 (Blue)
	0.0, 0.0, 1.0, 1.0,		0.0, 1.0, 0.0, // Node 2 (Green)
	// Nose Top
	0.1,0.05, 1.3, 1.0,		1.0, 1.0, 0.0, // Node 8 (Yellow) 	(Nose point) 
	0.0, 0.2, 1.0, 1.0,		1.0, 0.0, 1.0, // Node 6 (Purple)
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)
	// Nose Side 1
	0.1,0.05, 1.3, 1.0,		1.0, 1.0, 0.0, // Node 8 (Yellow)	(Nose point) 
	0.0, 0.0, 1.0, 1.0,		0.0, 1.0, 0.0, // Node 2 (Green)
	0.0, 0.2, 1.0, 1.0,		1.0, 0.0, 1.0, // Node 6 (Purple)
	// Nose Side 2
	0.1,0.05, 1.3, 1.0,		1.0, 1.0, 0.0, // Node 8 (Yellow) 	(Nose point) 
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 1.0, // Node 3 (Blue)



	// --- Plane Tail --- //
	// ---    36-47   --- //
	// Tail Bottom
	0.1, 0.2,-0.3, 1.0,		0.5, 0.5, 0.5, // Node 9 (Gray) 	(Tail point) 
	0.0, 0.0, 0.0, 1.0,		1.0, 1.0, 1.0, // Node 0 (White)
	0.2, 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0, // Node 1 (Red)
	// Tail Top
	0.1, 0.2,-0.3, 1.0,		0.5, 0.5, 0.5, // Node 9 (Gray) 	(Tail point) 
	0.0, 0.2, 0.0, 1.0,		0.0, 1.0, 1.0, // Node 4 (Cyan)
	0.2, 0.2, 0.0, 1.0, 	1.0, 1.0, 0.0, // Node 5 (Yellow)
	// Tail Side 1
	0.1, 0.2,-0.3, 1.0,		0.5, 0.5, 0.5, // Node 9 (Gray) 	(Tail point)
	0.0, 0.0, 0.0, 1.0,		1.0, 1.0, 1.0, // Node 0 (White)
	0.0, 0.2, 0.0, 1.0,		0.0, 1.0, 1.0, // Node 4 (Cyan)
	// Tail Side 2
	0.1, 0.2,-0.3, 1.0,		0.5, 0.5, 0.5, // Node 9 (Gray) 	(Tail point)
	0.2, 0.0, 0.0, 1.0, 	1.0, 0.0, 0.0, // Node 1 (Red)
	0.2, 0.2, 0.0, 1.0, 	1.0, 1.0, 0.0, // Node 5 (Yellow)



	// --- Vertical Stabalizer --- //
	// ---       48-62         --- //
	// Side 1
	0.10, 0.45,-0.10, 1.0,		0.0, 1.0, 0.0, // Node 10 (Green)	(Stabalizer peak)
	0.10, 0.43, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 11 (Blue)	(Stabalizer leading edge top)
	0.06, 0.20,-0.10, 1.0,		1.0, 1.0, 0.0, // Node 12 (Yellow)
	0.10, 0.20, 0.05, 1.0,		1.0, 0.0, 0.0, // Node 13 (Red)		(Stabalizer leading edge base)
	0.10, 0.43, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 11 (White)	(Stabalizer leading edge top)
	0.06, 0.20,-0.10, 1.0,		1.0, 1.0, 0.0, // Node 12 (Yellow)
	// Side 2
	0.10, 0.45,-0.10, 1.0,		0.0, 1.0, 0.0, // Node 10 (Green)	(Stabalizer peak)
	0.10, 0.43, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 11 (Blue)	(Stabalizer leading edge top)
	0.14, 0.20,-0.10, 1.0,		1.0, 0.0, 1.0, // Node 14 (Purple)
	0.10, 0.20, 0.05, 1.0,		1.0, 0.0, 0.0, // Node 13 (Red)		(Stabalizer leading edge base)
	0.10, 0.43, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 11 (Blue)	(Stabalizer leading edge top)
	0.14, 0.20,-0.10, 1.0,		1.0, 0.0, 1.0, // Node 14 (Purple)
	// Back
	0.10, 0.45,-0.10, 1.0,		0.0, 1.0, 0.0, // Node 10 (Green)	(Stabalizer peak)
	0.06, 0.20,-0.10, 1.0,		1.0, 1.0, 0.0, // Node 12 (Yellow)
	0.14, 0.20,-0.10, 1.0,		1.0, 0.0, 1.0, // Node 14 (Purple)



	// ---   Wing   --- //
	// ---  63-110  --- //
	// One wing model used and is just drawn twice in DrawPlane() using DrawPlaneWing()//
	// Wing Top
	 0.00, 0.14, 0.70, 1.0,		1.0, 0.0, 0.0, // Node 15 (Red)		(Top wing edge)
	 -f23, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 21 (Black)	(Top Wing Outside Edge)
	 0.00, atop, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 19 (White)	(Top Wing Base)

	 -f23, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 21 (Black)	(Top Wing Outside Edge)
	 -f23, 0.10, 0.40, 1.0,		0.0, 0.0, 1.0, // Node XX (Blue)	
	-1.00, 0.10, 0.40, 1.0,		1.0, 1.0, 1.0, // Node 16 (White)	(Wing tip)
	
	 0.00, 0.10, 0.40, 1.0, 	0.0, 0.0, 0.0, // Node 17 (Black)	(Back of wing)
	 0.00, atop, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 19 (White)	(Top Wing Base)
	-0.20, 0.10, 0.40, 1.0,		1.0, 0.0, 0.0, // Node 23 (Red)		(Inside Back Aileron)
	-0.20, atop, 0.50, 1.0,		1.0, 1.0, 0.0, // Node 21 (Yellow)  (Inside Top Aileron)
	 0.00, atop, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 19 (White)	(Top Wing Base)
    -0.20, 0.10, 0.40, 1.0,		1.0, 0.0, 0.0, // Node 23 (Cyan)	(Inside Back Aileron)

	-0.60, 0.10, 0.40, 1.0,		1.0, 0.0, 1.0, // Node 24 (Purple)	(Outside Back Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 1.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-f23, 0.10, 0.40, 1.0,		0.0, 0.0, 1.0, // Node XX (Blue)	
	-f23, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 21 (Black)	(Top Wing Outside Edge)
	-0.60, atop, 0.50, 1.0,		0.0, 1.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-f23, 0.10, 0.40, 1.0,		0.0, 0.0, 1.0, // Node XX (Blue)	

	// Wing back to aileron
	-0.20, atop, 0.50, 1.0,		1.0, 1.0, 0.0, // Node 21 (Yellow)  (Inside Top Aileron)
	-0.20, abtm, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 25 (Red)		(Inside Bottom Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 1.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.60, abtm,0.50, 1.0,		1.0, 0.0, 1.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.20, abtm, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 25 (Red)		(Inside Bottom Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 1.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)

	// Wing Bottom
	 0.00, 0.08, 0.70, 1.0,		0.0, 0.0, 1.0, // Node 18 (Blue)	(Bottom wing edge)
	-f23, abtm, 0.50, 1.0,		0.5, 0.5, 0.5, // Node 22 (Gray)	(Bottom Wing Outside Edge)
	 0.00, abtm, 0.50, 1.0,		0.0, 0.1, 0.0, // Node 20 (Green)	(Bottom Wing Base)

	-f23, abtm, 0.50, 1.0,		0.5, 0.5, 0.5, // Node 22 (Gray)	(Bottom Wing Outside Edge)
	-f23, 0.10, 0.40, 1.0,		0.0, 0.0, 1.0, // Node XX (Blue)	
    -1.00, 0.10, 0.40, 1.0,		1.0, 1.0, 1.0, // Node 16 (White)	(Wing tip)
   
	 0.00, 0.10, 0.40, 1.0, 	0.0, 0.0, 0.0, // Node 17 (Black)	(Back of wing)
	 0.00, abtm, 0.50, 1.0,		0.0, 0.1, 0.0, // Node 20 (Green)	(Bottom Wing Base)
    -0.20, 0.10, 0.40, 1.0,		1.0, 0.0, 0.0, // Node 23 (Cyan)	(Inside Back Aileron)
    -0.20, abtm, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 25 (Red)		(Inside Bottom Aileron)
     0.00, abtm, 0.50, 1.0,		0.0, 0.1, 0.0, // Node 20 (Green)	(Bottom Wing Base)
    -0.20, 0.10, 0.40, 1.0,		1.0, 0.0, 0.0, // Node 23 (Cyan)	(Inside Back Aileron)

    -0.60, 0.10, 0.40, 1.0,		1.0, 0.0, 1.0, // Node 24 (Purple)	(Outside Back Aileron)
    -0.60, abtm, 0.50, 1.0,		1.0, 0.0, 1.0, // Node 26 (Purple)	(Outside Bottom Aileron)
     -f23, 0.10, 0.40, 1.0,		0.0, 0.0, 1.0, // Node XX (Blue)	
     -f23, abtm, 0.50, 1.0,		0.5, 0.5, 0.5, // Node 22 (Gray)	(Bottom Wing Outside Edge)
    -0.60, abtm, 0.50, 1.0,		1.0, 0.0, 1.0, // Node 26 (Purple)	(Outside Bottom Aileron)
     -f23, 0.10, 0.40, 1.0,		0.0, 0.0, 1.0, // Node XX (Blue)

	// Wing Front Face 1
	 0.00, 0.10, 0.75, 1.0,		0.0, 1.0, 0.0, // Node 18 (Green)	(Leading wing edge)
	-1.00, 0.10, 0.40, 1.0,		1.0, 1.0, 1.0, // Node 16 (White)	(Wing tip)
	 0.00, 0.14, 0.70, 1.0,		1.0, 0.0, 0.0, // Node 15 (Red)		(Top wing edge)
	// Wing Front Face 2
	 0.00, 0.10, 0.75, 1.0,		0.0, 1.0, 0.0, // Node 18 (Green)	(Leading wing edge)
	-1.00, 0.10, 0.40, 1.0,		1.0, 1.0, 1.0, // Node 16 (White)	(Wing tip)
	 0.00, 0.08, 0.70, 1.0,		0.0, 0.0, 1.0, // Node 18 (Blue)	(Bottom wing edge)




	// ---- Aileron  ---- //
	// ---- 111-128 ---- //
	// Aileron Top
	-0.20, 0.10, 0.40, 1.0,		0.0, 1.0, 1.0, // Node 23 (Cyan)	(Inside  Back Aileron)
	-0.20, atop, 0.50, 1.0,		1.0, 1.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)
	-0.60, 0.10, 0.40, 1.0,		1.0, 0.0, 1.0, // Node 24 (Purple)	(Outside Back Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 1.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.20, atop, 0.50, 1.0,		1.0, 1.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)
	-0.60, 0.10, 0.40, 1.0,		1.0, 0.0, 1.0, // Node 24 (Purple)	(Outside Back Aileron)
	//  Aileron Bottom
	-0.20, 0.10, 0.40, 1.0,		0.0, 1.0, 1.0, // Node 23 (Cyan)	(Inside  Back Aileron)
	-0.20, abtm, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 25 (Red)		(Inside  Bottom Aileron)
	-0.60, 0.10, 0.40, 1.0,		1.0, 0.0, 1.0, // Node 24 (Purple)	(Outside Back Aileron)
	-0.60, abtm,0.50, 1.0,		1.0, 0.0, 1.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.20, abtm, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 25 (Red)		(Inside  Bottom Aileron)
	-0.60, 0.10, 0.40, 1.0,		1.0, 0.0, 1.0, // Node 24 (Purple)	(Outside Back Aileron)
	// Aileron Front
	-0.20, abtm, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 25 (Red)		(Inside  Bottom Aileron)
	-0.20, atop, 0.50, 1.0,		1.0, 1.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)
	-0.60, abtm,0.50, 1.0,		1.0, 0.0, 1.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 1.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.20, atop, 0.50, 1.0,		1.0, 1.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)
	-0.60, abtm,0.50, 1.0,		1.0, 0.0, 1.0, // Node 26 (Purple)	(Outside Bottom Aileron)



	// --- Propeller --- //
	// ---  129-152  --- //
	// One propeller model used and is just drawn two times //
	// Prop Base Side 1
	 0.10, 0.05, 1.30, 1.0,		1.0, 1.0, 1.0, // Node 19 (Black)	(Prop Base)
	 0.00, 0.08, 1.30, 1.0,		1.0, 0.0, 0.0, // Node 20 (Red)
	 0.00, 0.02, 1.32, 1.0,		0.0, 1.0, 0.0, // Node 21 (Green)
	// Prop Base Side 2
	 0.10, 0.05, 1.30, 1.0,		1.0, 1.0, 1.0, // Node 19 (Black)	(Prop Base)
	 0.00, 0.08, 1.30, 1.0,		1.0, 0.0, 0.0, // Node 20 (Red)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 1.0, // Node 22 (Blue)	
	 // Prop Base Side 3
	 0.10, 0.05, 1.30, 1.0,		1.0, 1.0, 1.0, // Node 19 (Black)	(Prop Base)
	 0.00, 0.02, 1.32, 1.0,		0.0, 1.0, 0.0, // Node 21 (Green)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 1.0, // Node 22 (Blue)
	 // Prop Side 1
	 0.00, 0.08, 1.30, 1.0,		1.0, 0.0, 0.0, // Node 20 (Red)
	 0.00, 0.02, 1.32, 1.0,		0.0, 1.0, 0.0, // Node 21 (Green)
	-0.30, 0.07, 1.30, 1.0,		1.0, 0.0, 1.0, // Node 23 (Purple) 	(Prop leading tip)
	-0.30, 0.01, 1.30, 1.0,		0.0, 1.0, 1.0, // Node 24 (Cyan)	(Prop trailing tip)
	 0.00, 0.02, 1.32, 1.0,		0.0, 1.0, 0.0, // Node 21 (Green)
	-0.30, 0.07, 1.30, 1.0,		1.0, 0.0, 1.0, // Node 23 (Purple) 	(Prop leading tip)
	 // Prop Side 2
	 0.00, 0.08, 1.30, 1.0,		1.0, 0.0, 0.0, // Node 20 (Red)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 1.0, // Node 22 (Blue)
	-0.30, 0.07, 1.30, 1.0,		1.0, 0.0, 1.0, // Node 23 (Purple) 	(Prop leading tip)
	-0.30, 0.01, 1.30, 1.0,		0.0, 1.0, 1.0, // Node 24 (Cyan)	(Prop trailing tip)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 1.0, // Node 22 (Blue)
	-0.30, 0.07, 1.30, 1.0,		1.0, 0.0, 1.0, // Node 23 (Purple) 	(Prop leading tip)
	 // Prop Side 3	
	 0.00, 0.02, 1.32, 1.0,		0.0, 1.0, 0.0, // Node 21 (Green)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 1.0, // Node 22 (Blue)
	-0.30, 0.01, 1.30, 1.0,		0.0, 1.0, 1.0, // Node 24 (Cyan)	(Prop trailing tip)

	
	// ---- Full Plane Outline ---- //
	// ----       153-208     ---- //
	// Body (153-168)
	0.0, 0.0, 0.0, 1.0,		0.0, 0.0, 0.0, // Node 0 (White)
	0.2, 0.0, 0.0, 1.0, 	0.0, 0.0, 0.0, // Node 1 (Red)
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 3 (Blue)
	0.0, 0.0, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 2 (Green)
	
	0.0, 0.2, 0.0, 1.0,		0.0, 0.0, 0.0, // Node 4 (Cyan)
	0.2, 0.2, 0.0, 1.0, 	0.0, 0.0, 0.0, // Node 5 (Yellow)
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)
	0.0, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 6 (Purple)
	
	0.0, 0.0, 0.0, 1.0,		0.0, 0.0, 0.0, // Node 0 (White)
	0.0, 0.2, 0.0, 1.0,		0.0, 0.0, 0.0, // Node 4 (Cyan)
	0.2, 0.0, 0.0, 1.0, 	0.0, 0.0, 0.0, // Node 1 (Red)
	0.2, 0.2, 0.0, 1.0, 	0.0, 0.0, 0.0, // Node 5 (Yellow)
	0.0, 0.0, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 2 (Green)
	0.0, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 6 (Purple)
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 3 (Blue)
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)

	// Nose (169-175)
	0.0, 0.0, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 2 (Green)
	0.1,0.05, 1.3, 1.0,		0.0, 0.0, 0.0, // Node 8 (Yellow) 	(Nose point) 
	0.2, 0.0, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 3 (Blue)
	0.1,0.05, 1.3, 1.0,		0.0, 0.0, 0.0, // Node 8 (Yellow) 	(Nose point) 
	0.0, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 6 (Purple)
	0.1,0.05, 1.3, 1.0,		0.0, 0.0, 0.0, // Node 8 (Yellow) 	(Nose point) 
	0.2, 0.2, 1.0, 1.0,		0.0, 0.0, 0.0, // Node 7 (Black)

	// Tail (176-182)
	0.2, 0.0, 0.0, 1.0, 	0.0, 0.0, 0.0, // Node 1 (Red)
	0.1, 0.2,-0.3, 1.0,		0.0, 0.0, 0.0, // Node 9 (Gray) 	(Tail point)
	0.2, 0.2, 0.0, 1.0, 	0.0, 0.0, 0.0, // Node 5 (Yellow)
	0.1, 0.2,-0.3, 1.0,		0.0, 0.0, 0.0, // Node 9 (Gray) 	(Tail point)
	0.0, 0.2, 0.0, 1.0,		0.0, 0.0, 0.0, // Node 4 (Cyan)
	0.1, 0.2,-0.3, 1.0,		0.0, 0.0, 0.0, // Node 9 (Gray) 	(Tail point)
	0.0, 0.0, 0.0, 1.0,		0.0, 0.0, 0.0, // Node 0 (White)

	// Vertical Stabalizer (183-191)
	0.06, 0.20,-0.10, 1.0,		0.0, 0.0, 0.0, // Node 12 (Yellow)
	0.10, 0.20, 0.05, 1.0,		0.0, 0.0, 0.0, // Node 13 (Red)		(Stabalizer leading edge base)
	0.14, 0.20,-0.10, 1.0,		0.0, 0.0, 0.0, // Node 14 (Purple)
	
	0.06, 0.20,-0.10, 1.0,		0.0, 0.0, 0.0, // Node 12 (Yellow)
	0.10, 0.45,-0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 (Green)	(Stabalizer peak)
	0.14, 0.20,-0.10, 1.0,		0.0, 0.0, 0.0, // Node 14 (Purple)
	0.10, 0.45,-0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 (Green)	(Stabalizer peak)
	0.10, 0.43, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 11 (Blue)	(Stabalizer leading edge top)
	0.10, 0.20, 0.05, 1.0,		0.0, 0.0, 0.0, // Node 13 (Red)		(Stabalizer leading edge base)

	// Wing (192-214)
	 0.00, 0.10, 0.75, 1.0,		0.0, 0.0, 0.0, // Node 18 (Green)	(Leading wing edge)
	-1.00, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 16 (White)	(Wing tip)
	 0.00, 0.08, 0.70, 1.0,		0.0, 0.0, 0.0, // Node 18 (Blue)
	
     0.00, 0.10, 0.75, 1.0,		0.0, 0.0, 0.0, // Node 18 (Green)	(Leading wing edge)
    -1.00, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 16 (White)	(Wing tip)
	 0.00, 0.14, 0.70, 1.0,		0.0, 0.0, 0.0, // Node 15 (Red)
	 
	 0.00, 0.14, 0.70, 1.0,		0.0, 0.0, 0.0, // Node 15 (Red)
	-1.00, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 16 (White)	(Wing tip)
	-0.60, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 24 (Purple)	(Outside Back Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.20, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)
	-0.20, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 23 (Cyan)	(Inside  Back Aileron)
	 0.00, 0.10, 0.40, 1.0, 	0.0, 0.0, 0.0, // Node 17 (Black)	(Back of wing)	

	 0.00, 0.08, 0.70, 1.0,		0.0, 0.0, 0.0, // Node 18 (Blue)
	-1.00, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 16 (White)	(Wing tip)
	-0.60, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 24 (Purple)	(Outside Back Aileron)
	-0.60, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.20, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 25 (Red)		(Inside  Bottom Aileron)
	-0.20, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 23 (Cyan)	(Inside  Back Aileron)
	 0.00, 0.10, 0.40, 1.0, 	0.0, 0.0, 0.0, // Node 17 (Black)	(Back of wing)

	-0.60, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.20, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)

	// Aileron (215-224)
	-0.20, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 23 (Cyan)	(Inside  Back Aileron)
	-0.20, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 25 (Red)		(Inside  Bottom Aileron)
	-0.60, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.60, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 24 (Purple)	(Outside Back Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.20, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 21 (Yellow)  (Inside  Top Aileron)
	-0.20, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 25 (Red)		(Inside  Bottom Aileron)
	-0.60, abtm, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26 (Purple)	(Outside Bottom Aileron)
	-0.60, atop, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)	(Outside Top Aileron)
	-0.60, 0.10, 0.40, 1.0,		0.0, 0.0, 0.0, // Node 24 (Purple)	(Outside Back Aileron)
	 


	 // Propeller (224-237)
	 0.00, 0.08, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 20 (Red)
	 0.10, 0.05, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 19 (Black)	(Prop Base)
	 0.00, 0.02, 1.32, 1.0,		0.0, 0.0, 0.0, // Node 21 (Green)
	 0.10, 0.05, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 19 (Black)	(Prop Base)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)

	 0.00, 0.08, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 20 (Red)
	 0.00, 0.02, 1.32, 1.0,		0.0, 0.0, 0.0, // Node 21 (Green)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)
	 
	 0.00, 0.08, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 20 (Red)
	-0.30, 0.07, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 23 (Purple) 	(Prop leading tip)
	-0.30, 0.01, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 24 (Cyan)	(Prop trailing tip)
	 0.00, 0.02, 1.32, 1.0,		0.0, 0.0, 0.0, // Node 21 (Green)
	-0.30, 0.01, 1.30, 1.0,		0.0, 0.0, 0.0, // Node 24 (Cyan)	(Prop trailing tip)
	 0.00, 0.02, 1.28, 1.0,		0.0, 0.0, 0.0, // Node 22 (Blue)
	
	// ------------------  End Part1 (Plane)   ------------------ //
	




	// ------------------ Part2 (Foldable Cube) ------------------ //
	// ------------------       239-???        ------------------ //
	// ---- Cube Piece 0 ---- //
	// ---- 239-286 ---- //
	// Outside Face
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	// Inside Face
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	// Inside Edge 1
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0  	(Black)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 12 	(Green)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 12 	(Green)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 12 	(Green)
	// Inside Edge 2
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 13	(Cyan)
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 13	(Cyan)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 13	(Cyan)
	// Inside Edge 3
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 14	(Black)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 14	(Black)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 14	(Black)
	// Inside Edge 4
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 15	(Blue)
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0  	(Black)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 15	(Blue)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 15	(Blue)

	// ---- Cube Piece 1 ---- //
	// ----   287-334    ---- //
	// Outside Face
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	// Inside Face
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	// Inside Edge 1
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.50, 0.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 20	(Yellow)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.50, 0.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 20	(Yellow)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.50, 0.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 20	(Yellow)
	// Inside Edge 2
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	1.00, 0.50, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 21 	(White)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 0.50, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 21 	(White)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 0.50, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 21 	(White)
	// Inside Edge 3
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.50, 1.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 22	(Red)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.50, 1.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 22	(Red)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.50, 1.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 22	(Red)
	// Inside Edge 4
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 0.50, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 23	(Purple)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 0.50, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 23	(Purple)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 0.50, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 23	(Purple)

	// ---- Cube Piece 2 ---- //
	// ----   335-382    ---- //
	// Outside Face
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	// Inside Face
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	// Inside Edge 1
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0  	(Black)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 12 	(Green)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 12 	(Green)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 12 	(Green)
	// Inside Edge 2
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0  	(Black)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.00, 0.00, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 24	(White)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 0.00, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 24	(White)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 0.00, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 24	(White)
	// Inside Edge 3
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.50, 0.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 20	(Yellow)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.50, 0.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 20	(Yellow)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.50, 0.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 20	(Yellow)
	// Inside Edge 4
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	1.00, 0.00, 0.50, 1.0,		0.0, 1.0, 1.0, // Node 25	(Cyan)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	1.00, 0.00, 0.50, 1.0,		0.0, 1.0, 1.0, // Node 25	(Cyan)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	1.00, 0.00, 0.50, 1.0,		0.0, 1.0, 1.0, // Node 25	(Cyan)

	// ---- Cube Piece 3 ---- //
	// ----   383-430    ---- //
	// Outside Face
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	// Inside Face
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	// Inside Edge 1
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 13	(Cyan)
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 13	(Cyan)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 13	(Cyan)
	// Inside Edge 2
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	1.00, 1.00, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26	(Black)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 1.00, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26	(Black)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 1.00, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26	(Black)
	// Inside Edge 3
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	1.00, 0.50, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 21 	(White)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 0.50, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 21 	(White)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 0.50, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 21 	(White)
	// Inside Edge 4
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	1.00, 0.00, 0.50, 1.0,		0.0, 1.0, 1.0, // Node 25	(Cyan)
	1.00, 0.00, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	1.00, 0.00, 0.50, 1.0,		0.0, 1.0, 1.0, // Node 25	(Cyan)
	0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0, // Node 9  	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 1.0, // Node 17	(Blue)
	1.00, 0.00, 0.50, 1.0,		0.0, 1.0, 1.0, // Node 25	(Cyan)

	// ---- Cube Piece 4 ---- //
	// ----   431-478    ---- //
	// Outside Face
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	// Inside Face
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	// Inside Edge 1
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 14	(Black)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 14	(Black)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 14	(Black)
	// Inside Edge 2
	1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	1.00, 1.00, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26	(Black)
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 1.00, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26	(Black)
	0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0, // Node 10 	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	1.00, 1.00, 0.50, 1.0,		0.0, 0.0, 0.0, // Node 26	(Black)
	// Inside Edge 3
	1.00, 1.00, 1.00, 1.0,		1.0, 1.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.50, 1.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 22	(Red)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.50, 1.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 22	(Red)
	0.90, 0.90, 0.90, 1.0,		0.0, 1.0, 0.0, // Node 18 	(Green)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.50, 1.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 22	(Red)
	// Inside Edge 4
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.00, 1.00, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 27	(Red)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 1.00, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 27	(Red)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 1.00, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 27	(Red)

	// ---- Cube Piece 5 ---- //
	// ----   479-526    ---- //
	// Outside Face
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	// Inside Face
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	// Inside Edge 1
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 15	(Blue)
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0  	(Black)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 15	(Blue)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0, // Node 15	(Blue)
	// Inside Edge 2
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0  	(Black)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.00, 0.00, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 24	(White)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 0.00, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 24	(White)
	0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0, // Node 8  	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 0.00, 0.50, 1.0,		1.0, 1.0, 1.0, // Node 24	(White)
	// Inside Edge 3
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 0.50, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 23	(Purple)
	0.00, 0.00, 1.00, 1.0,		1.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 0.50, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 23	(Purple)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 0.50, 1.00, 1.0,		1.0, 0.0, 1.0, // Node 23	(Purple)
	// Inside Edge 4
	0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.00, 1.00, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 27	(Red)
	0.00, 1.00, 1.00, 1.0,		1.0, 1.0, 1.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 1.00, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 27	(Red)
	0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0, // Node 11 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 1.0, 1.0, // Node 19	(Cyan)
	0.00, 1.00, 0.50, 1.0,		1.0, 0.0, 0.0, // Node 27	(Red)


	// ---- Cube Piece 0 Outline ---- //
	// ----       527-542        ---- //
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 1  	(Blue)
	1.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 2  	(Green)
	0.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 3  	(Cyan)
	
	0.10, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 8  	(Red)
	0.90, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 9  	(Purple)
	0.90, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 	(Yellow)
	0.10, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 11 	(White)

	
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	0.10, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 8  	(Red)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 9  	(Purple)
	1.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 	(Yellow)
	0.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 11 	(White)


	// ---- Cube Piece 1 Outline ---- //
	// ----       543-558        ---- //
	0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 4	(Red)
	1.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 5	(Purple)
	1.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 6	(Yellow)
	0.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 7 	(White)
	
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 17	(Blue)
	0.90, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 18 	(Green)
	0.10, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 19	(Cyan)

	0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	1.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 17	(Blue)
	1.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 18 	(Green)
	0.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 19	(Cyan)


	// ---- Cube Piece 2 Outline ---- //
	// ----       559-574        ---- //
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 1  	(Blue)
	1.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 5	(Purple)
	0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 4	(Red)

	0.10, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 8  	(Red)
	0.90, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 9  	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 17	(Blue)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	0.10, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 8  	(Red)
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 9  	(Purple)
	0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	1.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 17	(Blue)


	// ---- Cube Piece 3 Outline ---- //
	// ----       575-590        ---- //
	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 1  	(Blue)
	1.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 2  	(Green)
	1.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 6	(Yellow)
	1.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 5	(Purple)

	0.90, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 9  	(Purple)
	0.90, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 18 	(Green)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 17	(Blue)

	1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 1  	(Blue)
	0.90, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 9  	(Purple)
	1.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 	(Yellow)
	1.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 5	(Purple)
	0.90, 0.10, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 17	(Blue)
	1.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 18 	(Green)


	// ---- Cube Piece 4 Outline ---- //
	// ----       591-606        ---- //
	1.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 2  	(Green)
	0.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 3  	(Cyan)
	0.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 7 	(White)
	1.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 6	(Yellow)
	
	0.90, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 	(Yellow)
	0.10, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 11 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 19	(Cyan)
	0.90, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 18 	(Green)
	
	1.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 2  	(Green)
	0.90, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 10 	(Yellow)
	0.10, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 11 	(White)
	0.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 3  	(Cyan)
	1.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 6	(Yellow)
	0.90, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 18 	(Green)
	0.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 19	(Cyan)


	// ---- Cube Piece 5 Outline ---- //
	// ----       607-622        ---- //
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	0.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 3  	(Cyan)
	0.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 7 	(White)
	0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 4	(Red)

	0.10, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 8  	(Red)
	0.10, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 11 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 19	(Cyan)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	
	0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 0	(Black)
	0.10, 0.10, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 8  	(Red)
	0.00, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0, // Node 3  	(Cyan)
	0.10, 0.90, 0.10, 1.0,		0.0, 0.0, 0.0, // Node 11 	(White)
	0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 4	(Red)
	0.10, 0.10, 0.90, 1.0, 		0.0, 0.0, 0.0, // Node 16	(Black)
	0.00, 1.00, 1.00, 1.0,		0.0, 0.0, 0.0, // Node 7 	(White)
	0.10, 0.90, 0.90, 1.0,		0.0, 0.0, 0.0, // Node 19	(Cyan)


	// ------------------- Pause Icon ----------------------- //
	// -------------------  623-628   ----------------------- //
	0.00, 0.00, 0.00, 1.0,		1.0, 1.0, 1.0, // Node 0	(White) Vertices all
	0.20, 0.00, 0.00, 1.0,		1.0, 1.0, 1.0, // Node 1 	(White)  set to white
	0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0, // Node 3	(White)  for clarity
	0.20, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0, // Node 2 	(White)
	0.20, 0.00, 0.00, 1.0,		1.0, 1.0, 1.0, // Node 1 	(White)
	0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0, // Node 3	(White)	
  ]);

  makeNULogo();
  makeHollowCylinder();
  makeAxisMarker();
  makeGroundGrid();

  var mySiz = (colorObjects.length + NULogoVerts.length + cylVerts.length + axisVerts.length + gndVerts.length);

  g_vertsMax = mySiz / floatsPerVertex;
  
  var colorShapes = new Float32Array(mySiz);

  for(i=0,j=0; j<colorObjects.length; i++, j++) {
	  colorShapes[i] = colorObjects[j];
  }
  NULogoStart = i;
  for(j=0; j<NULogoVerts.length; i++, j++) {
	  colorShapes[i] = NULogoVerts[j];
  }
  cylStart = i;
  for(j=0; j<cylVerts.length; i++, j++) {
	  colorShapes[i] = cylVerts[j];
  }
  axisStart = i;
  for(j=0; j<axisVerts.length; i++, j++) {
	colorShapes[i] = axisVerts[j];
  }
  gndStart = i;
  for(j=0; j<gndVerts.length; i++, j++) {
	  colorShapes[i] = gndVerts[j];
  }
	
  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * floatsPerVertex, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  // Enable assignment of vertex buffer object's position data

  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

}


function makeNULogo() {

	NULogoVerts = new Float32Array([
		//// ---- Bottom Face ---- ////
		0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,	// Node 0	(Black)
		2.10, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,	// Node 1 	(Blue)
		2.10, 0.00, 1.10, 1.0,		0.0, 1.0, 0.0,	// Node 2	(Green)

		0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,	// Node 0	(Black)
		2.10, 0.00, 1.10, 1.0,		0.0, 1.0, 0.0,	// Node 2	(Green)
		0.00, 0.00, 1.10, 1.0,		0.0, 1.0, 1.0,	// Node 3	(Cyan)
		
		2.10, 0.00, 1.10, 1.0,		0.0, 1.0, 0.0,	// Node 2	(Green)
		0.00, 0.00, 1.10, 1.0,		0.0, 1.0, 1.0,	// Node 3	(Cyan)
		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)

		0.00, 0.00, 1.10, 1.0,		0.0, 1.0, 1.0,	// Node 3	(Cyan)
		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)
		0.00, 0.00, 3.30, 1.0,		1.0, 0.0, 1.0,	// Node 5	(Pink)

		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)
		0.00, 0.00, 3.30, 1.0,		1.0, 0.0, 1.0,	// Node 5	(Pink)
		0.00, 0.00, 6.00, 1.0,		1.0, 1.0, 0.0, 	// Node 6	(Yellow)

		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)
		0.00, 0.00, 6.00, 1.0,		1.0, 1.0, 0.0, 	// Node 6	(Yellow)
		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)

		0.00, 0.00, 6.00, 1.0,		1.0, 1.0, 0.0, 	// Node 6	(Yellow)
		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		0.00, 0.00, 8.85, 1.0,		0.0, 0.0, 0.0,	// Node 8	(Black)

		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		0.00, 0.00, 8.85, 1.0,		0.0, 0.0, 0.0,	// Node 8	(Black)
		1.50, 0.00, 8.85, 1.0,		0.0, 0.0, 1.0,	// Node 9	(Blue)

		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		1.50, 0.00, 8.85, 1.0,		0.0, 0.0, 1.0,	// Node 9	(Blue)
		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)

		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		4.30, 0.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 11	(Cyan)

		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		4.30, 0.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 11	(Cyan)
		5.80, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 12	(Red)

		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		5.80, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 12	(Red)
		5.80, 0.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 13	(Pink)

		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		5.80, 0.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 13	(Pink)
		5.80, 0.00, 5.70, 1.0,		1.0, 1.0, 0.0,	// Node 14	(Yellow)

		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		5.80, 0.00, 5.70, 1.0,		1.0, 1.0, 0.0,	// Node 14	(Yellow)
		5.10, 0.00, 5.70, 1.0,		1.0, 1.0, 1.0,	// Node 15	(White)

		5.80, 0.00, 5.70, 1.0,		1.0, 1.0, 0.0,	// Node 14	(Yellow)
		5.10, 0.00, 5.70, 1.0,		1.0, 1.0, 1.0,	// Node 15	(White)
		5.80, 0.00, 7.75, 1.0,		0.0, 0.0, 0.0, 	// Node 16	(Black)

		5.10, 0.00, 5.70, 1.0,		1.0, 1.0, 1.0,	// Node 15	(White)
		5.80, 0.00, 7.75, 1.0,		0.0, 0.0, 0.0, 	// Node 16	(Black)
		3.70, 0.00, 7.75, 1.0,		0.0, 0.0, 1.0,	// Node 17	(Blue)

		5.80, 0.00, 7.75, 1.0,		0.0, 0.0, 0.0, 	// Node 16	(Black)
		3.70, 0.00, 7.75, 1.0,		0.0, 0.0, 1.0,	// Node 17	(Blue)
		5.80, 0.00, 8.85, 1.0,		0.0, 1.0, 0.0,	// Node 18	(Green)

		3.70, 0.00, 7.75, 1.0,		0.0, 0.0, 1.0,	// Node 17	(Blue)
		5.80, 0.00, 8.85, 1.0,		0.0, 1.0, 0.0,	// Node 18	(Green)
		3.70, 0.00, 8.85, 1.0,		0.0, 1.0, 1.0,	// Node 19	(Cyan)


		//// ---- Top Face ---- ////
		0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	// Node 20	(White)
		2.10, 1.00, 0.00, 1.0,		1.0, 1.0, 0.0,	// Node 21 	(Yellow)
		2.10, 1.00, 1.10, 1.0,		1.0, 0.0, 1.0,	// Node 22	(Pink)

		0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	// Node 20	(White)
		2.10, 1.00, 1.10, 1.0,		1.0, 0.0, 1.0,	// Node 22	(Pink)
		0.00, 1.00, 1.10, 1.0,		1.0, 0.0, 0.0,	// Node 23	(Red)
		
		2.10, 1.00, 1.10, 1.0,		1.0, 0.0, 1.0,	// Node 22	(Pink)
		0.00, 1.00, 1.10, 1.0,		1.0, 0.0, 0.0,	// Node 23	(Red)
		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)

		0.00, 1.00, 1.10, 1.0,		1.0, 0.0, 0.0,	// Node 23	(Red)
		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)
		0.00, 1.00, 3.30, 1.0,		0.0, 1.0, 0.0,	// Node 25	(Green)

		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)
		0.00, 1.00, 3.30, 1.0,		0.0, 1.0, 0.0,	// Node 25	(Green)
		0.00, 1.00, 6.00, 1.0,		0.0, 0.0, 1.0, 	// Node 26	(Blue)

		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)
		0.00, 1.00, 6.00, 1.0,		0.0, 0.0, 1.0, 	// Node 26	(Blue)
		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)

		0.00, 1.00, 6.00, 1.0,		0.0, 0.0, 1.0, 	// Node 26	(Blue)
		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		0.00, 1.00, 8.85, 1.0,		1.0, 1.0, 1.0,	// Node 28	(White)

		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		0.00, 1.00, 8.85, 1.0,		1.0, 1.0, 1.0,	// Node 28	(White)
		1.50, 1.00, 8.85, 1.0,		1.0, 1.0, 0.0,	// Node 29	(Yellow)

		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		1.50, 1.00, 8.85, 1.0,		1.0, 1.0, 0.0,	// Node 29	(Yellow)
		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)

		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)
		4.30, 1.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 31	(Red)

		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)
		4.30, 1.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 31	(Red)
		5.80, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 32	(Cyan)

		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)
		5.80, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 32	(Cyan)
		5.80, 1.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 33	(Green)

		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)
		5.80, 1.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 33	(Green)
		5.80, 1.00, 5.70, 1.0,		0.0, 0.0, 1.0,	// Node 34	(Blue)

		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)
		5.80, 1.00, 5.70, 1.0,		0.0, 0.0, 1.0,	// Node 34	(Blue)
		5.10, 1.00, 5.70, 1.0,		0.0, 0.0, 0.0,	// Node 35	(Black)

		5.80, 1.00, 5.70, 1.0,		0.0, 0.0, 1.0,	// Node 34	(Blue)
		5.10, 1.00, 5.70, 1.0,		0.0, 0.0, 0.0,	// Node 35	(Black)
		5.80, 1.00, 7.75, 1.0,		1.0, 1.0, 1.0, 	// Node 36	(White)

		5.10, 1.00, 5.70, 1.0,		0.0, 0.0, 0.0,	// Node 35	(Black)
		5.80, 1.00, 7.75, 1.0,		1.0, 1.0, 1.0, 	// Node 36	(White)
		3.70, 1.00, 7.75, 1.0,		1.0, 1.0, 0.0,	// Node 37	(Yellow)

		5.80, 1.00, 7.75, 1.0,		1.0, 1.0, 1.0, 	// Node 36	(White)
		3.70, 1.00, 7.75, 1.0,		1.0, 1.0, 0.0,	// Node 37	(Yellow)
		5.80, 1.00, 8.85, 1.0,		1.0, 0.0, 1.0,	// Node 38	(Pink)

		3.70, 1.00, 7.75, 1.0,		1.0, 1.0, 0.0,	// Node 37	(Yellow)
		5.80, 1.00, 8.85, 1.0,		1.0, 0.0, 1.0,	// Node 38	(Pink)
		3.70, 1.00, 8.85, 1.0,		1.0, 0.0, 0.0,	// Node 39	(Red)



		//// ---- Sides ---- ////
		0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,	// Node 0	(Black)
		0.00, 0.00, 8.85, 1.0,		0.0, 0.0, 0.0,	// Node 8	(Black)
		0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	// Node 20	(White)

		0.00, 1.00, 8.85, 1.0,		1.0, 1.0, 1.0,	// Node 28	(White)
		0.00, 0.00, 8.85, 1.0,		0.0, 0.0, 0.0,	// Node 8	(Black)
		0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	// Node 20	(White)
		
		0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,	// Node 0	(Black)
		2.10, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,	// Node 1 	(Blue)
		0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	// Node 20	(White)

		2.10, 1.00, 0.00, 1.0,		1.0, 1.0, 0.0,	// Node 21 	(Yellow)
		2.10, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,	// Node 1 	(Blue)
		0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	// Node 20	(White)

		2.10, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,	// Node 1 	(Blue)
		2.10, 0.00, 1.10, 1.0,		0.0, 1.0, 0.0,	// Node 2	(Green)
		2.10, 1.00, 0.00, 1.0,		1.0, 1.0, 0.0,	// Node 21 	(Yellow)

		2.10, 1.00, 1.10, 1.0,		1.0, 0.0, 1.0,	// Node 22	(Pink)
		2.10, 0.00, 1.10, 1.0,		0.0, 1.0, 0.0,	// Node 2	(Green)
		2.10, 1.00, 0.00, 1.0,		1.0, 1.0, 0.0,	// Node 21 	(Yellow)
		
		2.10, 0.00, 1.10, 1.0,		0.0, 1.0, 0.0,	// Node 2	(Green)
		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)
		2.10, 1.00, 1.10, 1.0,		1.0, 0.0, 1.0,	// Node 22	(Pink)
		
		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)
		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)
		2.10, 1.00, 1.10, 1.0,		1.0, 0.0, 1.0,	// Node 22	(Pink)
		
		0.70, 0.00, 3.30, 1.0,		1.0, 0.0, 0.0,	// Node 4	(Red)
		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)
		
		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		0.70, 1.00, 3.30, 1.0,		0.0, 1.0, 1.0,	// Node 24	(Cyan)
		
		0.70, 0.00, 6.00, 1.0,		1.0, 1.0, 1.0, 	// Node 7	(White)
		4.30, 0.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 11	(Cyan)
		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		
		4.30, 1.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 31	(Red)
		4.30, 0.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 11	(Cyan)
		0.70, 1.00, 6.00, 1.0,		0.0, 0.0, 0.0, 	// Node 27	(Black)
		
		4.30, 0.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 11	(Cyan)
		5.80, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 12	(Red)
		4.30, 1.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 31	(Red)

		5.80, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 32	(Cyan)
		5.80, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 12	(Red)
		4.30, 1.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 31	(Red)
		
		5.80, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// Node 12	(Red)
		5.80, 0.00, 8.85, 1.0,		0.0, 1.0, 0.0,	// Node 18	(Green)
		5.80, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 32	(Cyan)

		5.80, 1.00, 8.85, 1.0,		1.0, 0.0, 1.0,	// Node 38	(Pink)
		5.80, 0.00, 8.85, 1.0,		0.0, 1.0, 0.0,	// Node 18	(Green)
		5.80, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,	// Node 32	(Cyan)
		
		5.80, 0.00, 8.85, 1.0,		0.0, 1.0, 0.0,	// Node 18	(Green)
		3.70, 0.00, 8.85, 1.0,		0.0, 1.0, 1.0,	// Node 19	(Cyan)
		5.80, 1.00, 8.85, 1.0,		1.0, 0.0, 1.0,	// Node 38	(Pink)

		3.70, 1.00, 8.85, 1.0,		1.0, 0.0, 0.0,	// Node 39	(Red)
		3.70, 0.00, 8.85, 1.0,		0.0, 1.0, 1.0,	// Node 19	(Cyan)
		5.80, 1.00, 8.85, 1.0,		1.0, 0.0, 1.0,	// Node 38	(Pink)

		3.70, 0.00, 8.85, 1.0,		0.0, 1.0, 1.0,	// Node 19	(Cyan)
		3.70, 0.00, 7.75, 1.0,		0.0, 0.0, 1.0,	// Node 17	(Blue)
		3.70, 1.00, 8.85, 1.0,		1.0, 0.0, 0.0,	// Node 39	(Red)

		3.70, 1.00, 7.75, 1.0,		1.0, 1.0, 0.0,	// Node 37	(Yellow)
		3.70, 0.00, 7.75, 1.0,		0.0, 0.0, 1.0,	// Node 17	(Blue)
		3.70, 1.00, 8.85, 1.0,		1.0, 0.0, 0.0,	// Node 39	(Red)

		3.70, 0.00, 7.75, 1.0,		0.0, 0.0, 1.0,	// Node 17	(Blue)
		5.10, 0.00, 5.70, 1.0,		1.0, 1.0, 1.0,	// Node 15	(White)
		3.70, 1.00, 7.75, 1.0,		1.0, 1.0, 0.0,	// Node 37	(Yellow)

		5.10, 1.00, 5.70, 1.0,		0.0, 0.0, 0.0,	// Node 35	(Black)
		5.10, 0.00, 5.70, 1.0,		1.0, 1.0, 1.0,	// Node 15	(White)
		3.70, 1.00, 7.75, 1.0,		1.0, 1.0, 0.0,	// Node 37	(Yellow)
		
		5.10, 0.00, 5.70, 1.0,		1.0, 1.0, 1.0,	// Node 15	(White)
		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		5.10, 1.00, 5.70, 1.0,		0.0, 0.0, 0.0,	// Node 35	(Black)

		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)
		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		5.10, 1.00, 5.70, 1.0,		0.0, 0.0, 0.0,	// Node 35	(Black)
		
		5.10, 0.00, 3.00, 1.0,		0.0, 1.0, 0.0,	// Node 10	(Green)
		1.50, 0.00, 8.85, 1.0,		0.0, 0.0, 1.0,	// Node 9	(Blue)
		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)

		1.50, 1.00, 8.85, 1.0,		1.0, 1.0, 0.0,	// Node 29	(Yellow)
		1.50, 0.00, 8.85, 1.0,		0.0, 0.0, 1.0,	// Node 9	(Blue)
		5.10, 1.00, 3.00, 1.0,		1.0, 0.0, 1.0,	// Node 30	(Pink)

		1.50, 0.00, 8.85, 1.0,		0.0, 0.0, 1.0,	// Node 9	(Blue)
		0.00, 0.00, 8.85, 1.0,		0.0, 0.0, 0.0,	// Node 8	(Black)
		1.50, 1.00, 8.85, 1.0,		1.0, 1.0, 0.0,	// Node 29	(Yellow)
		
		0.00, 1.00, 8.85, 1.0,		1.0, 1.0, 1.0,	// Node 28	(White)
		0.00, 0.00, 8.85, 1.0,		0.0, 0.0, 0.0,	// Node 8	(Black)
		1.50, 1.00, 8.85, 1.0,		1.0, 1.0, 0.0,	// Node 29	(Yellow)
	])
}


function makeHollowCylinder() {
	var locs = new Float32Array([
		0, Math.PI/12, Math.PI/6, Math.PI/4, Math.PI/3, Math.PI*5/12, 
		Math.PI/2, Math.PI*7/12, Math.PI*2/3, Math.PI*3/4, Math.PI*5/6, Math.PI*11/12,
		Math.PI, Math.PI*13/12, Math.PI*7/6, Math.PI*5/4, Math.PI*4/3, Math.PI*17/12,
		Math.PI*3/2, Math.PI*19/12, Math.PI*5/3, Math.PI*7/4, Math.PI*11/6, Math.PI*23/12,
	]);

	var vertsPerLoop = 14;
	var floatsPerLoop = vertsPerLoop*floatsPerVertex;

	var radInner = 1;
	var radOuter = 1.2;
	var halfThickness = 0.2;

	var outerTopColr = new Float32Array([1.0, 0.0, 1.0]);
	var outerBotColr = new Float32Array([0.0, 1.0, 0.0]);

	var innerTopColr = new Float32Array([0.0, 0.0, 1.0]);
	var innerBotColr = new Float32Array([1.0, 1.0, 0.0]);
	
	cylVerts = new Float32Array(floatsPerLoop*locs.length);

	for (i=0, j=0; i<locs.length; i++, j+=floatsPerLoop) {
		// Node i on outer BOTTOM
		cylVerts[j  ] = radOuter*Math.cos(locs[i]);
		cylVerts[j+1] = radOuter*Math.sin(locs[i]);
		cylVerts[j+2] = -halfThickness;
		cylVerts[j+3] = 1.0;
		cylVerts[j+4] = outerBotColr[0];
		cylVerts[j+5] = outerBotColr[1];
		cylVerts[j+6] = outerBotColr[2];

		// Node i on inner BOTTOM
		cylVerts[j+7] = radInner*Math.cos(locs[i]);
		cylVerts[j+8] = radInner*Math.sin(locs[i]);
		cylVerts[j+9] = -halfThickness;
		cylVerts[j+10] = 1.0;
		cylVerts[j+11] = innerBotColr[0];
		cylVerts[j+12] = innerBotColr[1];
		cylVerts[j+13] = innerBotColr[2];

		// Node i+1 on outer BOTTOM
		cylVerts[j+14] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+15] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+16] = -halfThickness;
		cylVerts[j+17] = 1.0;
		cylVerts[j+18] = outerBotColr[0];
		cylVerts[j+19] = outerBotColr[1];
		cylVerts[j+20] = outerBotColr[2];
		
		
		// Node i on inner BOTTOM
		cylVerts[j+21] = radInner*Math.cos(locs[i]);
		cylVerts[j+22] = radInner*Math.sin(locs[i]);
		cylVerts[j+23] = -halfThickness;
		cylVerts[j+24] = 1.0;
		cylVerts[j+25] = innerBotColr[0];
		cylVerts[j+26] = innerBotColr[1];
		cylVerts[j+27] = innerBotColr[2];

		// Node i+1 on inner BOTTOM
		cylVerts[j+28] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+29] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+30] = -halfThickness;
		cylVerts[j+31] = 1.0;
		cylVerts[j+32] = innerBotColr[0];
		cylVerts[j+33] = innerBotColr[1];
		cylVerts[j+34] = innerBotColr[2];

		// Node i+1 on inner TOP
		cylVerts[j+35] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+36] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+37] = halfThickness;
		cylVerts[j+38] = 1.0;
		cylVerts[j+39] = innerTopColr[0];
		cylVerts[j+40] = innerTopColr[1];
		cylVerts[j+41] = innerTopColr[2];

		// Node i on inner BOTTOM
		cylVerts[j+42] = radInner*Math.cos(locs[i]);
		cylVerts[j+43] = radInner*Math.sin(locs[i]);
		cylVerts[j+44] = -halfThickness;
		cylVerts[j+45] = 1.0;
		cylVerts[j+46] = innerBotColr[0];
		cylVerts[j+47] = innerBotColr[1];
		cylVerts[j+48] = innerBotColr[2];

		// Node i on inner TOP
		cylVerts[j+49] = radInner*Math.cos(locs[i]);
		cylVerts[j+50] = radInner*Math.sin(locs[i]);
		cylVerts[j+51] = halfThickness;
		cylVerts[j+52] = 1.0;
		cylVerts[j+53] = innerTopColr[0];
		cylVerts[j+54] = innerTopColr[1];
		cylVerts[j+55] = innerTopColr[2];

		// Node i on outer TOP
		cylVerts[j+56] = radOuter*Math.cos(locs[i]);
		cylVerts[j+57] = radOuter*Math.sin(locs[i]);
		cylVerts[j+58] = halfThickness;
		cylVerts[j+59] = 1.0;
		cylVerts[j+60] = outerTopColr[0];
		cylVerts[j+61] = outerTopColr[1];
		cylVerts[j+62] = outerTopColr[2];

		// Node i+1 on inner TOP
		cylVerts[j+63] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+64] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+65] = halfThickness;
		cylVerts[j+66] = 1.0;
		cylVerts[j+67] = innerTopColr[0];
		cylVerts[j+68] = innerTopColr[1];
		cylVerts[j+69] = innerTopColr[2];

		// Node i+1 on outer TOP
		cylVerts[j+70] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+71] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+72] = halfThickness;
		cylVerts[j+73] = 1.0;
		cylVerts[j+74] = outerTopColr[0];
		cylVerts[j+75] = outerTopColr[1];
		cylVerts[j+76] = outerTopColr[2];

		// Node i+1 on outer BOTTOM
		cylVerts[j+77] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+78] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+79] = -halfThickness;
		cylVerts[j+80] = 1.0;
		cylVerts[j+81] = outerBotColr[0];
		cylVerts[j+82] = outerBotColr[1];
		cylVerts[j+83] = outerBotColr[2];

		// Node i on outer TOP
		cylVerts[j+84] = radOuter*Math.cos(locs[i]);
		cylVerts[j+85] = radOuter*Math.sin(locs[i]);
		cylVerts[j+86] = halfThickness;
		cylVerts[j+87] = 1.0;
		cylVerts[j+88] = outerTopColr[0];
		cylVerts[j+89] = outerTopColr[1];
		cylVerts[j+90] = outerTopColr[2];

		// Node i on outer BOTTOM
		cylVerts[j+91] = radOuter*Math.cos(locs[i]);
		cylVerts[j+92] = radOuter*Math.sin(locs[i]);
		cylVerts[j+93] = -halfThickness;
		cylVerts[j+94] = 1.0;
		cylVerts[j+95] = outerBotColr[0];
		cylVerts[j+96] = outerBotColr[1];
		cylVerts[j+97] = outerBotColr[2];
		

	}

}


function makeAxisMarker() {
	axisVerts = new Float32Array([
		0.00, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// X-axis marker
		1.00, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,	// 
		0.00, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0,	// Y-axis marker
		0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0,	//
		0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,	// Z-axis marker
		0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 1.0, 	//	  
	])
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

	var xcount = 100;			// # of lines to draw in x,y to make the grid.
	var ycount = 100;		
	var xymax = 100.0;			// grid size; extends to cover +/-xymax in x and y.
 	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
 	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
 	
	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v  )*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
	}
}


////  ------------------------------------------------------------------ //// 


//// --------------- Part 1 - Plane Drawing Functions ------------------ ////

function DrawPlaneBody() {
	// Draw 3D Body
	gl.drawArrays(gl.TRIANGLES, 0, 63);
	// Draw black outline
	
	gl.drawArrays(gl.LINE_LOOP, 153, 4);
	gl.drawArrays(gl.LINE_LOOP, 157, 4);
	gl.drawArrays(gl.LINES, 161, 8);
	gl.drawArrays(gl.LINE_STRIP, 169, 7);
	gl.drawArrays(gl.LINE_STRIP, 176, 7);
	gl.drawArrays(gl.LINE_LOOP, 183, 3);
	gl.drawArrays(gl.LINE_STRIP, 186, 6);
	
}
function DrawPlaneWing() {
	// Draw 3D wing
	gl.drawArrays(gl.TRIANGLES, 63, 48);
	// Draw wing outline
	gl.drawArrays(gl.LINE_LOOP, 192, 3);
	gl.drawArrays(gl.LINE_LOOP, 195, 3);
	gl.drawArrays(gl.LINE_LOOP, 198, 7);
	gl.drawArrays(gl.LINE_LOOP, 205, 7);
	gl.drawArrays(gl.LINE_LOOP, 212, 3);
}
function DrawPlaneAileron() {
	// Draw 3D aileron
	gl.drawArrays(gl.TRIANGLES, 111, 18);
	// Draw aileron outline
	gl.drawArrays(gl.LINE_LOOP, 215, 10)
}
function DrawPlaneProp() {
	// Draw 3D prop
	gl.drawArrays(gl.TRIANGLES, 129, 24);
	// Draw prop outline
	gl.drawArrays(gl.LINE_STRIP, 225, 5);
	gl.drawArrays(gl.LINE_LOOP, 230, 3);
	gl.drawArrays(gl.LINE_LOOP, 233, 6);
}

// Draw plane with animated prop, wings, and ailerons
function DrawPlane() {
	pushMatrix(mvpMatrix);

	DrawPlaneBody();

	// Draw and sweep right wing
	pushMatrix(mvpMatrix);
	mvpMatrix.translate(0.0, 0.1, 0.75);
	mvpMatrix.rotate(-0.11*g_angle01Rate, 0,1,0);	// Sweep wings back at high speed
	mvpMatrix.translate(0.0, -0.1, -0.75);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlaneWing();
	// Draw and pitch right aileron
	mvpMatrix.translate(0.0, 0.1, 0.50);
	mvpMatrix.rotate(-g_angle_wingpitch, 1, 0, 0);
	mvpMatrix.translate(0.0, -0.1, -0.50);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlaneAileron();
	
	// Sweep left wing
	mvpMatrix = popMatrix();
	pushMatrix(mvpMatrix);
	mvpMatrix.scale(-1, 1, 1);
	mvpMatrix.translate(-0.2, 0.1, 0.75);
	mvpMatrix.rotate(-0.11*g_angle01Rate, 0,1,0);	// Sweep wings back at high speed
	mvpMatrix.translate(0.0, -0.1, -0.75);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlaneWing();
	// Draw and pitch Left aileron
	mvpMatrix.translate(0.0, 0.1, 0.50);
	mvpMatrix.rotate(g_angle_wingpitch, 1, 0, 0);
	mvpMatrix.translate(0.0, -0.1, -0.50);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlaneAileron();


	// Draw rotating props
	mvpMatrix = popMatrix();
	mvpMatrix.translate(0.1, 0.05, 0.0);
	mvpMatrix.rotate(15*g_angle01, 0, 0, 1);
	mvpMatrix.translate(-0.1, -0.05, 0.0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlaneProp();
	mvpMatrix.translate(0.2, 0.0, 0.0);
	mvpMatrix.scale(-1, 1, 1);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlaneProp();

	mvpMatrix = popMatrix();
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
}
// ------------------------------------------------------------------ //



// ------------ Part 2 - Folding Cube Drawing Functions ------------- //

// Draw a particular side of the cube specified by idx
function drawCubeSide(idx) {
	var start3DVertex = 239+(48*idx);		// First vertex for the 3D object
	var startOLVertex = 527+(16*idx);	// First vertex for the outline
	// Draw 3D Object
	gl.drawArrays(gl.TRIANGLES, start3DVertex, 48);
	// Draw object outline
	gl.drawArrays(gl.LINE_LOOP, startOLVertex, 4);
	gl.drawArrays(gl.LINE_LOOP, startOLVertex+4, 4);
	gl.drawArrays(gl.LINES, startOLVertex+8, 8);
}


function drawFoldingCube() {
	pushMatrix(mvpMatrix);

	// Draw cube base
	drawCubeSide(0);

	mvpMatrix.rotate(-g_angle_box, 0, 1, 0);

	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawCubeSide(5);

	mvpMatrix.translate(0.0, 1.0, 0.0);
	mvpMatrix.rotate(g_angle_box, 0, 0, 1);
	mvpMatrix.translate(0.0, -1.0, 0.0);
	
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawCubeSide(4);

	mvpMatrix.translate(1.0, 1.0, 0.0);
	mvpMatrix.rotate(g_angle_box, 0, 0, 1);
	mvpMatrix.translate(-1.0, -1.0, 0.0);

	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawCubeSide(3);

	mvpMatrix.translate(1.0, 0.0, 0.0);
	mvpMatrix.rotate(g_angle_box, 0, 0, 1);
	mvpMatrix.translate(-1.0, 0.0, 0.0);

	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawCubeSide(2);

	mvpMatrix.translate(0.0, 0.0, 1.0);
	mvpMatrix.rotate(g_angle_box, 1, 0, 0);
	mvpMatrix.translate(0.0, 0.0, -1.0);

	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawCubeSide(1);
	
	// Restore original mvpMatrix
	mvpMatrix = popMatrix();
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
}
//// ------------------------------------------------------------------ ////


//// ------------ EXTRA Part - Pause Icon ----------------------------- ////
function drawSinglePause() {
	gl.drawArrays(gl.TRIANGLES, 623, 6);
}

function drawPauseIcon() {
	pushMatrix(mvpMatrix);

	// Draw left half of pause
	drawSinglePause();
	// Draw right half of pause
	mvpMatrix.translate(0.5, 0.0, 0.0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawSinglePause();

	// Restore original matrix
	mvpMatrix = popMatrix();
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
}
//// ------------------------------------------------------------------ ////


//// ---------- Draw NU Logo ------------------------------------------ ////
function drawNULogo() {
	gl.drawArrays(gl.TRIANGLES,
				  NULogoStart/floatsPerVertex,
				  NULogoVerts.length/floatsPerVertex);
}
//// ----------------------------------------------------------------- ////

//// ---------- Draw Hollow Cylinder --------------------------------- ////
function drawHollowCylinder() {
	gl.drawArrays(gl.TRIANGLE_STRIP,
		cylStart/floatsPerVertex,
		cylVerts.length/floatsPerVertex);
}
//// ---------------------------------------------------------------- ////


//// ---------- Draw Axis Maker --------------------------------------- ////
function drawAxisMarker() {
	gl.drawArrays(gl.LINES,
				  axisStart/floatsPerVertex,
				  axisVerts.length/floatsPerVertex);
}
//// ------------------------------------------------------------------ ////


//// ----------- Draw Ground ------------------------------------------ ////
function drawGroundGrid() {
	gl.drawArrays(gl.LINES, 
				  gndStart/floatsPerVertex,
				  gndVerts.length/floatsPerVertex);
}
//// ------------------------------------------------------------------ ////







function drawAll() {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Define viewport aspect ratio
	var vpAspect = g_canvas.width / g_canvas.height;

	
	mvpMatrix.setIdentity();	// Define 'world-space' coords
	pushMatrix(mvpMatrix);

	// -- PERSPECTIVE Viewport -- //
	gl.viewport(0,
				0,
				g_canvas.width,
				g_canvas.height);

	// Define perspective parameters	
	var FOV = 30.0;
	var zNear = 1.0;
	var zFar = 20.0;
				
	mvpMatrix.setPerspective(
		FOV,		// FOVY: top-to-bottom vertical image angle
	  	vpAspect,	// Image Aspect Ratio
		zNear,		// Camera z-near distance 	(nearest distance to camera we render)
		zFar);		// Camera z-far distance	(farthest distance from camera we render)
		
	mvpMatrix.lookAt(
		e_x, e_y, e_z,		// Camera location
		L_x, L_y, L_z,		// Look-at point
		 0 ,  0 ,  1 );		// View UP vector

	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawAxisMarker();

	drawScene();
	//-------------------//

	
	mvpMatrix = popMatrix();

	/*
	// -- ORTHO Viewport -- //
	gl.viewport(g_canvas.width/2,
				0,
				g_canvas.width/2,
				g_canvas.height);

	var orthoDist = (zFar-zNear)/6;

	mvpMatrix.setOrtho(
		-orthoDist*vpAspect,	// Scale b/c FOV only corrects vertical?
		 orthoDist*vpAspect,
		-orthoDist,
		 orthoDist,
		 zNear,
		 zFar
	);
	
	mvpMatrix.lookAt(
		e_x, e_y, e_z,		// Camera location
		L_x, L_y, L_z,		// Look-at point
		0 ,  0 ,  1 );		// View UP vector
		  
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawAxisMarker();
		  
	drawScene();
	*/

}

function drawScene() {
	pushMatrix(mvpMatrix);

	pushMatrix(mvpMatrix);

	// --------- Draw Expanding Cube ------------- //
	mvpMatrix.translate(-0.5, -0.75, 0.0);
	mvpMatrix.scale(0.3, 0.3, 0.3);
	mvpMatrix.translate(0.5, 0.5, 0.0);
	mvpMatrix.rotate(90, 0, 0, 1);
	mvpMatrix.translate(-0.5, 0.5, 0.0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawFoldingCube();
	// ------------------------------------------ //

	mvpMatrix = popMatrix();
	pushMatrix(mvpMatrix);

	// ------- Draw Rotating Rings -------------- //
	mvpMatrix.translate(-1.0, 0.5, 0.0);	// Move away from origin
	mvpMatrix.rotate(90, 0, 1, 0);			// Rotate upright
	mvpMatrix.scale(0.2, 0.2, 0.2);			// Scale down model
	mvpMatrix.translate(-2.0, 1.0, 0.0);	// Move out of grounds
	mvpMatrix.rotate(g_angle_gyro, 1, 0, 0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawHollowCylinder();

	mvpMatrix.rotate(g_angle_gyro, 0, 1, 0);
	mvpMatrix.scale(1.0/1.2, 1.0/1.2, 1.0/1.2);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawHollowCylinder();

	mvpMatrix.rotate(g_angle_gyro, 1, 0, 0);
	mvpMatrix.scale(1.0/1.2, 1.0/1.2, 1.0/1.2);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawHollowCylinder();

	mvpMatrix.rotate(g_angle_gyro, 0, 1, 0);
	mvpMatrix.scale(1.0/1.2, 1.0/1.2, 1.0/1.2);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawHollowCylinder();

	mvpMatrix.rotate(g_angle_gyro, 1, 0, 0);
	mvpMatrix.scale(1.0/1.2, 1.0/1.2, 1.0/1.2);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawHollowCylinder();
	// ------------------------------------------- //

	mvpMatrix = popMatrix();
	pushMatrix(mvpMatrix);

	// ----------- Draw Rotating Plane ----------- //
	// Shift to lower left quadrant
	mvpMatrix.translate(0.0, 0.0, 0.5);  		// Raise up from ground plane
	mvpMatrix.scale(0.6, 0.6, 0.6);			 	// Scale down model
	mvpMatrix.rotate(90, 1, 0, 0);
	mvpMatrix.rotate(g_angle01, 0, .75, 0); 	// Rotate plane around center point
  
	mvpMatrix.translate(-4.0, 0.0, -0.5);		// Translate plane out from center of rotation
  	mvpMatrix.scale(0.4, 0.4, 0.4);				// Scale down plane
	
	mvpMatrix.translate(0.1, 0.1, 0.0);			// Shift rotation axis to center of body
	mvpMatrix.rotate(g_angle_roll, 0, 0, 1);	// Roll the plane
	mvpMatrix.translate(-0.1, -0.1, 0.0);		// Shift rotation axis back for drawing
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlane();							// Draw animated plane in rotation
	// ------------------------------------------- //
	
	mvpMatrix = popMatrix();
	pushMatrix(mvpMatrix);
	
	// -------- Draw stationary plane ------------ //
	//   For observing prop, wings, and aileron    //
	mvpMatrix.translate(2, -1, 0.0);  		// Shift out from origin
	mvpMatrix.rotate(90, 1, 0, 0);			// Rotate to be upright on ground plane
	mvpMatrix.rotate(90, 0, 1, 0);			// Rotate to face camera starting position
	mvpMatrix.scale(0.7, 0.7, -0.7);		// Shrink model
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	DrawPlane();	
	// ------------------------------------------- //

	mvpMatrix = popMatrix();
	pushMatrix(mvpMatrix);
	
	// --------- Draw NU Logo --------------- //
	mvpMatrix.translate(0.5, 0.8, 0);	// Shift to correct location on the canvas
	mvpMatrix.scale(0.1, 0.1, 0.1);		// Shrink model

	// Rotate around center of logo
	mvpMatrix.translate(2.9, 0.5, 4.425);			// Translate so that rotation happens at center of cube
	
	quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Rotate with quaternion
	mvpMatrix.concat(quatMatrix);

	pushMatrix(mvpMatrix);
	mvpMatrix.scale(4,4,4);
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawAxisMarker();

	mvpMatrix = popMatrix();
	mvpMatrix.translate(-2.9, -0.5,  -4.425);		// Translate back for drawing

	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawNULogo();
	// --------------------------------------------- //


	// --------- Draw Pause Icon if necessary ------ //
	if (Plane_paused) {
		mvpMatrix.setTranslate(-0.9, -0.8, 0.0);		// Shift to lower left corner
		mvpMatrix.scale(0.5, 1, -1);					// Flip to left hand coordinates and downscale x b/c of canvas aspect ratio
		mvpMatrix.scale(0.1, 0.1, 0.1);					// Scale down pause icon

		gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
		drawPauseIcon();
	}
	// --------------------------------------------- //

	mvpMatrix = popMatrix();

	// -------------- Draw Ground Grid ------------ //
	mvpMatrix.scale(0.1, 0.1, 0.1);
	
	gl.uniformMatrix4fv(g_modelMatLoc, false, mvpMatrix.elements);
	drawGroundGrid();
	// --------------------------------------------- //
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate() {
//==============================================================================

  // Calculate the elapsed time
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;

	// Open/close box based on current state of boolean
	if (!X_keyActive && C_keyActive && (g_angle_box > g_angle_boxMin)) {
		// Fold up the box
		var newBoxAngle = g_angle_box - (g_angle_boxRate * elapsed)/1000.0;
		g_angle_box = Math.max(g_angle_boxMin, newBoxAngle);

	} else if (X_keyActive && !C_keyActive && (g_angle_box < g_angle_boxMax)) {
		// Open up the box
		var newBoxAngle = g_angle_box + (g_angle_boxRate * elapsed)/1000.0;
		g_angle_box = Math.min(g_angle_boxMax, newBoxAngle);
	}
	// If both/neither X and C pressed, then maintain current opening

	// ---- Pitch Adjustments ---- //
	// Horizontal rotation
	if (L_arrowActive && !R_arrowActive) {
		// Just L arrow pressed ---> Rotate left by 1 degree
		console.log("Left arrow pressed: Rotate left!");
		theta_H += 1*Math.PI/180;
	} else if (!L_arrowActive && R_arrowActive) {
		// Just R arrow pressed ---> Rotate right by 1 degree
		console.log("Right arrow pressed: Rotate right!");
		theta_H -= 1*Math.PI/180;
	}
	// Ensure theta_H bounded between -pi and pi
	if (theta_H > Math.PI) {
		theta_H -= 2*Math.PI;
	} else if (theta_H < -Math.PI) {
		theta_H += 2*Math.PI;
	}

	// Vertical rotation
	if (U_arrowActive && !D_arrowActive) {
		// Just U arrow pressed ---> Rotate up
		console.log("Up arrow pressed: Rotate up!");
		// Rotate by 1 degree and limit to within PI/2
		theta_V += 1*Math.PI/180;
		theta_V = Math.min(theta_V, Math.PI/2);
	} else if (!U_arrowActive && D_arrowActive) {
		console.log("Down arrow pressed: Rotate down!");
		// Rotate by 1 degree and limit to within PI/2
		theta_V -= 1*Math.PI/180
		theta_V = Math.max(theta_V, -Math.PI/2);
	}
	
	// Update lookat position
	L_x = e_x + Math.cos(theta_H);
	L_y = e_y + Math.sin(theta_H);
	L_z = e_z + Math.sin(theta_V);



	// Move forward
	if (W_keyActive && !S_keyActive) {
		// Just W key pressed ---> Move forward
		console.log("W key pressed: Move forward!");
		e_x += Math.cos(theta_H)/10;
		e_y += Math.sin(theta_H)/10;
		e_z += Math.sin(theta_V)/10;

		L_x += Math.cos(theta_H)/10;
		L_y += Math.sin(theta_H)/10;
		L_z += Math.sin(theta_V)/10;
		
	} else if (!W_keyActive && S_keyActive) {
		// Just S key pressed ---> Move back
		console.log("S key pressed: Move backwards!");
		e_x -= Math.cos(theta_H)/10;
		e_y -= Math.sin(theta_H)/10;
		e_z -= Math.sin(theta_V)/10;
		
		L_x -= Math.cos(theta_H)/10;
		L_y -= Math.sin(theta_H)/10;
		L_z -= Math.sin(theta_V)/10;
	}

	if (A_keyActive && !D_keyActive) {
		// Just A key pressed ---> Strafe left
		console.log("A key pressed: Strafe left!");
		e_x += Math.cos(theta_H+(Math.PI/2))/10;
		e_y += Math.sin(theta_H+(Math.PI/2))/10;
		
		L_x += Math.cos(theta_H+(Math.PI/2))/10;
		L_y += Math.sin(theta_H+(Math.PI/2))/10;
	} else if (!A_keyActive && D_keyActive) {
		// Just D key pressed ---> Strafe right
		console.log("D key pressed: Strafe right!");
		e_x -= Math.cos(theta_H+(Math.PI/2))/10;
		e_y -= Math.sin(theta_H+(Math.PI/2))/10;
		
		L_x -= Math.cos(theta_H+(Math.PI/2))/10;
		L_y -= Math.sin(theta_H+(Math.PI/2))/10;
	}


	
  	// If currently paused, do not update plane animations
  	if (Plane_paused) {
		return;
	}

	/*
	if (W_keyActive && !S_keyActive) {
		// Just W key pressed ---> Accelerate
		g_angle01Rate = Math.min(g_angle01Rate+g_angle01Accel, g_angle01RateMax)
	} else if (!W_keyActive && S_keyActive) {
		// Just S key pressed ---> Deccelerate
		g_angle01Rate = Math.max(g_angle01Rate-g_angle01Accel, g_angle01RateMin)
	}
	// If neither/both UP and DOWN arrow pressed maintain current speed
	*/

	var newAngle = g_angle01 + (g_angle01Rate * elapsed) / 1000.0;
	if(newAngle > 180.0) newAngle = newAngle - 360.0;
	if(newAngle <-180.0) newAngle = newAngle + 360.0;
	g_angle01 = newAngle;

	// Calculate roll angle based on the pitch of the wings
	var newRollAngle = g_angle_roll - (10*g_angle_wingpitch * elapsed) / 1000.0;
	if(newRollAngle > 180.0) newRollAngle = newRollAngle - 360.0;
	if(newRollAngle <-180.0) newRollAngle = newRollAngle + 360.0;
	g_angle_roll = newRollAngle;
	
	var newGyroAngle = g_angle_gyro + (g_angle_gyroRate*elapsed) / 1000.0;
	if(newGyroAngle > 180.0) newGyroAngle = newGyroAngle - 360.0;
	if(newGyroAngle < 180.0) newGyroAngle = newGyroAngle + 360.0;
	g_angle_gyro = newGyroAngle;
  
}

//==================HTML Button Callbacks======================

function angleSubmit() {
// Process angle from HTML text input

	// Read HTML edit-box contents:
	var UsrTxt = document.getElementById('usrAngle').value;	
	var usrNumber = parseFloat(UsrTxt); // convert string to float number 
	if ((usrNumber < 180) && (usrNumber > -180)) {
		// User entered valid value
		g_angle01 = usrNumber;
		document.getElementById('usrAngle').style = "";
		document.getElementById('EditBoxOut').innerHTML ='You Typed: '+UsrTxt;
	} else {
		// User entered invalid value
		document.getElementById('usrAngle').style = "background-color: pink;";
		document.getElementById('EditBoxOut').innerHTML ='You Typed: '+UsrTxt+'  - which is not a valid entry. Please enter a valid numb between -180 and 180.';
	}

  	console.log('angleSubmit: UsrTxt:', UsrTxt); // print in console, and
};



//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	console.log('ev.button=' + ev.button);
	if (ev.target == document.getElementById('webgl')) {
		// Only set mouse dragging flag if clicked within the CVV canvas
		g_isDrag = true;

  		var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  		var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  		var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  
		// Convert to Canonical View Volume (CVV) coordinates too:
  		var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
  							 (g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
							 (g_canvas.height/2);

		// Record where mouse dragging began
		g_xMclik = x;			
		g_yMclik = y;
		// report on console
		console.log('Mouse At: '+x.toFixed(5)+', '+y.toFixed(5));
	}


};

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by amount measured in CVV coords
var res = 5;
var qTmp = new Quaternion(0,0,0,1);		// Temporary quaternion object

// Project drag in canvas to XY plane in CVV
var xAxisRot = -ydrag*Math.sin(theta_H) + xdrag*-Math.sin(theta_V)*Math.cos(theta_H);
var yAxisRot = ydrag*Math.cos(theta_H) + xdrag*-Math.sin(theta_V)*Math.sin(theta_H);
var zAxisRot = xdrag*Math.abs(Math.cos(theta_V));

var dist = Math.sqrt(xdrag**2 + ydrag**2);
qNew.setFromAxisAngle(xAxisRot + 0.0001, yAxisRot + 0.0001, zAxisRot + 0.0001, dist*150.0);
//qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);

qTmp.multiply(qNew, qTot);	// Aply new rotation to current rotation

qTot.copy(qTmp);
}

function myMouseMove(ev) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  	var rect = ev.target.getBoundingClientRect();			// get canvas corners in pixels
  	var xp = ev.clientX - rect.left;						// x==0 at canvas left edge
	var yp = g_canvas.height - (ev.clientY - rect.top);		// y==0 at canvas bottom edge
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  	var x = (xp - g_canvas.width/2)  / 				// move origin to center of canvas and
  						 (g_canvas.width/2);		// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height/2) /				// -1 <= y < +1.
							 (g_canvas.height/2);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);

	dragQuat(x-g_xMclik, y-g_yMclik);		// Update quaternions

	// Report new mouse position & how far we moved on webpage:
	console.log('Mouse At: '+x.toFixed(5)+', '+y.toFixed(5));
	console.log('Mouse Drag: '+(x - g_xMclik).toFixed(5)+', '+(y - g_yMclik).toFixed(5));

	// Make NEXT drag-measurement from here.
	g_xMclik = x;		
	g_yMclik = y;
};

function myMouseUp(ev) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;

  	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
 	var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
  						 (g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
							 (g_canvas.height/2);
	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	if (g_isDrag) {
		// Accumulate any final bit of dragging we did
		g_xMdragTot += (x - g_xMclik);
		g_yMdragTot += (y - g_yMclik);

		// Update quaternion
		dragQuat(x-g_xMclik, y-g_yMclik);

		// Report new mouse position:
		console.log('Mouse At: '+x.toFixed(5)+', '+y.toFixed(5));
		console.log('myMouseUp: g_xMdragTot,g_yMdragTot =',g_xMdragTot,',\t',g_yMdragTot);
	}
	g_isDrag = false;
};

function myKeyDown(kev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard;
/*
// Report EVERYTHING in console:
  	console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key, 
              "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
              "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);
	*/
 
	switch(kev.code) {
		case "KeyP":
			Plane_paused = !Plane_paused;
			console.log("Plane_paused= " + Plane_paused);
			break;

		//-------------- WASD navigation -----------------
		case "KeyW":
			W_keyActive = true;
			break;
		case "KeyA":
			A_keyActive = true;
			break;
    	case "KeyD":
			D_keyActive = true;
			break;
		case "KeyS":
			S_keyActive = true;
			break;
		//-------------- Arrow controls ------------------
		case "ArrowLeft":
			L_arrowActive = true;
			break;
		case "ArrowRight":
			R_arrowActive = true;
			break;
		case "ArrowUp":
			U_arrowActive = true;
			break;
		case "ArrowDown":
			D_arrowActive = true;
			break;
		// ------------ Open and close box ----------------
		case "KeyX":
			X_keyActive = true;
			break;
		case "KeyC":
			C_keyActive = true;
			break;
    default:
      console.log("UNUSED!");
      break;
	}
}

function myKeyUp(kev) {
//===============================================================================
// Called when user releases ANY key on the keyboard; captures scancodes well
	switch(kev.code) {
		case "KeyW":
			W_keyActive = false;
			break;
		case "KeyA":
			A_keyActive = false;
			break;
		case "KeyS":
			S_keyActive = false;
			break;
		case "KeyD":
			D_keyActive = false;
			break;
		case "ArrowLeft":
			L_arrowActive = false;
			break;
		case "ArrowRight":
			R_arrowActive = false;
			break;
		case "ArrowUp":
			U_arrowActive = false;
			break;
		case "ArrowDown":
			D_arrowActive = false;
			break;
		case "KeyX":
			X_keyActive = false;
			break;
		case "KeyC":
			C_keyActive = false;
			break;

	}
	console.log('myKeyUp()--code='+kev.code+' released.');
}
