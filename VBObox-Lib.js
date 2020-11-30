var floatsPerVertex = 7;



function VBObox0() {
    // VERTEX SHADER
    this.VERT_SRC =
      'precision highp float;\n' +	// req'd in OpenGL ES if we use 'float'
      //
      'uniform mat4 u_ModelMat0;\n' +
      'attribute vec4 a_Pos0;\n' +
      'attribute vec3 a_Colr0;\n'+
      'varying vec3 v_Colr0;\n' +
      //
      'void main() {\n' +
      '  gl_Position = u_ModelMat0 * a_Pos0;\n' +
      '	 v_Colr0 = a_Colr0;\n' +
      ' }\n';
    
    // FRAGMENT SHADER
    this.FRAG_SRC =  
      'precision mediump float;\n' +
      'varying vec3 v_Colr0;\n' +
      'void main() {\n' +
      '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
      '}\n';



    // -------- INIT VERTEX BUFFER ---------- //
    makeGroundGrid();
    makeAxisMarker();
    
    var mySiz = (gndVerts.length + axisVerts.length);
    this.vboVerts = mySiz / floatsPerVertex;

    var vboVertices = new Float32Array(mySiz)

    gndStart = 0
    for(i=0,j=0; j<gndVerts.length; i++, j++) {
        vboVertices[i] = gndVerts[j];
    }
    axisMarkerStart = i;
    for(j=0; j<axisVerts.length; i++, j++) {
        vboVertices[i] = axisVerts[j]
    }

    this.vboContents = vboVertices;
    // -------------------------------------- //
    


    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                      // bytes req'd by 1 vboContents array element;
                                                                    // (why? used to compute stride and offset 
                                                                    // in bytes for vertexAttribPointer() calls)
    this.vboBytes = this.vboContents.length * this.FSIZE;               
                                    // total number of bytes stored in vboContents
                                    // (#  of floats in vboContents array) * 
                                    // (# of bytes/float).
    this.vboStride = this.vboBytes / this.vboVerts; 
                                      // (== # of bytes to store one complete vertex).
                                      // From any attrib in a given vertex in the VBO, 
                                      // move forward by 'vboStride' bytes to arrive 
                                      // at the same attrib for the next vertex. 
    
    // Attribute sizes
    this.vboFcount_a_Pos0 =  4;    // # of floats in the VBO needed to store the
                                    // attribute named a_Pos0. (4: x,y,z,w values)
    this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values) 
    console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
                    this.vboFcount_a_Colr0) *   // every attribute in our VBO
                    this.FSIZE == this.vboStride, // for agreeement with'stride'
                    "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");
    
    // Attribute offsets  
    this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
                                      // of 1st a_Pos0 attrib value in vboContents[]
    this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    
                                    // (4 floats * bytes/float) 
                                    // # of bytes from START of vbo to the START
                                    // of 1st a_Colr0 attrib value in vboContents[]
    // GPU memory locations:
    this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                      // returned by gl.createBuffer() function call
    this.shaderLoc;								// GPU Location for compiled Shader-program  
                                        // set by compile/link of VERT_SRC and FRAG_SRC.
    // Attribute locations in our shaders:
    this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
    this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute
    
    // Uniform locations &values in our shaders
    this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
}
    
VBObox0.prototype.init = function() {
    //=============================================================================
    // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
    // kept in this VBObox. (This function usually called only once, within main()).
    // Specifically:
    // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
    //  executable 'program' stored and ready to use inside the GPU.  
    // b) create a new VBO object in GPU memory and fill it by transferring in all
    //  the vertex data held in our Float32array member 'VBOcontents'. 
    // c) Find & save the GPU location of all our shaders' attribute-variables and 
    //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
    // -------------------
    // CAREFUL!  before you can draw pictures using this VBObox contents, 
    //  you must call this VBObox object's switchToMe() function too!
    //--------------------
    // a) Compile,link,upload shaders-----------------------------------------------
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(this.constructor.name + 
                                '.init() failed to create executable Shaders on the GPU. Bye!');
        return;
    }
    // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
    //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
    
    gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
    
    // b) Create VBO on GPU, fill it------------------------------------------------
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
        console.log(this.constructor.name + 
                                '.init() failed to create VBO in GPU. Bye!'); 
        return;
    }
      // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
      //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
      // (positions, colors, normals, etc), or 
      //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
      // that each select one vertex from a vertex array stored in another VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
                    this.vboLoc);				  // the ID# the GPU uses for this buffer.
    
      // Fill the GPU's newly-created VBO object with the vertex data we stored in
      //  our 'vboContents' member (JavaScript Float32Array object).
      //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
      //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
    gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                    this.vboContents, 		// JavaScript Float32Array
                    gl.STATIC_DRAW);			// Usage hint.
      //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
      //	(see OpenGL ES specification for more info).  Your choices are:
      //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
      //				contents rarely or never change.
      //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
      //				contents may change often as our program runs.
      //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
      // 			times and then discarded; for rapidly supplied & consumed VBOs.
    
      // c1) Find All Attributes:---------------------------------------------------
      //  Find & save the GPU location of all our shaders' attribute-variables and 
      //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
    if(this.a_PosLoc < 0) {
        console.log(this.constructor.name + 
                                '.init() Failed to get GPU location of attribute a_Pos0');
        return -1;	// error exit.
    }
    
    this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
    
    if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name + 
                                '.init() failed to get the GPU location of attribute a_Colr0');
        return -1;	// error exit.
    }
      
      // c2) Find All Uniforms:-----------------------------------------------------
      //Get GPU storage location for each uniform var used in our shader programs: 
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
    if (!this.u_ModelMatLoc) { 
        console.log(this.constructor.name + 
                                '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
    }  
}
    
VBObox0.prototype.switchToMe = function() {
    // a) select our shader program:
    gl.useProgram(this.shaderLoc);	
      
    gl.bindBuffer(gl.ARRAY_BUFFER,  // GLenum 'target' for this GPU buffer 
                    this.vboLoc);   // the ID# the GPU uses for our VBO.
    
    // Point to a_Pos
    gl.vertexAttribPointer(
        this.a_PosLoc,
        this.vboFcount_a_Pos0,
        gl.FLOAT,
        false,
        this.vboStride,
        this.vboOffset_a_Pos0);

    // Point to a_Colr
    gl.vertexAttribPointer(
        this.a_ColrLoc, 
        this.vboFcount_a_Colr0, 
        gl.FLOAT, 
        false, 
        this.vboStride, 
        this.vboOffset_a_Colr0);
                                  
    // --Enable this assignment of each of these attributes to its' VBO source:
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
}

    
VBObox0.prototype.isReady = function() {
    //==============================================================================
    // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
    // this objects VBO and shader program; else return false.
    // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
    
    var isOK = true;
    
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + 
                                '.isReady() false: shader program at this.shaderLoc not in use!');
        isOK = false;
      }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + 
                              '.isReady() false: vbo at this.vboLoc not in use!');
        isOK = false;
    }

    return isOK;
}
    

VBObox0.prototype.adjust = function() {
    //==============================================================================
    // Update the GPU to newer, current values we now store for 'uniform' vars on 
    // the GPU; and (if needed) update each attribute's stride and offset in VBO.
    
      // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
                        '.adjust() call you needed to call this.switchToMe()!!');
    }  
        // Adjust values for our uniforms,
    
    this.ModelMat.setIdentity();
    // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
    this.ModelMat.set(g_worldMat);	// use our global, shared camera.
    // READY to draw in 'world' coord axes.
        
    //  this.ModelMat.rotate(g_angleNow0, 0, 0, 1);	  // rotate drawing axes,
    //  this.ModelMat.translate(0.35, 0, 0);							// then translate them.
      //  Transfer new uniforms' values to the GPU:-------------
      // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
                        false, 				// use matrix transpose instead?
                        this.ModelMat.elements);	// send data from Javascript.
      // Adjust the attributes' stride and offset (if necessary)
      // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
}
    

VBObox0.prototype.draw = function() {
    //=============================================================================
    // Render current VBObox contents.
    
      // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
                        '.draw() call you needed to call this.switchToMe()!!');
    }  
    drawAxisMarker();
    this.ModelMat.scale(0.1, 0.1, 0.1);
    gl.uniformMatrix4fv(this.u_ModelMatLoc,
                        false,
                        this.ModelMat.elements);
    drawGroundGrid();
}
 

VBObox0.prototype.reload = function() {
    //=============================================================================
    // Over-write current values in the GPU inside our already-created VBO: use 
    // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
    // contents to our VBO without changing any GPU memory allocations.
    
    gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                        0,                  // byte offset to where data replacement
                                    // begins in the VBO.
                        this.vboContents);   // the JS source-data array used to fill VBO
   
}

//// ----------- Ground Functions ------------------------------------- ////
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
        } else {				// put odd-numbered vertices at (xnow, +xymax, 0).
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
        } else {					// put odd-numbered vertices at (+xymax, ynow, 0).
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

function drawGroundGrid() {
	gl.drawArrays(gl.LINES, 
				  gndStart/floatsPerVertex,
				  gndVerts.length/floatsPerVertex);
}
//// ------------------------------------------------------------------ ////


//// ---------- Axis Maker Functions ---------------------------------- ////
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

function drawAxisMarker() {
	gl.drawArrays(gl.LINES,
				  axisMarkerStart/floatsPerVertex,
				  axisVerts.length/floatsPerVertex);
}
//// ------------------------------------------------------------------ ////
    








// =========== VBObox1 =================================================== //

function VBObox1() {
    // VERTEX SHADER
    this.VERT_SRC =
      'precision highp float;\n' +	// req'd in OpenGL ES if we use 'float'
      //
      'uniform mat4 u_ModelMat0;\n' +
      'attribute vec4 a_Pos0;\n' +
      'attribute vec3 a_Colr0;\n'+
      'varying vec3 v_Colr0;\n' +
      //
      'void main() {\n' +
      '  gl_Position = u_ModelMat0 * a_Pos0;\n' +
      '	 v_Colr0 = a_Colr0;\n' +
      ' }\n';
    
    // FRAGMENT SHADER
    this.FRAG_SRC =  
      'precision mediump float;\n' +
      'varying vec3 v_Colr0;\n' +
      'void main() {\n' +
      '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
      '}\n';



    // -------- INIT VERTEX BUFFER ---------- //
    makeHollowCylinder();
    
    var mySiz = cylVerts.length
    this.vboVerts = mySiz / floatsPerVertex;

    var vboVertices = new Float32Array(mySiz)

    cylStart = 0
    for(i=0,j=0; j<cylVerts.length; i++, j++) {
        vboVertices[i] = cylVerts[j];
    }

    this.vboContents = vboVertices;
    // -------------------------------------- //
    


    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                      // bytes req'd by 1 vboContents array element;
                                                                    // (why? used to compute stride and offset 
                                                                    // in bytes for vertexAttribPointer() calls)
    this.vboBytes = this.vboContents.length * this.FSIZE;               
                                    // total number of bytes stored in vboContents
                                    // (#  of floats in vboContents array) * 
                                    // (# of bytes/float).
    this.vboStride = this.vboBytes / this.vboVerts; 
                                      // (== # of bytes to store one complete vertex).
                                      // From any attrib in a given vertex in the VBO, 
                                      // move forward by 'vboStride' bytes to arrive 
                                      // at the same attrib for the next vertex. 
    
    // Attribute sizes
    this.vboFcount_a_Pos0 =  4;    // # of floats in the VBO needed to store the
                                    // attribute named a_Pos0. (4: x,y,z,w values)
    this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values) 
    console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
                    this.vboFcount_a_Colr0) *   // every attribute in our VBO
                    this.FSIZE == this.vboStride, // for agreeement with'stride'
                    "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");
    
    // Attribute offsets  
    this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
                                      // of 1st a_Pos0 attrib value in vboContents[]
    this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    
                                    // (4 floats * bytes/float) 
                                    // # of bytes from START of vbo to the START
                                    // of 1st a_Colr0 attrib value in vboContents[]
    // GPU memory locations:
    this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                      // returned by gl.createBuffer() function call
    this.shaderLoc;								// GPU Location for compiled Shader-program  
                                        // set by compile/link of VERT_SRC and FRAG_SRC.
    // Attribute locations in our shaders:
    this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
    this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute
    
    // Uniform locations &values in our shaders
    this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
}
   

VBObox1.prototype.init = function() {

    // a) Compile,link,upload shaders-----------------------------------------------
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(this.constructor.name + 
                                '.init() failed to create executable Shaders on the GPU. Bye!');
        return;
    }
    
    gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
    
    // b) Create VBO on GPU, fill it------------------------------------------------
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
        console.log(this.constructor.name + 
                                '.init() failed to create VBO in GPU. Bye!'); 
        return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
                    this.vboLoc);		

    gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                    this.vboContents, 		// JavaScript Float32Array
                    gl.STATIC_DRAW);	
    
      // c1) Find All Attributes:---------------------------------------------------
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
    if(this.a_PosLoc < 0) {
        console.log(this.constructor.name + 
                                '.init() Failed to get GPU location of attribute a_Pos0');
        return -1;	// error exit.
    }
    
    this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
    
    if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name + 
                                '.init() failed to get the GPU location of attribute a_Colr0');
        return -1;	// error exit.
    }
      
      // c2) Find All Uniforms:-----------------------------------------------------
      //Get GPU storage location for each uniform var used in our shader programs: 
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
    if (!this.u_ModelMatLoc) { 
        console.log(this.constructor.name + 
                                '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
    }  
}
   

VBObox1.prototype.switchToMe = function() {
    // a) select our shader program:
    gl.useProgram(this.shaderLoc);	
      
    gl.bindBuffer(gl.ARRAY_BUFFER,  // GLenum 'target' for this GPU buffer 
                    this.vboLoc);   // the ID# the GPU uses for our VBO.
    
    // Point to a_Pos
    gl.vertexAttribPointer(
        this.a_PosLoc,
        this.vboFcount_a_Pos0,
        gl.FLOAT,
        false,
        this.vboStride,
        this.vboOffset_a_Pos0);

    // Point to a_Colr
    gl.vertexAttribPointer(
        this.a_ColrLoc, 
        this.vboFcount_a_Colr0, 
        gl.FLOAT, 
        false, 
        this.vboStride, 
        this.vboOffset_a_Colr0);
                                  
    // --Enable this assignment of each of these attributes to its' VBO source:
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
}


VBObox1.prototype.isReady = function() {
    //==============================================================================
    // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
    // this objects VBO and shader program; else return false.
    // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
    
    var isOK = true;
    
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + 
                                '.isReady() false: shader program at this.shaderLoc not in use!');
        isOK = false;
      }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + 
                              '.isReady() false: vbo at this.vboLoc not in use!');
        isOK = false;
    }

    return isOK;
}
    

VBObox1.prototype.adjust = function() {
    //==============================================================================
    // Update the GPU to newer, current values we now store for 'uniform' vars on 
    // the GPU; and (if needed) update each attribute's stride and offset in VBO.
    
      // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
                        '.adjust() call you needed to call this.switchToMe()!!');
    }  
        // Adjust values for our uniforms,
    
    this.ModelMat.setIdentity();
    // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
    this.ModelMat.set(g_worldMat);	// use our global, shared camera.
    // READY to draw in 'world' coord axes.
        
    //  this.ModelMat.rotate(g_angleNow0, 0, 0, 1);	  // rotate drawing axes,
    //  this.ModelMat.translate(0.35, 0, 0);							// then translate them.
      //  Transfer new uniforms' values to the GPU:-------------
      // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
                        false, 				// use matrix transpose instead?
                        this.ModelMat.elements);	// send data from Javascript.
      // Adjust the attributes' stride and offset (if necessary)
      // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
}
    

VBObox1.prototype.draw = function() {
    //=============================================================================
    // Render current VBObox contents.
    
      // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + 
                        '.draw() call you needed to call this.switchToMe()!!');
    }  

    this.ModelMat.scale(0.2, 0.2, 0.2);     // Shrink model

    // Draw rotating rings
    this.ModelMat.rotate(90, 0, 1, 0);              // Rotate Upright
    this.ModelMat.translate(-1.2, 1.0, 0.0);        // Move out of ground
    this.ModelMat.rotate(g_angle_gyro, 1, 0, 0);    // Spin around center
    gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
    drawHollowCylinder();

    var scale = 1.0/1.2;
    for(i=0; i<5; i++) {
        this.ModelMat.rotate(g_angle_gyro, 1-i%2, i%2, 0);
        this.ModelMat.scale(scale, scale, scale);
        gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
        drawHollowCylinder();
    }
}
   

VBObox1.prototype.reload = function() {
    //=============================================================================
    // Over-write current values in the GPU inside our already-created VBO: use 
    // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
    // contents to our VBO without changing any GPU memory allocations.
    
    gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                        0,                  // byte offset to where data replacement
                                    // begins in the VBO.
                        this.vboContents);   // the JS source-data array used to fill VBO
   
}


//// ---------- Hollow Cylinder Functions ----------------------------- ////
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

function drawHollowCylinder() {
	gl.drawArrays(gl.TRIANGLE_STRIP,
		cylStart/floatsPerVertex,
		cylVerts.length/floatsPerVertex);
}
//// ------------------------------------------------------------------ ////

//// ----------- Sphere Functions ------------------------------------- ////
function makeSphere() {
    return 1;
}