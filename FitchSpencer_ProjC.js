/*
Comp_Sci 351-1 : Project C
Name: Spencer Fitch
Email: SpencerFitch2022@u.northwestern.edu
*/

/*
// TODO
	- Set up material switching on the sphere
		- Use DDL of materials to select
	- Clean up HTML (css file?)

*/


// Global Variables
//------------For WebGL-----------------------------------------------
var gl;           // webGL Rendering Context. Set in main(), used everywhere.
var g_canvas = document.getElementById('webgl');     
				  // our HTML-5 canvas object that uses 'gl' for drawing.
	  
				  
// ----------For Vertex Buffers---------------------------------
var floatsPerVertex = 7;		// # floats/vertex orinally
var floatsPerVertexNorm = 10;	// # floats/vertex with surface normals added


//------------For Animation---------------------------------------------
var pauseAnimations = false;	// Control whether to update animations
var g_lastMS = Date.now();    	// Timestamp for most-recently-drawn image (ms)					

var g_angle_gyro = 0;			// Angle of rotating ring
var g_angle_gyroRate = 30;		// Rate of rotation for rotating ring (deg/sec)

var openingBox = false;
var g_angle_box = 90.0;			// Initial angle between the faces of the cube
var g_angle_boxRate = 45;		// Rotation speed for sides of cube
var g_angle_boxMax = 90.0;		// Maximum amount cube faces can rotate
var g_angle_boxMin = 0.0;		// Minimum amount cube faces can rotate

var cylOpening = true;
var cylAngle = 0.0;				// Initial position of rolling cylinder	
var cylAnlge_Rate = 90.0;		// Rate of change for rolling cylinder



// -----------For 3D camera controls ----------------------------------
var W_keyActive = false;	// \
var A_keyActive = false;	//  \___ Moving camera
var S_keyActive = false;	//  /
var D_keyActive = false;	// /

var U_arrowActive = false;	// \
var L_arrowActive = false;	//  \___ Rotating Camera
var D_arrowActive = false;	//	/
var R_arrowActive = false;	// /

var e_x = 0		// \
var e_y = -6	//  -> Camera eye locations
var e_z = 1		// /

var theta_H = 90*Math.PI/180;	// Horizontal pitch (in radians for JS trig functions)
var theta_V = -5*Math.PI/180;	// Vertical pitch	(in radians for JS trig functions)

var L_x = e_x + Math.cos(theta_H);	// \ 
var L_y = e_y + Math.sin(theta_H);	//  -> Camera lookat locations
var L_z = e_z + Math.sin(theta_V);	// /


// ------------For Vertex Buffers ------------------------------------
g_worldMat = new Matrix4();		// Matrix with camera transformations

var worldBox = new VBObox0();	// Holds ground-plane, axis marker, and light marker
var gouraudBox = new VBObox1();	// Holds scene with Gouraud shading
var phongBox = new VBObox2();	// Holds scene with Phong shading


// ------------For Lighting/Shading ----------------------------------
var VBO0Active = true;
var GouraudActive = true;

var lightOn = true;

var lightingMode = 1.0;		// 1.0 = Phong Lighting
							// 0.0 = Blinn-Phong lighting
var sphereMatl = 1.0;

var lightPosX = 0.0;
var lightPosY = 0.0;
var lightPosZ = 1.0;

var lightColr_Ambi = new Float32Array([0.2, 0.2, 0.2]);
var lightColr_Diff = new Float32Array([0.8, 0.8, 0.8]);
var lightColr_Spec = new Float32Array([1.0, 1.0, 1.0]);




function main() {
//==============================================================================

	// Get gl, the rendering context for WebGL, from our 'g_canvas' object
	gl = getWebGLContext(g_canvas);
	if (!gl) {
    	console.log('Failed to get the rendering context for WebGL');
    	return;
	}
	  
	// Add keyboard event listeners
	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);	

	gl.enable(gl.DEPTH_TEST); 

	// Resize canvas
	resizeCanvas();

	// Init VBO 
	worldBox.init(gl);
	gouraudBox.init(gl);
	phongBox.init(gl);

	// Set perspective camera
	setCamera();

	// Specify the color for clearing <canvas>
	gl.clearColor(0.25, 0.2, 0.25, 1.0);

	tick();
}

function resizeCanvas() {
	// Resize WebGL canvas based on browser window size

	var xtraMargin = 16;	// Maintain a margin (to prevent scroll bar)

	g_canvas.width = innerWidth - xtraMargin;
	g_canvas.height = (innerHeight*0.70) - xtraMargin;

}

function updateLightColors() {
	let ambiString = document.getElementById('lightColrAmbi').value;
	let diffString = document.getElementById('lightColrDiff').value;
	let specString = document.getElementById('lightColrSpec').value;

	let ambiR = parseInt(Number('0x'+ambiString.slice(1,3))) / 255;
	let ambiG = parseInt(Number('0x'+ambiString.slice(3,5))) / 255;
	let ambiB = parseInt(Number('0x'+ambiString.slice(5,7))) / 255;

	let diffR = parseInt(Number('0x'+diffString.slice(1,3))) / 255;
	let diffG = parseInt(Number('0x'+diffString.slice(3,5))) / 255;
	let diffB = parseInt(Number('0x'+diffString.slice(5,7))) / 255;
	
	let specR = parseInt(Number('0x'+specString.slice(1,3))) / 255;
	let specG = parseInt(Number('0x'+specString.slice(3,5))) / 255;
	let specB = parseInt(Number('0x'+specString.slice(5,7))) / 255;

	lightColr_Ambi.set([ambiR, ambiG, ambiB]);
	lightColr_Diff.set([diffR, diffG, diffB]);
	lightColr_Spec.set([specR, specG, specB]);
}

function toggleLightONOFF() {
	if (lightOn) {
		// Turn light off
		lightOn = false;
		console.log('turn light off');
		lightColr_Ambi.set([0.0, 0.0, 0.0]);
		lightColr_Diff.set([0.0, 0.0, 0.0]);
		lightColr_Spec.set([0.0, 0.0, 0.0]);

		document.getElementById('btnToggleLight').innerHTML = 'Turn Light ON';
	} else {
		lightOn = true;

		updateLightColors();

		document.getElementById('btnToggleLight').innerHTML = 'Turn Light OFF';

	}
}

function setCamera() {
	// -- PERSPECTIVE Viewport -- //
	gl.viewport(0,
		0,
		g_canvas.width,
		g_canvas.height);

	
	// Define viewport aspect ratio
	var vpAspect = g_canvas.width / g_canvas.height;

	// Define perspective parameters	
	var FOV = 30.0;
	var zNear = 1.0;
	var zFar = 20.0;
	
	updateCamera();

	g_worldMat.setPerspective(
		FOV,		// FOVY: top-to-bottom vertical image angle
		vpAspect,	// Image Aspect Ratio
		zNear,		// Camera z-near distance 	(nearest distance to camera we render)
		zFar);		// Camera z-far distance	(farthest distance from camera we render)

	g_worldMat.lookAt(
		e_x, e_y, e_z,		// Camera location
		L_x, L_y, L_z,		// Look-at point
		0 ,  0 ,  1 );		// View UP vector
}

function updateCamera() {
	// ---- Pitch Adjustments ---- //
	// Horizontal rotation
	if (L_arrowActive && !R_arrowActive) {
		// Just L arrow pressed ---> Rotate left by 1 degree
		//console.log("Left arrow pressed: Rotate left!");
		theta_H += 0.8*Math.PI/180;
	} else if (!L_arrowActive && R_arrowActive) {
		// Just R arrow pressed ---> Rotate right by 1 degree
		//console.log("Right arrow pressed: Rotate right!");
		theta_H -= 0.8*Math.PI/180;
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
		//console.log("Up arrow pressed: Rotate up!");
		// Rotate by 1 degree and limit to within PI/2
		theta_V += 0.7*Math.PI/180;
		theta_V = Math.min(theta_V, Math.PI/2);
	} else if (!U_arrowActive && D_arrowActive) {
		//console.log("Down arrow pressed: Rotate down!");
		// Rotate by 1 degree and limit to within PI/2
		theta_V -= 0.7*Math.PI/180
		theta_V = Math.max(theta_V, -Math.PI/2);
	}
	
	// Update lookat position
	L_x = e_x + Math.cos(theta_H);
	L_y = e_y + Math.sin(theta_H);
	L_z = e_z + Math.sin(theta_V);



	// Move forward
	if (W_keyActive && !S_keyActive) {
		// Just W key pressed ---> Move forward
		//console.log("W key pressed: Move forward!");
		e_x += Math.cos(theta_H)/10;
		e_y += Math.sin(theta_H)/10;
		e_z += Math.sin(theta_V)/10;

		L_x += Math.cos(theta_H)/10;
		L_y += Math.sin(theta_H)/10;
		L_z += Math.sin(theta_V)/10;
		
	} else if (!W_keyActive && S_keyActive) {
		// Just S key pressed ---> Move back
		//console.log("S key pressed: Move backwards!");
		e_x -= Math.cos(theta_H)/10;
		e_y -= Math.sin(theta_H)/10;
		e_z -= Math.sin(theta_V)/10;
		
		L_x -= Math.cos(theta_H)/10;
		L_y -= Math.sin(theta_H)/10;
		L_z -= Math.sin(theta_V)/10;
	}

	if (A_keyActive && !D_keyActive) {
		// Just A key pressed ---> Strafe left
		//console.log("A key pressed: Strafe left!");
		e_x += Math.cos(theta_H+(Math.PI/2))/10;
		e_y += Math.sin(theta_H+(Math.PI/2))/10;
		
		L_x += Math.cos(theta_H+(Math.PI/2))/10;
		L_y += Math.sin(theta_H+(Math.PI/2))/10;
	} else if (!A_keyActive && D_keyActive) {
		// Just D key pressed ---> Strafe right
		//console.log("D key pressed: Strafe right!");
		e_x -= Math.cos(theta_H+(Math.PI/2))/10;
		e_y -= Math.sin(theta_H+(Math.PI/2))/10;
		
		L_x -= Math.cos(theta_H+(Math.PI/2))/10;
		L_y -= Math.sin(theta_H+(Math.PI/2))/10;
	}
}


// ANIMATION: create 'tick' variable whose value is this function:
//----------------- 
function tick() {

	// Update rotating ring speed from slider
	lightPosX = document.getElementById('lightPosX').value;
	lightPosY = document.getElementById('lightPosY').value;
	lightPosZ = document.getElementById('lightPosZ').value;

	document.getElementById('LPXlabel').innerHTML = Number(lightPosX).toFixed(1);
	document.getElementById('LPYlabel').innerHTML = Number(lightPosY).toFixed(1);
	document.getElementById('LPZlabel').innerHTML = Number(lightPosZ).toFixed(1);

	// Update Sphere material
	sphereMatl = parseInt(document.getElementById('matlSelect').value);

	animate();		// Update the rotation angle
	if (lightOn) {
		updateLightColors();
	}
	drawAll();		// Draw all parts
	

	// Display information about camera location
	/*
	document.getElementById('cameraEyePos').innerHTML=
		'(' + e_x.toFixed(1) + ', ' + e_y.toFixed(1) + ', ' + e_z.toFixed(1) + ')';
	document.getElementById('cameraRotHz').innerHTML= 
		(theta_H*180.0/Math.PI).toFixed(1)+'°';
	document.getElementById('cameraRotVt').innerHTML=
		(theta_V*180.0/Math.PI).toFixed(1)+'°';
	*/


	//--------------------------------
    requestAnimationFrame(tick, g_canvas);   
    									// Request that the browser re-draw the webpage
    									// (causes webpage to endlessly re-draw itself)
};

function drawAll() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	setCamera();
	animate();

	if (VBO0Active) {
		// Draw ground plane and axis marker
		worldBox.switchToMe();
		worldBox.adjust();
		worldBox.draw();
	}

	if (GouraudActive) {
		// Draw Gouraud shading scene
		gouraudBox.switchToMe();
		gouraudBox.adjust();
		gouraudBox.draw();
	} else {
		// Draw Phong shading scene
		phongBox.switchToMe();
		phongBox.adjust();
		phongBox.draw();
	}
	
}



////  ------------------------------------------------------------------ //// 

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate() {
//==============================================================================

  // Calculate the elapsed time
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;

	// If currently paused, do not update automatic animations
	if (pauseAnimations) {
		return;
	}

	if (cylOpening) {
		var newCylAngle = cylAngle + (cylAnlge_Rate*elapsed)/1000.0;
		cylAngle = (newCylAngle <= 360) ? newCylAngle : 360;
		cylOpening = (newCylAngle <= 360);
	} else {
		var newCylAngle = cylAngle - (cylAnlge_Rate*elapsed)/1000.0;
		cylAngle = (newCylAngle >= -45) ? newCylAngle : -45;
		cylOpening = (newCylAngle < -45);
	}


	if (openingBox) {
		var newBoxAngle = g_angle_box + (g_angle_boxRate * elapsed)/1000.0;
		g_angle_box = (newBoxAngle <= g_angle_boxMax) ? newBoxAngle : g_angle_box;
		openingBox = (newBoxAngle <= g_angle_boxMax);
	} else {
		var newBoxAngle = g_angle_box - (g_angle_boxRate * elapsed)/1000.0;
		g_angle_box = (newBoxAngle >= g_angle_boxMin) ? newBoxAngle : g_angle_box;
		openingBox = (newBoxAngle < g_angle_boxMin);
	}

	
	var newGyroAngle = g_angle_gyro + (g_angle_gyroRate*elapsed) / 1000.0;
	if(newGyroAngle > 180.0) newGyroAngle = newGyroAngle - 360.0;
	if(newGyroAngle < 180.0) newGyroAngle = newGyroAngle + 360.0;
	g_angle_gyro = newGyroAngle;
  
}

//==================HTML Button Callbacks======================

// Switch activated VBO objects
function toggleVBO(vboNumber) {
	switch(vboNumber) {
		case 0:
			VBO0Active = !VBO0Active;
			document.getElementById('VBO0Active').innerHTML = (VBO0Active) ? 'Hide Ground Grid' : 'Show Ground Grid';
			break;
		case 1:
			GouraudActive = !GouraudActive;
			document.getElementById('SwapShading').innerHTML = (GouraudActive) ? 'Switch to Phong Shading' : 'Switch to Gouraud Shading';
			break;
	}
}

function toggleLighting() {
	if (lightingMode == 1.0) {
		lightingMode = 0.0;
		document.getElementById('SwapLighting').innerHTML = 'Switch to Phong Lighting';

	} else {
		lightingMode = 1.0;
		document.getElementById('SwapLighting').innerHTML = 'Switch to Blinn-Phong Lighting';
	}
}



//=================== Keyboard event-handling Callbacks

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
			pauseAnimations = !pauseAnimations;
			console.log("pauseAnimations= " + pauseAnimations);
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

	}
	//console.log('myKeyUp()--code='+kev.code+' released.');
}
