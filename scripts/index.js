/**
 * @file Contains script for rendering WebGL canvas and managing user controls in index.html
 * @author Spencer Fitch <spencer@spencerfitch.com>
 */

// ====== GLOBAL VARIABLES ======
// WebGL
const g_canvas = document.querySelector('#webgl');
/** @global */
const gl = getWebGLContext(g_canvas)
 
// Vertex Buffers
/** @global */
const floatsPerVertex = 7;		// # floats/vertex orinally
/** @global */
const floatsPerVertexNorm = 10;	// # floats/vertex with surface normals added
/** @global  */
g_worldMat = new Matrix4();		// Matrix with camera transformations

const worldBox = new VBObox0();		// Holds ground-plane, axis marker, and light marker
const gouraudBox = new VBObox1();	// Holds scene with Gouraud shading
const phongBox = new VBObox2();		// Holds scene with Phong shading

// Animations
let pauseAnimations = false;	// Control whether to update animations
let g_last = Date.now();		// Timestamp for most-recently-drawn image				

/** @global */
let g_angle_gyro = 0;			// Angle of rotating ring
let g_angle_gyroRate = 30;		// Rate of rotation for rotating ring (deg/sec)

let openingBox = false;
let g_angle_box = 90.0;			// Initial angle between the faces of the cube
const g_angle_boxRate = 45;		// Rotation speed for sides of cube
const g_angle_boxMax = 90.0;	// Maximum amount cube faces can rotate
const g_angle_boxMin = 0.0;		// Minimum amount cube faces can rotate

let cylOpening = true;
let cylAngle = 0.0;				// Initial position of rolling cylinder	
const cylAnlge_Rate = 90.0;		// Rate of change for rolling cylinder

// 3D camera controls
let W_keyActive = false;	// \
let A_keyActive = false;	//  \___ Moving camera
let S_keyActive = false;	//  /
let D_keyActive = false;	// /

let U_arrowActive = false;	// \
let L_arrowActive = false;	//  \___ Rotating Camera
let D_arrowActive = false;	//	/
let R_arrowActive = false;	// /

let e_x = 0		// \
let e_y = -6	//  -> Camera eye locations
let e_z = 1		// /

let theta_H = 90*Math.PI/180;	// Horizontal pitch (in radians for JS trig functions)
let theta_V = -5*Math.PI/180;	// Vertical pitch	(in radians for JS trig functions)

let L_x = e_x + Math.cos(theta_H);	// \ 
let L_y = e_y + Math.sin(theta_H);	//  -> Camera lookat locations
let L_z = e_z + Math.sin(theta_V);	// /

// Lighting/Shading
let showGroundGrid = true;
let shadeGouraud = true;

let lightOn = true;

let lightingMode = 1.0;		// 1.0 = Phong Lighting
							// 0.0 = Blinn-Phong lighting
let sphereMatl = 1.0;

let lightPosX = 0.0;
let lightPosY = 0.0;
let lightPosZ = 1.0;

let lightColr_Ambi = new Float32Array([0.2, 0.2, 0.2]);
let lightColr_Diff = new Float32Array([0.8, 0.8, 0.8]);
let lightColr_Spec = new Float32Array([1.0, 1.0, 1.0]);


// ====== CALLBACK FUNCTIONS ======
const initCanvas = () => {
	/**
	 * Initialize the WebGL canvas
	 * 
	 * @function initCanvas
	 */
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

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
const resizeCanvas = () => {
	/**
	 * Resize WebGL canvas based on browser window size
	 * 
	 * @function resizeCanvas
	 */

	// Maintain small margin
	const extraMargin = 16;

	g_canvas.width = innerWidth - extraMargin;
	g_canvas.height = (innerHeight*0.70) - extraMargin;

}

const setCamera = () => {
	/**
	 * Establish the camera viewport
	 * 
	 * @function setCamera
	 */

	gl.viewport(
		0,
		0,
		g_canvas.width,
		g_canvas.height);

	// Viewport aspect ratio
	let vpAspect = g_canvas.width / g_canvas.height;

	// Perspective parameters	
	const FOV = 30.0;
	const zNear = 1.0;
	const zFar = 20.0;
	
	// Update camera position and rotation
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
const updateCamera = () => {
	/**
	 * Update camera rotation and position based on keyboard inputs
	 * 
	 * @function updateCamera
	 */

	if (L_arrowActive && !R_arrowActive) {
		// Rotate camera left
		theta_H += 0.8*Math.PI/180;
	} else if (!L_arrowActive && R_arrowActive) {
		// Rotate camera right
		theta_H -= 0.8*Math.PI/180;
	}

	// Ensure theta_H bounded between -pi and pi
	if (theta_H > Math.PI) {
		theta_H -= 2*Math.PI;
	} else if (theta_H < -Math.PI) {
		theta_H += 2*Math.PI;
	}

	if (U_arrowActive && !D_arrowActive) {
		// Rotate camera up
		theta_V += 0.7*Math.PI/180;
		theta_V = Math.min(theta_V, Math.PI/2);
	} else if (!U_arrowActive && D_arrowActive) {
		// Rotate camera down
		theta_V -= 0.7*Math.PI/180
		theta_V = Math.max(theta_V, -Math.PI/2);
	}
	
	// Update lookat position based on camera rotation
	L_x = e_x + Math.cos(theta_H);
	L_y = e_y + Math.sin(theta_H);
	L_z = e_z + Math.sin(theta_V);

	if (W_keyActive && !S_keyActive) {
		// Move forward
		e_x += Math.cos(theta_H)/10;
		e_y += Math.sin(theta_H)/10;
		e_z += Math.sin(theta_V)/10;

		L_x += Math.cos(theta_H)/10;
		L_y += Math.sin(theta_H)/10;
		L_z += Math.sin(theta_V)/10;
		
	} else if (!W_keyActive && S_keyActive) {
		// Move backwards
		e_x -= Math.cos(theta_H)/10;
		e_y -= Math.sin(theta_H)/10;
		e_z -= Math.sin(theta_V)/10;
		
		L_x -= Math.cos(theta_H)/10;
		L_y -= Math.sin(theta_H)/10;
		L_z -= Math.sin(theta_V)/10;
	}

	if (A_keyActive && !D_keyActive) {
		// Strafe left
		e_x += Math.cos(theta_H+(Math.PI/2))/10;
		e_y += Math.sin(theta_H+(Math.PI/2))/10;

		L_x += Math.cos(theta_H+(Math.PI/2))/10;
		L_y += Math.sin(theta_H+(Math.PI/2))/10;

	} else if (!A_keyActive && D_keyActive) {
		// Strafe right
		e_x -= Math.cos(theta_H+(Math.PI/2))/10;
		e_y -= Math.sin(theta_H+(Math.PI/2))/10;

		L_x -= Math.cos(theta_H+(Math.PI/2))/10;
		L_y -= Math.sin(theta_H+(Math.PI/2))/10;
	}
}

const tick = () => {
	/**
	 * Continually called function that updates the scene drawn to the canvas
	 * 
	 * @function tick
	 */


	// Update light position
	lightPosX = document.querySelector('#light_position_x').value;
	lightPosY = document.querySelector('#light_position_y').value;
	lightPosZ = document.querySelector('#light_position_z').value;

	document.querySelector('#light_position_x_display').innerHTML = Number(lightPosX).toFixed(1);
	document.querySelector('#light_position_y_display').innerHTML = Number(lightPosY).toFixed(1);
	document.querySelector('#light_position_z_display').innerHTML = Number(lightPosZ).toFixed(1);

	// Update Sphere material
	sphereMatl = parseInt(document.querySelector('#material_select').value);

	// Animate the scene
	animate();

	// Light the scene
	if (lightOn) {
		updateLightColors();
	}

	// Draw the scene
	drawAll();

	// Request canvas to be redrawn with 'tick' function
    requestAnimationFrame(tick, g_canvas);
}
const animate = () => {
	/**
	 * Progress the animation variables within the scene
	 * 
	 * @function animate
	 */

  	// Calculate the elapsed time
	let now = Date.now();
	let elapsed = now - g_last;
	g_last = now;

	if (pauseAnimations) {
		// Don't update animations while paused
		return;
	}

	if (cylOpening) {
		let newCylAngle = cylAngle + (cylAnlge_Rate*elapsed)/1000.0;
		cylAngle = (newCylAngle <= 360) ? newCylAngle : 360;
		cylOpening = (newCylAngle <= 360);
	} else {
		let newCylAngle = cylAngle - (cylAnlge_Rate*elapsed)/1000.0;
		cylAngle = (newCylAngle >= -45) ? newCylAngle : -45;
		cylOpening = (newCylAngle < -45);
	}


	if (openingBox) {
		let newBoxAngle = g_angle_box + (g_angle_boxRate * elapsed)/1000.0;
		g_angle_box = (newBoxAngle <= g_angle_boxMax) ? newBoxAngle : g_angle_box;
		openingBox = (newBoxAngle <= g_angle_boxMax);
	} else {
		let newBoxAngle = g_angle_box - (g_angle_boxRate * elapsed)/1000.0;
		g_angle_box = (newBoxAngle >= g_angle_boxMin) ? newBoxAngle : g_angle_box;
		openingBox = (newBoxAngle < g_angle_boxMin);
	}

	
	let newGyroAngle = g_angle_gyro + (g_angle_gyroRate*elapsed) / 1000.0;
	if(newGyroAngle > 180.0) newGyroAngle = newGyroAngle - 360.0;
	if(newGyroAngle < 180.0) newGyroAngle = newGyroAngle + 360.0;
	g_angle_gyro = newGyroAngle;
  
}
const updateLightColors = () => {
	/**
	 * Update scene light colors based on user input
	 * 
	 * @function updateLightColors
	 */
	const splitColor = (colorString) => (
		[1,3,5].map(idx => (
			parseInt(Number('0x'+colorString.slice(idx, idx+2))) / 255
		))
	)

	let ambiString = document.querySelector('#light_color_ambi').value;
	let diffString = document.querySelector('#light_color_diff').value;
	let specString = document.querySelector('#light_color_spec').value;

	lightColr_Ambi.set(splitColor(ambiString));
	lightColr_Diff.set(splitColor(diffString));
	lightColr_Spec.set(splitColor(specString));
}
const drawAll = () => {
	/**
	 * Draw the full 3D scene
	 * 
	 * @function drawAll
	 */

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	setCamera();
	animate();

	if (showGroundGrid) {
		// Draw ground plane and axis marker
		worldBox.switchToMe();
		worldBox.adjust();
		worldBox.draw();
	}

	if (shadeGouraud) {
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

const toggleGroundGrid = () => {
	/**
	 * Toggle whether to render the ground grid
	 * 
	 * @function toggleGroundGrid
	 */

	showGroundGrid = !showGroundGrid;
	document.querySelector('#btn_toggle_ground_grid').innerHTML = (showGroundGrid) ? 'Hide Ground Grid' : 'Show Ground Grid';
}
const toggleShading = () => {
	/**
	 * Toggle between the different shading modes
	 * 
	 * @function toggleShading
	 */

	shadeGouraud = !shadeGouraud;
	document.querySelector('#btn_toggle_shading').innerHTML = (shadeGouraud) ? 'Switch to Phong Shading' : 'Switch to Gouraud Shading';
}
const toggleLightingMode = () => {
	/**
	 * Toggle between lighting modes
	 * 
	 * @function toggleLightingMode
	 */

	if (lightingMode == 1.0) {
		lightingMode = 0.0;
		document.querySelector('#btn_toggle_lighting_mode').innerHTML = "Switch to Phong Lighting";

	} else {
		lightingMode = 1.0;
		document.querySelector('#btn_toggle_lighting_mode').innerHTML = "Switch to Blinn-Phong Lighting";
	}
}
const toggleLight = () => {
	/**
	 * Toggle light on and off
	 * 
	 * @function toggleLight
	 */

	if (lightOn) {
		lightOn = false;
		lightColr_Ambi.set([0.0, 0.0, 0.0]);
		lightColr_Diff.set([0.0, 0.0, 0.0]);
		lightColr_Spec.set([0.0, 0.0, 0.0]);
		document.querySelector('#btn_toggle_light').innerHTML = 'Turn Light ON';

	} else {
		lightOn = true;
		updateLightColors();
		document.querySelector('#btn_toggle_light').innerHTML = 'Turn Light OFF';

	}
}

const handleKeyDown = (kev) => {
	/**
	 * Handle all key press inputs from user
	 * 
	 * @function handleKeyDown
	 * @param {Object} key keyboard key event
	 */

	/*
	// Report EVERYTHING in console:
	console.log(`
		--kev.code: ${kev.code}		--kev.key: ${kev.key}
		--kev.ctrlKey: ${kev.ctrlKey}	--kev.shiftKey: ${kev.shiftKey}
		--kev.altKey: ${kev.altKey}	--kev.metaKey: ${kev.metaKey}
	`);
	*/
 
	switch(kev.code) {
		case "KeyP":
			pauseAnimations = !pauseAnimations;
			break;

		// WASD navigation
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

		// Arrow controls
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
	}
}
const handleKeyUp = (kev) => {
	/**
	 * Handle all key release inputs from user
	 * 
	 * @function handleKeyUp
	 * @param {Object} kev keyboard key event
	 */

	switch(kev.code) {

		// WASD navigation
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

		// Arrow controls
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
}


// ====== EVENT HANDLERS AND ATTRIBUTES ======
document.querySelector('body').setAttribute('onload', 'initCanvas()');
document.querySelector('body').setAttribute('onresize', 'resizeCanvas()');

window.addEventListener('keydown', handleKeyDown, false);
window.addEventListener('keyup', handleKeyUp, false);

document.querySelector('#btn_toggle_ground_grid').setAttribute('onclick', 'toggleGroundGrid()');
document.querySelector('#btn_toggle_shading').setAttribute('onclick', 'toggleShading()');
document.querySelector('#btn_toggle_lighting_mode').setAttribute('onclick', 'toggleLightingMode()');
document.querySelector('#btn_toggle_light').setAttribute('onclick', 'toggleLight()');

document.querySelector('#material_select').setAttribute('onkeydown', 'event.preventDefault()')

const initLightPosition = [lightPosX, lightPosY, lightPosZ];
document.querySelectorAll('.light_position').forEach((input, idx) => {
	input.setAttribute('type', 'range');
	input.setAttribute('class', 'slider');
	input.setAttribute('min', '-5');
	input.setAttribute('max', '5');
	input.setAttribute('step', '0.1');
	input.setAttribute('value', String(initLightPosition[idx]));
	input.setAttribute('onkeydown', "event.preventDefault()");
});

const initLightColor = ['#333333', '#cccccc', '#ffffff']
document.querySelectorAll('.light_color').forEach((input, idx) => {
	input.setAttribute('type', 'color');
	input.setAttribute('value', initLightColor[idx])
});