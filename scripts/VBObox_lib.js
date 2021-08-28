/**
 * @file Contains several Vertex Buffer Objects (VBO) used to render various components of the scene in WebGL
 * @author Spencer Fitch <spencer@spencerfitch.com>
 * 
 */

// ==== VBObox0 - General World ====
function VBObox0() {

    // Vertex Shader
    this.VERT_SRC = 
      'precision highp float;\n' +
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
    
    // Fragment Shader
    this.FRAG_SRC =  
      'precision mediump float;\n' +
      'varying vec3 v_Colr0;\n' +
      'void main() {\n' +
      '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
      '}\n';


    // Initialize Vertex Buffer
    makeGroundGrid();
    makeAxisMarker();
    makePauseIcon();
    makeLightMarker();
    
    const mySiz = (gndVerts.length + axisVerts.length + pausVerts.length + ligtVerts.length);
    this.vboVerts = mySiz / floatsPerVertex;
    const vboVertices = new Float32Array(mySiz)

    /** @global */
    gndStart = 0
    for(i=0,j=0; j<gndVerts.length; i++, j++) {
        vboVertices[i] = gndVerts[j];
    }
    /** @global */
    axisMarkerStart = i;
    for(j=0; j<axisVerts.length; i++, j++) {
        vboVertices[i] = axisVerts[j];
    }
    /** @global */
    pauseIconStart = i;
    for(j=0; j<pausVerts.length; i++, j++) {
        vboVertices[i] = pausVerts[j];
    }
    /** @global */
    lightMarkerStart = i;
    for(j=0; j<ligtVerts.length; i++, j++) {
        vboVertices[i] = ligtVerts[j];
    }

    // Store vertices in VBO
    this.vboContents = vboVertices;

    // Byte size of every float in VBO
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
    // Total number of bytes in VBO
    this.vboBytes = this.vboContents.length * this.FSIZE;
    // Stride length in bytes between vertices in VBO
    this.vboStride = this.vboBytes / this.vboVerts; 
    
    // Attribute sizes
    this.vboFcount_a_Pos0 =  4;     // # of floats to store vertex position
    this.vboFcount_a_Colr0 = 3;     // # of floats to store vertex color
    console.assert(
        (this.vboFcount_a_Pos0 + this.vboFcount_a_Colr0) * this.FSIZE == this.vboStride,
        "VBObox0.vboStride disagrees with attribute-size values");
    
    // Attribute offsets  
    this.vboOffset_a_Pos0 = 0;  // First vertex position in VBO
    this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    // First vertex color in VBO

    // GPU memory locations
    this.vboLoc;
    this.shaderLoc;
    this.a_PosLoc;
    this.a_ColrLoc;
    
    // Uniform locations & values in our shaders
    this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatLoc;				// GPU location for u_ModelMat uniform
}
VBObox0.prototype.init = function() {
    /**
     * Initialize the Vertex Buffer Object on the GPU
     * 
     * @method init
     */
    
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(this.constructor.name + '.init() failed to create executable Shaders on the GPU');
        return;
    }
    gl.program = this.shaderLoc;
    
    // Create VBO location on GPU
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
        console.log(this.constructor.name + '.init() failed to create VBO in GPU. Bye!'); 
        return;
    }

    // Initialize VBO on GPU and fill it with vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);
    gl.bufferData(gl.ARRAY_BUFFER, this.vboContents, gl.STATIC_DRAW);
    
    // Save GPU location of shaders
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
    if(this.a_PosLoc < 0) {
        console.log(this.constructor.name + '.init() Failed to get GPU location of attribute a_Pos0');
        return;
    }
    this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
    if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name + '.init() failed to get the GPU location of attribute a_Colr0');
        return;
    }
      
    // Save GPU location of matrix uniform
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
    if (!this.u_ModelMatLoc) { 
        console.log(this.constructor.name + '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
    }  
} 
VBObox0.prototype.switchToMe = function() {
    /**
     * Switch to rendering this VBO on WebGL canvas
     * 
     * @method switchToMe
     */
    gl.useProgram(this.shaderLoc);	
      
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);
    
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
                                  
    // Enable attributes on the GPU
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
}
VBObox0.prototype.isReady = function() {
    /**
     * Returns 'true' if WebGL is ready to render this object's VBO and shader program
     * 
     * @method isReady
     * @returns {Boolean} Whether this VBO and shader program are ready to be rendered
     */
    
    let isOK = true;
    
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + '.isReady() false: shader program at this.shaderLoc not in use');
        isOK = false;
    }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + '.isReady() false: vbo at this.vboLoc not in use');
        isOK = false;
    }

    return isOK;
}
VBObox0.prototype.adjust = function() {
    /**
     * Update GPU model matrix uniform and attributes
     * 
     * @method adjust
     */
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + '.adjust() call you needed to call this.switchToMe()!!');
    } 
    
    // Reset matrix uniform 
    this.ModelMat.setIdentity();
    this.ModelMat.set(g_worldMat);
        
    // Send adjusted model matrix to the GPU
    gl.uniformMatrix4fv(this.u_ModelMatLoc,	false, this.ModelMat.elements);
}
VBObox0.prototype.draw = function() {
    /**
     * Render VBO contents in WebGL canvas
     * 
     * @method draw
     */
    
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + '.draw() call you needed to call this.switchToMe()');
    }  

    if (pauseAnimations) {
        // Draw pause icon onto camera
        pushMatrix(this.ModelMat);

        let vpAspect = g_canvas.width / g_canvas.height;
        this.ModelMat.setTranslate(-0.9, -0.8, 0.0);
        this.ModelMat.scale(0.1/vpAspect, 0.1, 0.1);
        gl.uniformMatrix4fv(
            this.u_ModelMatLoc,
            false,
            this.ModelMat.elements);
        drawPauseIcon();

        this.ModelMat.translate(0.5, 0, 0);
        gl.uniformMatrix4fv(
            this.u_ModelMatLoc,
            false,
            this.ModelMat.elements);
        drawPauseIcon();

        this.ModelMat = popMatrix();
        gl.uniformMatrix4fv(
            this.u_ModelMatLoc,
            false,
            this.ModelMat.elements);
    }

    // Draw central axis marker
    drawAxisMarker();

    // Draw light icon
    pushMatrix(this.ModelMat);
    this.ModelMat.translate(lightPosX, lightPosY, lightPosZ);
    this.ModelMat.scale(0.05, 0.05, 0.05);
    gl.uniformMatrix4fv(
        this.u_ModelMatLoc,
        false,
        this.ModelMat.elements);
    drawLightMarker();
    this.ModelMat = popMatrix();

    // Draw ground grid
    this.ModelMat.scale(0.1, 0.1, 0.1);
    gl.uniformMatrix4fv(
        this.u_ModelMatLoc,
        false,
        this.ModelMat.elements);
    drawGroundGrid();
}
VBObox0.prototype.reload = function() {
    /**
     * Refill VBO on GPU with current JS contents
     * 
     * @method reload
     */
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vboContents);
   
}

function makeGroundGrid() {
    /**
     * Generate vertices that create a large grid of lines in the x,y plane
     * 
     * @function makeGroundGrid
     */
    
    // Number of grid lines
    const xcount = 100;
    const ycount = 100;		
    // Grid size
    const xymax = 100.0;
    // Grid line colors
    const xColr = new Float32Array([1.0, 1.0, 0.3]);    // bright yellow
    const yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green
         
    /** @global */
    gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
    
    // Gap between grid lines
    const xgap = xymax / (xcount-1);		
    const ygap = xymax / (ycount-1);
        
    // Lines parallel to X axis
    for(v=0, j=0; v<2*xcount; v++, j+=floatsPerVertex) {
        if(v%2==0) {
            gndVerts[j  ] = -xymax + (v)*xgap;	// x
            gndVerts[j+1] = -xymax;				// y
            gndVerts[j+2] = 0.0;			    // z
            gndVerts[j+3] = 1.0;				// w
        } else {
            gndVerts[j  ] = -xymax + (v-1)*xgap;// x
            gndVerts[j+1] = xymax;				// y
            gndVerts[j+2] = 0.0;				// z
            gndVerts[j+3] = 1.0;				// w.
        }
            
        gndVerts[j+4] = xColr[0];   // R
        gndVerts[j+5] = xColr[1];   // G
        gndVerts[j+6] = xColr[2];   // B
    }
    
    // Lines parallel to Y axis
    for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
        if(v%2==0) {
            gndVerts[j  ] = -xymax;				// x
            gndVerts[j+1] = -xymax + (v)*ygap;  // y
            gndVerts[j+2] = 0.0;				// z
            gndVerts[j+3] = 1.0;				// w.
        } else {
            gndVerts[j  ] = xymax;				// x
            gndVerts[j+1] = -xymax + (v-1)*ygap;// y
            gndVerts[j+2] = 0.0;				// z
            gndVerts[j+3] = 1.0;				// w.
        }
        
        gndVerts[j+4] = yColr[0];	// R
        gndVerts[j+5] = yColr[1];	// G
        gndVerts[j+6] = yColr[2];	// B
    }
}
function drawGroundGrid() {
    /**
     * Draw ground grid using global ground vertices
     * 
     * @function drawGroundGrid
     */
    
	gl.drawArrays(
        gl.LINES, 
        gndStart/floatsPerVertex,
        gndVerts.length/floatsPerVertex);
}

function makeAxisMarker() {
    /**
     * Generate vertices for basic RGB axis marker
     * 
     * @function makeAxisMarker
     */

    /** @global */
	axisVerts = new Float32Array([
		0.00, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,
		1.00, 0.00, 0.00, 1.0,		1.0, 0.0, 0.0,
		0.00, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0,
		0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0,
		0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,
		0.00, 0.00, 1.00, 1.0,		0.0, 0.0, 1.0,	  
	]);
}
function drawAxisMarker() {
    /**
     * Draw axis marker using global axis vertices
     * 
     * @function drawAxisMarker
     */

	gl.drawArrays(
        gl.LINES,
        axisMarkerStart/floatsPerVertex,
        axisVerts.length/floatsPerVertex);
}

function makePauseIcon() {
    /**
     * Generate vertices for pause icon
     * 
     * @function makePauseIcon
     */

    /** @global */
    pausVerts = new Float32Array([
        0.00, 0.00, 0.00, 1.0,		1.0, 1.0, 1.0,
	    0.20, 0.00, 0.00, 1.0,		1.0, 1.0, 1.0,
	    0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0, 
	    0.20, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,
	    0.20, 0.00, 0.00, 1.0,		1.0, 1.0, 1.0,
        0.00, 1.00, 0.00, 1.0,		1.0, 1.0, 1.0,	
    ]);
}
function drawPauseIcon() {
    /**
     * Draw pause icon using global pause icon vertices
     * 
     * @function drawPauseIcon
     */

    gl.drawArrays(
        gl.TRIANGLES,
        pauseIconStart/floatsPerVertex,
        pausVerts.length/floatsPerVertex);
}

function makeLightMarker() {
    /**
     * Generate vertices for cube light marker
     * 
     * @function makeLightMarker
     */

    /** @global */
    ligtVerts = new Float32Array([
        // Bottom
        -0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,

         0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,

        // Side1
        -0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,

        -0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,

        // Side2
        -0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        
         0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,

        // Side3
         0.5,  0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         
         0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,

         // Side4
         0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,
         
        -0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5, -0.5, -0.5, 1.0,      1.0, 1.0, 1.0,

        // Top
        -0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        
         0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
         0.5, -0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
        -0.5,  0.5,  0.5, 1.0,      1.0, 1.0, 1.0,
    ]);
}
function drawLightMarker() {
    /**
     * Draw light marker cube using global light marker vertices
     * 
     * @function drawLightMarker
     */

    gl.drawArrays(
        gl.TRIANGLES,
        lightMarkerStart / floatsPerVertex,
        ligtVerts.length / floatsPerVertex);
}


// ==== VBObox1 - Gouraud Shading ====
function VBObox1() {

    // Vertex Shader
    this.VERT_SRC =
        'uniform mat4 u_MvpMat1;\n' +
        'uniform mat4 u_ModelMat1;\n' +
        'uniform mat4 u_NormalMat1;\n' +
        //
        'uniform vec3 u_LightPos;\n' +
        'uniform vec3 u_Look1;\n' +
        //
        'uniform vec3 u_LightColrDiff;\n' +
        'uniform vec3 u_LightColrAmbi;\n' +
        'uniform vec3 u_LightColrSpec;\n' +
        //
        'uniform float u_LightCode;\n' +
        //
        'attribute vec4 a_Pos1;\n' +
        'attribute vec3 a_Colr1;\n' +
        'attribute vec3 a_Norm1;\n' +
        //
        'varying vec4 v_Colr1;\n' +
        //
        'void main() {\n' +
        '   gl_Position = u_MvpMat1 * a_Pos1;\n' +
        //
        '   vec4 transVec = u_NormalMat1 * vec4(a_Norm1, 0.0);\n' +
        '   vec3 normVec = normalize(transVec.xyz);\n' +
        '   vec4 vertexPosition = u_ModelMat1 * a_Pos1;\n' +
        '   vec3 lightVec = normalize(u_LightPos - vec3(vertexPosition));\n' +
        //
        '   float nDotL = max(dot(lightVec, normVec), 0.0);\n' +
        '   vec3 diffuse = u_LightColrDiff * a_Colr1 * nDotL;\n' +
        '   vec3 ambient = u_LightColrAmbi * a_Colr1;\n' +
        //
        '   float specConst = 0.0;\n' +
        '   vec3 V = normalize(-u_Look1);\n' +
        '   if (u_LightCode > 0.5) {\n' +
                // Phong lighting
        '       vec3 R = reflect(-lightVec, normVec);\n' +
        '       float specAngle = max(dot(R, V), 0.0);\n' +
        '       specConst = pow(specAngle, 80.0);\n' +
        '   } else {\n' +
                // Blinn-phong lighting
        '       vec3 H = normalize(lightVec + V);\n' +
        '       float specAngle = max(dot(H, normVec), 0.0);\n' +
        '       specConst = pow(specAngle, 80.0);\n' +
        '   };\n' +
        '   vec3 specular = specConst * u_LightColrSpec;\n' +
        //
        '   v_Colr1 = vec4(diffuse + ambient + specular, 1.0);\n' +
        '}\n';
        
    
    // Fragment shader
    this.FRAG_SRC =
        'precision mediump float;\n' +
        'varying vec4 v_Colr1;\n' +
        'void main() {\n' +
        '   gl_FragColor = v_Colr1;\n' +
        '}\n';



    // Initialize Vertex Buffer
    makeSphere();
    makeBoxSide();
    makeHollowCylinder();
    makeCylinderSection();

    const mySiz = (sphVerts.length + boxVerts.length + cylVerts.length + secVerts.length);
    this.vboVerts = mySiz / floatsPerVertexNorm;
    const vboVertices = new Float32Array(mySiz);

    /** @global */
    sphStart = 0;
    for(i=0, j=0; j<sphVerts.length; i++, j++) {
        vboVertices[i] = sphVerts[j];
    }
    /** @global */
    boxStart = i;
    for(j=0; j<boxVerts.length; i++, j++) {
        vboVertices[i] = boxVerts[j];
    }
    /** @global */
    cylStart = i;
    for(j=0; j<cylVerts.length; i++, j++) {
        vboVertices[i] = cylVerts[j];
    }
    /** @global */
    secStart = i;
    for(j=0; j<secVerts.length; i++, j++) {
        vboVertices[i] = secVerts[j];
    }

    // Store vertices in VBO
    this.vboContents = vboVertices;
    
    // Byte size of every float in VBO
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
    // Total number of bytes in VBO
    this.vboBytes = this.vboContents.length * this.FSIZE;
    // Stride length in bytes between vertices in VBO
    this.vboStride = this.vboBytes / this.vboVerts; 
    
    // Attribute sizes
    this.vboFcount_a_Pos1 =  4;     // # of floats to store vertex position
    this.vboFcount_a_Colr1 = 3;     // # of floats to store vertex color
    this.vboFcount_a_Norm1 = 3;     // # of floats to store vertex normal
    console.assert(
        (this.vboFcount_a_Pos1 + this.vboFcount_a_Colr1 + this.vboFcount_a_Norm1) * this.FSIZE == this.vboStride,
        "VBObox1.vboStride disagrees with attribute-size values");
    
    // Attribute offsets  
    this.vboOffset_a_Pos1 = 0;  // First vertex position in VBO
    this.vboOffset_a_Colr1 = this.vboFcount_a_Pos1 * this.FSIZE;    // First vertex color in VBO
    this.vboOffset_a_Norm1 = this.vboOffset_a_Colr1 + (this.vboFcount_a_Colr1 * this.FSIZE);    // First vertex normal in VBO

    // GPU memory locations
    this.vboLoc;
    this.shaderLoc;	
    this.a_PosLoc;
    this.a_ColrLoc;
    this.a_NormLoc;
    
    // Uniform locations & values in our shaders
    this.ModelMat = new Matrix4();
    this.WorldMat = new Matrix4();
    this.NormalMat = new Matrix4();  
	
    this.u_MvpMatLoc;
    this.u_NormalMatLoc;
}
VBObox1.prototype.init = function() {
    /**
     * Initialize the Vertex Buffer object on the GPU
     * 
     * @method init
     */

    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(this.constructor.name + '.init() failed to create executable Shaders on the GPU');
        return;
    }
    gl.program = this.shaderLoc;

    // Create VBO location on GPU
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
        console.log(this.constructor.name + '.init() failed to create VBO in GPU'); 
        return;
    }

    // Initialize VBO on GPU and fill it with vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);		
    gl.bufferData(gl.ARRAY_BUFFER, this.vboContents, gl.STATIC_DRAW);	
    
    // Save GPU location of shaders
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos1');    
    this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr1');
    this.a_NormLoc = gl.getAttribLocation(this.shaderLoc, 'a_Norm1')
    if(this.a_PosLoc < 0 || this.a_ColrLoc < 0 || this.a_NormLoc < 0) {
        console.log(this.constructor.name + '.init() failed to get the GPU location of attribute');
        return;
    }

    // Save GPU location of uniforms
    this.u_MvpMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_MvpMat1');
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat1');
    this.u_NormalMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_NormalMat1');
    
    this.u_LookLoc = gl.getUniformLocation(this.shaderLoc, 'u_Look1');
 
    this.u_LightCodeLoc = gl.getUniformLocation(this.shaderLoc, 'u_LightCode');
    this.u_LightPosLoc = gl.getUniformLocation(this.shaderLoc, 'u_LightPos');

    this.u_LightColrLoc_ambi = gl.getUniformLocation(this.shaderLoc, 'u_LightColrAmbi');
    this.u_LightColrLoc_diff = gl.getUniformLocation(this.shaderLoc, 'u_LightColrDiff');
    this.u_LightColrLoc_spec = gl.getUniformLocation(this.shaderLoc, 'u_LightColrSpec');
    
    if(!this.u_MvpMatLoc 
        || !this.u_ModelMatLoc 
        || !this.u_NormalMatLoc 
        || !this.u_LookLoc 
        || !this.u_LightPosLoc 
        || !this.u_LightCodeLoc
        || !this.u_LightColrLoc_ambi 
        || !this.u_LightColrLoc_diff 
        || !this.u_LightColrLoc_spec) {
            console.log(this.constructor.name + '.init() failed to get the GPU location of uniform');
            return;
    }
}
VBObox1.prototype.switchToMe = function() {
    /**
     * Switch to rendering this VBO on WebGL canvas
     * 
     * @method switchToMe
     */

    gl.useProgram(this.shaderLoc);	
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);
    
    // Point to a_Pos
    gl.vertexAttribPointer(
        this.a_PosLoc,
        this.vboFcount_a_Pos1,
        gl.FLOAT,
        false,
        this.vboStride,
        this.vboOffset_a_Pos1);

    // Point to a_Colr
    gl.vertexAttribPointer(
        this.a_ColrLoc, 
        this.vboFcount_a_Colr1, 
        gl.FLOAT, 
        false, 
        this.vboStride, 
        this.vboOffset_a_Colr1);

    // Point to a_Norm
    gl.vertexAttribPointer(
        this.a_NormLoc,
        this.vboFcount_a_Norm1,
        gl.FLOAT,
        false,
        this.vboStride,
        this.vboOffset_a_Norm1);
                                  
    // Enable attributes on the GPU
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
    gl.enableVertexAttribArray(this.a_NormLoc);
}
VBObox1.prototype.isReady = function() {
    /**
     * Returns 'true' if WebGL is ready to render this object's VBO and shader program 
     * 
     * @method isReady
     * @returns {Boolean} Whether this VBO and shader program are ready to be rendered
     */

    let isOK = true;
    
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + '.isReady() false: shader program at this.shaderLoc not in use');
        isOK = false;
      }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + '.isReady() false: vbo at this.vboLoc not in use');
        isOK = false;
    }

    return isOK;
}
VBObox1.prototype.adjust = function() {
    /**
     * Update GPU model matrix uniform and attributes
     * 
     * @method adjust
     */

    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name +  '.adjust() call you needed to call this.switchToMe()');
    }  
    
    this.WorldMat.set(g_worldMat);
    this.ModelMat.setIdentity();
    this.updateUniforms();
}
VBObox1.prototype.updateUniforms = function() {
    /**
     * Update GPU uniforms
     * 
     * @method updateUniforms
     */
    const MvpMat = new Matrix4();
    MvpMat.set(this.WorldMat);
    MvpMat.multiply(this.ModelMat);

    this.NormalMat.setInverseOf(this.ModelMat);
    this.NormalMat.transpose();

    // Send  new Matrix values to the GPU's uniform
    gl.uniformMatrix4fv(this.u_MvpMatLoc, false, MvpMat.elements);	
    gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);
    gl.uniformMatrix4fv(this.u_NormalMatLoc, false, this.NormalMat.elements);

    // Send view vector to GPU's uniform
    gl.uniform3f(this.u_LookLoc, L_x-e_x, L_y-e_y, L_z-e_z);

    // Determine lighting type
    gl.uniform1f(this.u_LightCodeLoc, lightingMode);
    
    // Set light location
    gl.uniform3f(this.u_LightPosLoc, lightPosX, lightPosY, lightPosZ);

    // Set light colors
    gl.uniform3fv(this.u_LightColrLoc_ambi, lightColr_Ambi);
    gl.uniform3fv(this.u_LightColrLoc_diff, lightColr_Diff);
    gl.uniform3fv(this.u_LightColrLoc_spec, lightColr_Spec);
}
VBObox1.prototype.draw = function() {
    /**
     * Render VBO contents in WebGL canvas
     * 
     * @method draw
     */

    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + '.draw() call you needed to call this.switchToMe()');
    }  

    pushMatrix(this.ModelMat);

    // Draw sphere
    this.ModelMat.translate(-1, 1, 0.5);
    this.ModelMat.scale(0.5, 0.5, 0.5);
    this.ModelMat.rotate(g_angle_gyro, 0, 0, 1);
    this.updateUniforms();
    drawSphere();

    this.ModelMat = popMatrix();
    pushMatrix(this.ModelMat);

    // Draw Folding Cube 
    this.ModelMat.translate(0.9, 1.5, 0.0);
    this.ModelMat.rotate(180, 0, 0, 1);
    this.ModelMat.scale(0.5, 0.5, 0.5);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.rotate(180, 0, 1, 0);
    this.ModelMat.translate(-1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90-g_angle_box, 1, 0, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.translate(1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90+g_angle_box, 0, 1, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.translate(1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90+g_angle_box, 0, 1, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.translate(1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90+g_angle_box, 0, 1, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.rotate(180, 1, 0, 0);
    this.ModelMat.translate(0.0, -1.0, 0.0);
    this.ModelMat.rotate(-90-g_angle_box, 1, 0, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat = popMatrix();
    pushMatrix(this.ModelMat);

    // Draw Rotating Rings
    this.ModelMat.translate(-1.8, -1.5, 0.0);
    this.ModelMat.scale(0.3, 0.3, 0.3);
    this.ModelMat.rotate(90, 0, 1, 0);
    this.ModelMat.translate(-1.2, 0.0, 0.0);
    this.ModelMat.rotate(3*g_angle_gyro, 1, 0, 0);
    this.updateUniforms();
    drawHollowCylinder();

    const scale=1.0/1.2;
    for (i=0; i<5; i++) {
        this.ModelMat.rotate(3*g_angle_gyro, 1-i%2, i%2, 0);
        this.ModelMat.scale(scale, scale, scale);
        this.updateUniforms();
        drawHollowCylinder();
    }

    this.ModelMat = popMatrix();

    // Draw unrolling cylinder
    this.ModelMat.translate(0.8, -1.5, 0.1);
    this.updateUniforms();
    drawCylinderSection();

    for (i=0; i<7; i++) {
        this.ModelMat.translate(0.2, 0.0, 0.0);
        
        if (cylAngle < i*45) {
            this.ModelMat.rotate(-45, 0, 1, 0);
            this.updateUniforms();
            drawCylinderSection();
        } else if (cylAngle > (i+1)*45) {
            this.updateUniforms();
            drawCylinderSection();
        } else {
            const rotAngle = (i>0) ? (cylAngle % (i*45)) : cylAngle;
            this.ModelMat.rotate(-45+rotAngle, 0, 1, 0);
            this.updateUniforms();
            drawCylinderSection();
        }   
    }
}
VBObox1.prototype.reload = function() {
    /**
     * Refill VBO on GPU with current JS contents
     * 
     * @method reload
     */
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vboContents);
   
}

function makeHollowCylinder() {
    /**
     * Generate vertices for generic hollow cylinder shape
     * 
     * @function makeHollowCylinder
     */
	const locs = new Float32Array([
		0, Math.PI/12, Math.PI/6, Math.PI/4, Math.PI/3, Math.PI*5/12, 
		Math.PI/2, Math.PI*7/12, Math.PI*2/3, Math.PI*3/4, Math.PI*5/6, Math.PI*11/12,
		Math.PI, Math.PI*13/12, Math.PI*7/6, Math.PI*5/4, Math.PI*4/3, Math.PI*17/12,
		Math.PI*3/2, Math.PI*19/12, Math.PI*5/3, Math.PI*7/4, Math.PI*11/6, Math.PI*23/12,
	]);

	const vertsPerLoop = 24;
	const floatsPerLoop = vertsPerLoop*floatsPerVertexNorm;

	const radInner = 1;
    const radOuter = 1.2;
    const halfThickness = 0.2;
    
    const ringWidth = radOuter - radInner;
    const ringHeight = 2*halfThickness;

    const zNorm = (ringWidth + ringHeight) / 2;

	const outerTopColr = new Float32Array([0.0, 1.0, 0.0]);
	const outerBotColr = new Float32Array([0.0, 1.0, 0.0]);

	const innerTopColr = new Float32Array([1.0, 0.0, 1.0]);
	const innerBotColr = new Float32Array([1.0, 0.0, 1.0]);
	
    /** @global */
    cylVerts = new Float32Array(floatsPerLoop*locs.length);

	for (i=0, j=0; i<locs.length; i++, j+=floatsPerLoop) {
        // Node i on outer BOTTOM (1)
        // Location
		cylVerts[j  ] = radOuter*Math.cos(locs[i]);
		cylVerts[j+1] = radOuter*Math.sin(locs[i]);
		cylVerts[j+2] = -halfThickness;
        cylVerts[j+3] = 1.0;
        // Color
		cylVerts[j+4] = outerBotColr[0];
		cylVerts[j+5] = outerBotColr[1];
        cylVerts[j+6] = outerBotColr[2];
        // Normal
        cylVerts[j+7] = cylVerts[j  ];
        cylVerts[j+8] = cylVerts[j+1];
        cylVerts[j+9] = -zNorm;

		// Node i on inner BOTTOM (2)
		cylVerts[j+10] = radInner*Math.cos(locs[i]);
		cylVerts[j+11] = radInner*Math.sin(locs[i]);
		cylVerts[j+12] = -halfThickness;
		cylVerts[j+13] = 1.0;
		cylVerts[j+14] = innerBotColr[0];
		cylVerts[j+15] = innerBotColr[1];
        cylVerts[j+16] = innerBotColr[2];
        cylVerts[j+17] = -cylVerts[j+10];
        cylVerts[j+18] = -cylVerts[j+11];
        cylVerts[j+19] = -zNorm;

		// Node i+1 on outer BOTTOM (3)
		cylVerts[j+20] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+21] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+22] = -halfThickness;
		cylVerts[j+23] = 1.0;
		cylVerts[j+24] = outerBotColr[0];
		cylVerts[j+25] = outerBotColr[1];
		cylVerts[j+26] = outerBotColr[2];
        cylVerts[j+27] = cylVerts[j+20];
        cylVerts[j+28] = cylVerts[j+21];
        cylVerts[j+29] = -zNorm;
        
        // Node i+1 on inner BOTTOM (4)
		cylVerts[j+30] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+31] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+32] = -halfThickness;
		cylVerts[j+33] = 1.0;
		cylVerts[j+34] = innerBotColr[0];
		cylVerts[j+35] = innerBotColr[1];
		cylVerts[j+36] = innerBotColr[2];
        cylVerts[j+37] = -cylVerts[j+30];
        cylVerts[j+38] = -cylVerts[j+31];
        cylVerts[j+39] = -zNorm;

		// Node i on inner BOTTOM (2)
		cylVerts[j+40] = radInner*Math.cos(locs[i]);
		cylVerts[j+41] = radInner*Math.sin(locs[i]);
		cylVerts[j+42] = -halfThickness;
		cylVerts[j+43] = 1.0;
		cylVerts[j+44] = innerBotColr[0];
		cylVerts[j+45] = innerBotColr[1];
		cylVerts[j+46] = innerBotColr[2];
        cylVerts[j+47] = -cylVerts[j+40]
        cylVerts[j+48] = -cylVerts[j+41]
        cylVerts[j+49] = -zNorm;

        // Node i+1 on outer BOTTOM (3)
		cylVerts[j+50] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+51] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+52] = -halfThickness;
		cylVerts[j+53] = 1.0;
		cylVerts[j+54] = outerBotColr[0];
		cylVerts[j+55] = outerBotColr[1];
		cylVerts[j+56] = outerBotColr[2];
        cylVerts[j+57] = cylVerts[j+50];
        cylVerts[j+58] = cylVerts[j+51];
        cylVerts[j+59] = -zNorm;
        
        // Node i+1 on inner BOTTOM (4)
		cylVerts[j+60] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+61] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+62] = -halfThickness;
		cylVerts[j+63] = 1.0;
		cylVerts[j+64] = innerBotColr[0];
		cylVerts[j+65] = innerBotColr[1];
		cylVerts[j+66] = innerBotColr[2];
        cylVerts[j+67] = -cylVerts[j+60];
        cylVerts[j+68] = -cylVerts[j+61];
        cylVerts[j+69] = -zNorm;

        // Node i on inner BOTTOM (2)
        cylVerts[j+70] = radInner*Math.cos(locs[i]);
        cylVerts[j+71] = radInner*Math.sin(locs[i]);
        cylVerts[j+72] = -halfThickness;
        cylVerts[j+73] = 1.0;
        cylVerts[j+74] = innerBotColr[0];
        cylVerts[j+75] = innerBotColr[1];
        cylVerts[j+76] = innerBotColr[2];
        cylVerts[j+77] = -cylVerts[j+70];
        cylVerts[j+78] = -cylVerts[j+71];
        cylVerts[j+79] = -zNorm;

		// Node i+1 on inner TOP (5)
		cylVerts[j+80] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+81] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+82] = halfThickness;
		cylVerts[j+83] = 1.0;
		cylVerts[j+84] = innerTopColr[0];
		cylVerts[j+85] = innerTopColr[1];
		cylVerts[j+86] = innerTopColr[2];
        cylVerts[j+87] = -cylVerts[j+80];
        cylVerts[j+88] = -cylVerts[j+81];
        cylVerts[j+89] = zNorm;

		// Node i on inner TOP (6)
		cylVerts[j+90] = radInner*Math.cos(locs[i]);
		cylVerts[j+91] = radInner*Math.sin(locs[i]);
		cylVerts[j+92] = halfThickness;
		cylVerts[j+93] = 1.0;
		cylVerts[j+94] = innerTopColr[0];
		cylVerts[j+95] = innerTopColr[1];
		cylVerts[j+96] = innerTopColr[2];
        cylVerts[j+97] = -cylVerts[j+90];
        cylVerts[j+98] = -cylVerts[j+91];
        cylVerts[j+99] = zNorm;
        
        // Node i on inner BOTTOM (2)
        cylVerts[j+100] = radInner*Math.cos(locs[i]);
        cylVerts[j+101] = radInner*Math.sin(locs[i]);
        cylVerts[j+102] = -halfThickness;
        cylVerts[j+103] = 1.0;
        cylVerts[j+104] = innerBotColr[0];
        cylVerts[j+105] = innerBotColr[1];
        cylVerts[j+106] = innerBotColr[2];
        cylVerts[j+107] = -cylVerts[j+100];
        cylVerts[j+108] = -cylVerts[j+101];
        cylVerts[j+109] = -zNorm;

		// Node i+1 on inner TOP (5)
		cylVerts[j+110] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+111] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+112] = halfThickness;
		cylVerts[j+113] = 1.0;
		cylVerts[j+114] = innerTopColr[0];
		cylVerts[j+115] = innerTopColr[1];
		cylVerts[j+116] = innerTopColr[2];
        cylVerts[j+117] = -cylVerts[j+110];
        cylVerts[j+118] = -cylVerts[j+111];
        cylVerts[j+119] = zNorm;

        // Node i+1 on inner TOP (5)
		cylVerts[j+120] = radInner*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+121] = radInner*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+122] = halfThickness;
		cylVerts[j+123] = 1.0;
		cylVerts[j+124] = innerTopColr[0];
		cylVerts[j+125] = innerTopColr[1];
		cylVerts[j+126] = innerTopColr[2];
        cylVerts[j+127] = -cylVerts[j+120];
        cylVerts[j+128] = -cylVerts[j+121];
        cylVerts[j+129] = zNorm;

        // Node i on inner TOP (6)
		cylVerts[j+130] = radInner*Math.cos(locs[i]);
		cylVerts[j+131] = radInner*Math.sin(locs[i]);
		cylVerts[j+132] = halfThickness;
		cylVerts[j+133] = 1.0;
		cylVerts[j+134] = innerTopColr[0];
		cylVerts[j+135] = innerTopColr[1];
		cylVerts[j+136] = innerTopColr[2];
        cylVerts[j+137] = -cylVerts[j+130];
        cylVerts[j+138] = -cylVerts[j+131];
        cylVerts[j+139] = zNorm;

        // Node i+1 on outer TOP (8)
		cylVerts[j+140] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+141] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+142] = halfThickness;
		cylVerts[j+143] = 1.0;
		cylVerts[j+144] = outerTopColr[0];
		cylVerts[j+145] = outerTopColr[1];
		cylVerts[j+146] = outerTopColr[2];
        cylVerts[j+147] = cylVerts[j+140];
        cylVerts[j+148] = cylVerts[j+141];
        cylVerts[j+149] = zNorm;

        // Node i on outer TOP (7)
		cylVerts[j+150] = radOuter*Math.cos(locs[i]);
		cylVerts[j+151] = radOuter*Math.sin(locs[i]);
		cylVerts[j+152] = halfThickness;
		cylVerts[j+153] = 1.0;
		cylVerts[j+154] = outerTopColr[0];
		cylVerts[j+155] = outerTopColr[1];
		cylVerts[j+156] = outerTopColr[2];
        cylVerts[j+157] = cylVerts[j+150];
        cylVerts[j+158] = cylVerts[j+151];
        cylVerts[j+159] = zNorm;

        // Node i on inner TOP (6)
		cylVerts[j+160] = radInner*Math.cos(locs[i]);
		cylVerts[j+161] = radInner*Math.sin(locs[i]);
		cylVerts[j+162] = halfThickness;
		cylVerts[j+163] = 1.0;
		cylVerts[j+164] = innerTopColr[0];
		cylVerts[j+165] = innerTopColr[1];
		cylVerts[j+166] = innerTopColr[2];
        cylVerts[j+167] = -cylVerts[j+160];
        cylVerts[j+168] = -cylVerts[j+161];
        cylVerts[j+169] = zNorm;

        // Node i+1 on outer TOP (8)
		cylVerts[j+170] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+171] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+172] = halfThickness;
		cylVerts[j+173] = 1.0;
		cylVerts[j+174] = outerTopColr[0];
		cylVerts[j+175] = outerTopColr[1];
		cylVerts[j+176] = outerTopColr[2];
        cylVerts[j+177] = cylVerts[j+170];
        cylVerts[j+178] = cylVerts[j+171];
        cylVerts[j+179] = zNorm;

        // Node i on outer BOTTOM (1)
		cylVerts[j+180] = radOuter*Math.cos(locs[i]);
		cylVerts[j+181] = radOuter*Math.sin(locs[i]);
		cylVerts[j+182] = -halfThickness;
		cylVerts[j+183] = 1.0;
		cylVerts[j+184] = outerBotColr[0];
		cylVerts[j+185] = outerBotColr[1];
		cylVerts[j+186] = outerBotColr[2];
        cylVerts[j+187] = cylVerts[j+180];
        cylVerts[j+188] = cylVerts[j+181];
        cylVerts[j+189] = -zNorm;

		// Node i+1 on outer BOTTOM (3)
		cylVerts[j+190] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+191] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+192] = -halfThickness;
		cylVerts[j+193] = 1.0;
		cylVerts[j+194] = outerBotColr[0];
		cylVerts[j+195] = outerBotColr[1];
		cylVerts[j+196] = outerBotColr[2];
        cylVerts[j+197] = cylVerts[j+190];
        cylVerts[j+198] = cylVerts[j+191];
        cylVerts[j+199] = -zNorm;

		// Node i on outer TOP (7)
		cylVerts[j+200] = radOuter*Math.cos(locs[i]);
		cylVerts[j+201] = radOuter*Math.sin(locs[i]);
		cylVerts[j+202] = halfThickness;
		cylVerts[j+203] = 1.0;
		cylVerts[j+204] = outerTopColr[0];
		cylVerts[j+205] = outerTopColr[1];
		cylVerts[j+206] = outerTopColr[2];
        cylVerts[j+207] = cylVerts[j+200];
        cylVerts[j+208] = cylVerts[j+201];
        cylVerts[j+209] = zNorm;

        // Node i+1 on outer TOP (8)
		cylVerts[j+210] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+211] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+212] = halfThickness;
		cylVerts[j+213] = 1.0;
		cylVerts[j+214] = outerTopColr[0];
		cylVerts[j+215] = outerTopColr[1];
		cylVerts[j+216] = outerTopColr[2];
        cylVerts[j+217] = cylVerts[j+210];
        cylVerts[j+218] = cylVerts[j+211];
        cylVerts[j+219] = zNorm;

        // Node i+1 on outer BOTTOM (3)
		cylVerts[j+220] = radOuter*Math.cos(locs[(i+1)%locs.length]);
		cylVerts[j+221] = radOuter*Math.sin(locs[(i+1)%locs.length]);
		cylVerts[j+222] = -halfThickness;
		cylVerts[j+223] = 1.0;
		cylVerts[j+224] = outerBotColr[0];
		cylVerts[j+225] = outerBotColr[1];
		cylVerts[j+226] = outerBotColr[2];
        cylVerts[j+227] = cylVerts[j+220];
        cylVerts[j+228] = cylVerts[j+221];
        cylVerts[j+229] = -zNorm;

		// Node i on outer TOP (7)
		cylVerts[j+230] = radOuter*Math.cos(locs[i]);
		cylVerts[j+231] = radOuter*Math.sin(locs[i]);
		cylVerts[j+232] = halfThickness;
		cylVerts[j+233] = 1.0;
		cylVerts[j+234] = outerTopColr[0];
		cylVerts[j+235] = outerTopColr[1];
		cylVerts[j+236] = outerTopColr[2];
        cylVerts[j+237] = cylVerts[j+230];
        cylVerts[j+238] = cylVerts[j+231];
        cylVerts[j+239] = zNorm;
	}
}
function drawHollowCylinder() {
    /**
     * Draw hollow cylinder using global cylinder vertices
     * 
     * @function drawHollowCylinder
     */
	gl.drawArrays(
        gl.TRIANGLES,
		cylStart / floatsPerVertexNorm,
		cylVerts.length / floatsPerVertexNorm);
}

function makeSphere() {
    /**
     * Generate vertices for sphere shape
     * 
     * @function makeSphere
     */

    const slices = 13;
    const sliceVerts = 27;
    const sphColr = new Float32Array([1.0, 0.3, 0.3])
    const sliceAngle = Math.PI/slices;
    
    /** @global */
    sphVerts = new Float32Array(  ((slices * 2* sliceVerts) -2) * floatsPerVertexNorm);
    
    let cos0 = 0.0;	
    let sin0 = 0.0;
    let cos1 = 0.0;
    let sin1 = 0.0;	

    let j = 0;
    let isLast = 0;
    let isFirst = 1;

    for(s=0; s<slices; s++) {
        if(s==0) {
            isFirst = 1;
            cos0 = 1.0;
            sin0 = 0.0;
        }
        else {
            isFirst = 0;	
            cos0 = cos1;
            sin0 = sin1;
        }			

        cos1 = Math.cos((s+1)*sliceAngle);
        sin1 = Math.sin((s+1)*sliceAngle);

        if (s==slices-1) isLast=1;
        for(v=isFirst; v< 2*sliceVerts-isLast; v++, j+=floatsPerVertexNorm) {
            // Position	
            if (v%2==0) { 
                sphVerts[j  ] = sin0 * Math.cos(Math.PI*(v)/sliceVerts); 	
                sphVerts[j+1] = sin0 * Math.sin(Math.PI*(v)/sliceVerts);	
                sphVerts[j+2] = cos0;		
                sphVerts[j+3] = 1.0;			
            } else {
                sphVerts[j  ] = sin1 * Math.cos(Math.PI*(v-1)/sliceVerts);		// x
                sphVerts[j+1] = sin1 * Math.sin(Math.PI*(v-1)/sliceVerts);		// y
                sphVerts[j+2] = cos1;																				// z
                sphVerts[j+3] = 1.0;																				// w.		
            }
            // Color
            sphVerts[j+4] = sphColr[0];
            sphVerts[j+5] = sphColr[1];
            sphVerts[j+6] = sphColr[2];
            // Normal
            sphVerts[j+7] = sphVerts[j];
            sphVerts[j+8] = sphVerts[j+1];
            sphVerts[j+9] = sphVerts[j+2];
        }
    }
}
function drawSphere() {
    /**
     * Draw sphere using global sphere vertices
     * 
     * @function drawSphere
     */

    gl.drawArrays(
        gl.TRIANGLE_STRIP,
        sphStart / floatsPerVertexNorm,
        sphVerts.length / floatsPerVertexNorm);
}

function makeBoxSide() {
    /**
     * Generate vertices for single 3D side of box
     * 
     * @function makeBoxSide
     */
    const sq2 = Math.sqrt(2);

    /** @global */
    boxVerts = new Float32Array([
        // Outside Face
	    0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,      0.0, 0.0, -1.0, // Node 0
	    1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,      0.0, 0.0, -1.0, // Node 1 
	    0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,      0.0, 0.0, -1.0, // Node 3  	(Cyan)
	    1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0,      0.0, 0.0, -1.0, // Node 2  	(Green)
	    1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,      0.0, 0.0, -1.0, // Node 1  	(Blue)
	    0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,      0.0, 0.0, -1.0, // Node 3  	(Cyan)
	    // Inside Face
	    0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0,      0.0, 0.0, 1.0,  // Node 8  	(Red)
	    0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0,      0.0, 0.0, 1.0,  // Node 9  	(Purple)
	    0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0,      0.0, 0.0, 1.0,  // Node 11 	(White)
	    0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0,      0.0, 0.0, 1.0,  // Node 10 	(Yellow)
	    0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0,      0.0, 0.0, 1.0,  // Node 9  	(Purple)
	    0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0,      0.0, 0.0, 1.0,  // Node 11 	(White)
    	// Inside Edge 1
	    0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,      0.0,-sq2, sq2,  // Node 0  	(Black)
	    0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0,      0.0,-sq2, sq2,  // Node 8  	(Red)
	    0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0,      0.0,-sq2, sq2,  // Node 12 	(Green)
	    1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,      0.0,-sq2, sq2,  // Node 1  	(Blue)
	    0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0,      0.0,-sq2, sq2,  // Node 9  	(Purple)
	    0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0,      0.0,-sq2, sq2,  // Node 12 	(Green)
	    0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0,      0.0,-sq2, sq2,  // Node 8  	(Red)
	    0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0,      0.0,-sq2, sq2,  // Node 9  	(Purple)
	    0.50, 0.00, 0.00, 1.0,		0.0, 1.0, 0.0,      0.0,-sq2, sq2,  // Node 12 	(Green)
	    // Inside Edge 2
	    1.00, 0.00, 0.00, 1.0,		0.0, 0.0, 1.0,      sq2, 0.0, sq2,  // Node 1  	(Blue)
	    0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0,      sq2, 0.0, sq2,  // Node 9  	(Purple)
	    1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0,      sq2, 0.0, sq2,  // Node 13	(Cyan)
	    1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0,      sq2, 0.0, sq2,  // Node 2  	(Green)
	    0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0,      sq2, 0.0, sq2,  // Node 10 	(Yellow)
	    1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0,      sq2, 0.0, sq2,  // Node 13	(Cyan)
	    0.90, 0.10, 0.10, 1.0,		1.0, 0.0, 1.0,      sq2, 0.0, sq2,  // Node 9  	(Purple)
	    0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0,      sq2, 0.0, sq2,  // Node 10 	(Yellow)
	    1.00, 0.50, 0.00, 1.0,		0.0, 1.0, 1.0,      sq2, 0.0, sq2,  // Node 13	(Cyan)
	    // Inside Edge 3
	    1.00, 1.00, 0.00, 1.0,		0.0, 1.0, 0.0,      0.0, sq2, sq2,  // Node 2  	(Green)
	    0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0,      0.0, sq2, sq2,  // Node 10 	(Yellow)
	    0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0,      0.0, sq2, sq2,  // Node 14	(Black)
	    0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,      0.0, sq2, sq2,  // Node 3  	(Cyan)
	    0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0,      0.0, sq2, sq2,  // Node 11 	(White)
	    0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0,      0.0, sq2, sq2,  // Node 14	(Black)
	    0.90, 0.90, 0.10, 1.0,		1.0, 1.0, 0.0,      0.0, sq2, sq2,  // Node 10 	(Yellow)
	    0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0,      0.0, sq2, sq2,  // Node 11 	(White)
	    0.50, 1.00, 0.00, 1.0,		0.0, 0.0, 0.0,      0.0, sq2, sq2,  // Node 14	(Black)
	    // Inside Edge 4
	    0.00, 1.00, 0.00, 1.0,		0.0, 1.0, 1.0,     -sq2, 0.0, sq2,  // Node 3  	(Cyan)
	    0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0,     -sq2, 0.0, sq2,  // Node 11 	(White)
	    0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0,     -sq2, 0.0, sq2,  // Node 15	(Blue)
	    0.00, 0.00, 0.00, 1.0,		0.0, 0.0, 0.0,     -sq2, 0.0, sq2,  // Node 0  	(Black)
	    0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0,     -sq2, 0.0, sq2,  // Node 8  	(Red)
	    0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0,     -sq2, 0.0, sq2,  // Node 15	(Blue)
	    0.10, 0.10, 0.10, 1.0,		1.0, 0.0, 0.0,     -sq2, 0.0, sq2,  // Node 8  	(Red)
	    0.10, 0.90, 0.10, 1.0,		1.0, 1.0, 1.0,     -sq2, 0.0, sq2,  // Node 11 	(White)
	    0.00, 0.50, 0.00, 1.0,		0.0, 0.0, 1.0,     -sq2, 0.0, sq2,  // Node 15	(Blue)
    ]);
}
function drawBoxSide() {
    /**
     * Draw single box side using global box side vertices
     * 
     * @function drawBoxSide
     */

    gl.drawArrays(
        gl.TRIANGLES,
        boxStart / floatsPerVertexNorm,
        boxVerts.length / floatsPerVertexNorm);
}

function makeCylinderSection() {
    /**
     * Generate vertices for single section of rolling cylinder
     * 
     * @function makeCylinderSection
     */
    const out = -0.1;
    const inn =  0.0;

    const hwd = 0.2;
    const hln = 0.4;

    /** @global */
    secVerts = new Float32Array([
        // Bottom
         0.0,-hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0,-1.0,
         0.0, hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0,-1.0,
         hwd,-hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0,-1.0,

         hwd, hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0,-1.0,
         0.0, hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0,-1.0,
         hwd,-hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0,-1.0,

        // Side 1
         0.0,-hln, out, 1.0,    0.0, 1.0, 1.0,     -1.0, 0.0, 0.0, 
         0.0,-hln, inn, 1.0,    0.0, 1.0, 1.0,     -1.0, 0.0, 0.0,
         0.0, hln, out, 1.0,    0.0, 1.0, 1.0,     -1.0, 0.0, 0.0,

         0.0, hln, inn, 1.0,    0.0, 1.0, 1.0,     -1.0, 0.0, 0.0,
         0.0,-hln, inn, 1.0,    0.0, 1.0, 1.0,     -1.0, 0.0, 0.0,
         0.0, hln, out, 1.0,    0.0, 1.0, 1.0,     -1.0, 0.0, 0.0,
        
        // Side 2
         hwd,-hln, out, 1.0,    0.0, 1.0, 1.0,      1.0, 0.0, 0.0, 
         hwd,-hln, inn, 1.0,    0.0, 1.0, 1.0,      1.0, 0.0, 0.0,
         hwd, hln, out, 1.0,    0.0, 1.0, 1.0,      1.0, 0.0, 0.0,

         hwd, hln, inn, 1.0,    0.0, 1.0, 1.0,      1.0, 0.0, 0.0,
         hwd,-hln, inn, 1.0,    0.0, 1.0, 1.0,      1.0, 0.0, 0.0,
         hwd, hln, out, 1.0,    0.0, 1.0, 1.0,      1.0, 0.0, 0.0,

        // Side 3
         0.0,-hln, out, 1.0,    0.0, 1.0, 1.0,      0.0,-1.0, 0.0,
         0.0,-hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0,-1.0, 0.0,
         hwd,-hln, out, 1.0,    0.0, 1.0, 1.0,      0.0,-1.0, 0.0,

         hwd,-hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0,-1.0, 0.0,
         0.0,-hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0,-1.0, 0.0,
         hwd,-hln, out, 1.0,    0.0, 1.0, 1.0,      0.0,-1.0, 0.0,

        // Side 4
         0.0, hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 1.0, 0.0,
         0.0, hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 1.0, 0.0,
         hwd, hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 1.0, 0.0,

         hwd, hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 1.0, 0.0,
         0.0, hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 1.0, 0.0,
         hwd, hln, out, 1.0,    0.0, 1.0, 1.0,      0.0, 1.0, 0.0,

        // Top
         0.0,-hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0, 1.0,
         0.0, hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0, 1.0,
         hwd,-hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0, 1.0,

         hwd, hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0, 1.0,
         0.0, hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0, 1.0,
         hwd,-hln, inn, 1.0,    0.0, 1.0, 1.0,      0.0, 0.0, 1.0,
    ]);
}
function drawCylinderSection() {
    /**
     * Draw single cylinder section using global cylinder section vertices
     * 
     * @function drawCylinderSection
     */

    gl.drawArrays(
        gl.TRIANGLES,
        secStart / floatsPerVertexNorm,
        secVerts.length / floatsPerVertexNorm);
}


// ==== VBObox2 - Phong Shading ====
function VBObox2() {

    // Vertex Shader
    this.VERT_SRC =
        'precision highp float;\n' +
        //
        'struct MatlT {\n' +
        '       vec3 emit;\n' +
        '       vec3 ambi;\n' +
        '       vec3 diff;\n' +
        '       vec3 spec;\n' +
        '       int shiny;\n' +
        '   };\n' +
        //
        'attribute vec4 a_Position;\n' +
        'attribute vec4 a_Normal;\n' +
        //
        'uniform MatlT u_MatlSet[1];\n' +
        'uniform mat4 u_ModelMat;\n' +
        'uniform mat4 u_MvpMat;\n' +
        'uniform mat4 u_NormalMat;\n' +
        //
        'varying vec3 v_Kd;\n' +
        //
        'varying vec4 v_Position;\n' +
        'varying vec3 v_Normal;\n' +
        //
        'void main() {\n' +
        '  gl_Position = u_MvpMat * a_Position;\n' +
        '  v_Position = u_ModelMat * a_Position;\n' +
        '  v_Normal = normalize(vec3(u_NormalMat * a_Normal));\n' +
        '  v_Kd = u_MatlSet[0].diff;\n' +
        ' }\n';
    
    // Fragment shader
    this.FRAG_SRC =  
        'precision highp float;\n' +
        'precision highp int;\n' +
        //
        'struct LampT {\n' +
        '       vec3 pos;\n' +
        '       vec3 ambi;\n' +
        '       vec3 diff;\n' +
        '       vec3 spec;\n' +
        '   };\n' +
        //
        'struct MatlT {\n' +
        '       vec3 emit;\n' +
        '       vec3 ambi;\n' +
        '       vec3 diff;\n' +
        '       vec3 spec;\n' +
        '       int shiny;\n' +
        '   };\n' +
        //
        'uniform LampT u_LampSet[1];\n' +
        'uniform MatlT u_MatlSet[1];\n' +
        //
        'uniform vec3 u_Look;\n' +
        //
        'uniform float u_LightCode;\n' +
        //
        'varying vec3 v_Normal;\n' +
        'varying vec4 v_Position;\n' +
        'varying vec3 v_Kd;\n' +
        //
        'void main() {\n' +
        '   vec3 normal = normalize(v_Normal);\n' +
        '   vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
        '   vec3 V = normalize(-u_Look);\n'+
        '   float nDotL = max(dot(lightDirection, normal), 0.0);\n' +
        //
        '   vec3 emissive = u_MatlSet[0].emit;\n' +
        '   vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
        '   vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
        //
        '   float vecDot = 0.0;\n' +
        '   if (u_LightCode > 0.5) {\n' +
                // Phong Lighting
        '       vec3 R = reflect(-lightDirection, normal);\n' +
        '       vecDot = max(dot(R, V), 0.0);\n' +
        '   } else {\n' +
                // Blinn-Phong Lighting
        '       vec3 H = normalize(lightDirection + V); \n' +
        '       vecDot = max(dot(H, normal), 0.0);\n' +
        '   };\n' +
        '   float e64 = pow(vecDot, float(u_MatlSet[0].shiny));\n' +
        '   vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
        '   gl_FragColor = vec4(emissive + ambient + diffuse + speculr, 1.0);\n' +
        '}\n';



    //  Initialize Vertex Buffer
    makeSphere();
    makeBoxSide();
    makeHollowCylinder();
    makeCylinderSection();

    const mySiz = (sphVerts.length + boxVerts.length + cylVerts.length + secVerts.length);
    this.vboVerts = mySiz / floatsPerVertexNorm;
    const vboVertices = new Float32Array(mySiz);

    /** @global */
    sphStart = 0;
    for(i=0, j=0; j<sphVerts.length; i++, j++) {
        vboVertices[i] = sphVerts[j];
    }
    /** @global */
    boxStart = i;
    for(j=0; j<boxVerts.length; i++, j++) {
        vboVertices[i] = boxVerts[j];
    }
    /** @global */
    cylStart = i;
    for(j=0; j<cylVerts.length; i++, j++) {
        vboVertices[i] = cylVerts[j];
    }
    /** @global */
    secStart = i;
    for(j=0; j<secVerts.length; i++, j++) {
        vboVertices[i] = secVerts[j];
    }

    // Store vertices in VBO
    this.vboContents = vboVertices;

    // Byte size of every float in VBO 
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
    // Total number of bytes in VBO
    this.vboBytes = this.vboContents.length * this.FSIZE;
    // Stride length in bytes between vertices in VBO
    this.vboStride = this.vboBytes / this.vboVerts; 
    
    // Attribute sizes
    this.vboFcount_a_Pos1 =  4;     // # of floats to store vertex position
    this.vboFcount_a_Colr1 = 3;     // # of floats to store vertex color 
    this.vboFcount_a_Norm1 = 3;     // # of floats to store vertex normal
    console.assert(
        (this.vboFcount_a_Pos1 + this.vboFcount_a_Colr1 + this.vboFcount_a_Norm1) * this.FSIZE == this.vboStride,
        "VBObox1.vboStride disagrees with attribute-size values");
    
    // Attribute offsets  
    this.vboOffset_a_Pos1 = 0;  // First vertex position in VBO
    this.vboOffset_a_Colr1 = this.vboFcount_a_Pos1 * this.FSIZE;    // First vertex color in VBO
    this.vboOffset_a_Norm1 = this.vboOffset_a_Colr1 + (this.vboFcount_a_Colr1*this.FSIZE);  // First vertex normal in VBO

    // GPU memory locations:
    this.vboLoc;
    this.shaderLoc;
    this.a_PosLoc;
    //this.a_ColrLoc;
    this.a_NormLoc;
    
    // Uniform locations &values in our shaders
    this.ModelMat = new Matrix4();
    this.WorldMat = new Matrix4();  
    this.NormalMat = new Matrix4();  

    this.u_ModelMatLoc;
    this.u_MvpMatLoc;
    this.u_NormalMatLoc;
    this.u_eyePosWorldLoc;

    this.lamp0 = new LightsT();

    let matlSel = MATL_RED_PLASTIC;
    this.matl0 = new Material(matlSel);
} 
VBObox2.prototype.init = function() {
    /**
     * Initialize the Vertex Buffer Object on the GPU
     * 
     * @method init
     */

    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(this.constructor.name + '.init() failed to create executable Shaders on the GPU');
        return;
    }
    gl.program = this.shaderLoc;
    
    // Create VBO location on GPU
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
        console.log(this.constructor.name + '.init() failed to create VBO in GPU'); 
        return;
    }

    // Initialize VBO on GPU and fill it with vertices
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc);		
    gl.bufferData(gl.ARRAY_BUFFER, this.vboContents, gl.STATIC_DRAW);	
    
    // Save GPU location of shaders
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
    if(this.a_PosLoc < 0) {
        console.log(this.constructor.name + 
                        '.init() Failed to get GPU location of attribute a_Position');
        return;
    }

    this.a_NormLoc = gl.getAttribLocation(this.shaderLoc, 'a_Normal');
    if(this.a_NormLoc < 0) {
        console.log(this.constructor.name + '.init() Failed to get GPU location of attribute a_Normal');
        return;
    }

    // Save GPU location of uniforms
    this.u_LookLoc = gl.getUniformLocation(this.shaderLoc, 'u_Look');
    this.u_LightCodeLoc = gl.getUniformLocation(this.shaderLoc, 'u_LightCode');
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat');
    this.u_MvpMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_MvpMat');
    this.u_NormalMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_NormalMat');
    if (!this.u_LookLoc 
        || !this.u_ModelMatLoc 
        || !this.u_MvpMatLoc 
        || !this.u_NormalMatLoc) { 
        console.log(this.constructor.name + '.init() failed to get GPU location for matrix uniform');
        return -1;
    }  

    this.lamp0.u_pos = gl.getUniformLocation(this.shaderLoc, 'u_LampSet[0].pos');
    this.lamp0.u_ambi = gl.getUniformLocation(this.shaderLoc, 'u_LampSet[0].ambi');
    this.lamp0.u_diff = gl.getUniformLocation(this.shaderLoc, 'u_LampSet[0].diff');
    this.lamp0.u_spec = gl.getUniformLocation(this.shaderLoc, 'u_LampSet[0].spec');
    if (!this.lamp0.u_pos 
        || !this.lamp0.u_ambi 
        || !this.lamp0.u_diff 
        || !this.lamp0.u_spec) {
        console.log(this.constructor.name + '.init() failed to get GPU Lamp0 storage locations');
        return -1;
    }

    this.matl0.uLoc_Ke = gl.getUniformLocation(this.shaderLoc, 'u_MatlSet[0].emit');
    this.matl0.uLoc_Ka = gl.getUniformLocation(this.shaderLoc, 'u_MatlSet[0].ambi');
    this.matl0.uLoc_Kd = gl.getUniformLocation(this.shaderLoc, 'u_MatlSet[0].diff');
    this.matl0.uLoc_Ks = gl.getUniformLocation(this.shaderLoc, 'u_MatlSet[0].spec');
    this.matl0.uLoc_Kshiny = gl.getUniformLocation(this.shaderLoc, 'u_MatlSet[0].shiny');
    if (!this.matl0.uLoc_Ke 
        || !this.matl0.uLoc_Ka 
        || !this.matl0.uLoc_Kd 
        || !this.matl0.uLoc_Ks 
        || !this.matl0.uLoc_Kshiny) {
        console.log(this.constructor.name +'.init() failed to get GPU Reflectance storage locations');
        return -1;
    }
} 
VBObox2.prototype.switchToMe = function() {
    /**
     * Switch to rendering this VBO on WebGL canvas
     * 
     * @method switchToMe
     */
    
    gl.useProgram(this.shaderLoc);	
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboLoc); 
    
    // Point to a_Pos
    gl.vertexAttribPointer(
        this.a_PosLoc,
        this.vboFcount_a_Pos1,
        gl.FLOAT,
        false,
        this.vboStride,
        this.vboOffset_a_Pos1);

    // Point to a_Norm
    gl.vertexAttribPointer(
        this.a_NormLoc,
        this.vboFcount_a_Norm1,
        gl.FLOAT,
        false,
        this.vboStride,
        this.vboOffset_a_Norm1);
                                  
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_NormLoc);
}
VBObox2.prototype.isReady = function() {
    /**
     * Returns 'true' if WebGL is ready to render this object's VBO and shader program
     * 
     * @method isReady
     * @returns {Boolean} Whether this VBO and shader program are ready to be rendered
     */

    let isOK = true;
    
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + '.isReady() false: shader program at this.shaderLoc not in use');
        isOK = false;
    }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + '.isReady() false: vbo at this.vboLoc not in use');
        isOK = false;
    }

    return isOK;
}
VBObox2.prototype.adjust = function() {
    /**
     * Update GPU model matrix uniform and attributes
     * 
     * @method adjust
     */

    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + '.adjust() call you needed to call this.switchToMe()');
    }     

    this.WorldMat.set(g_worldMat);
    this.ModelMat.setIdentity();
    this.updateUniforms();

}
VBObox2.prototype.updateUniforms = function() {
    /**
     * Update GPU uniforms
     * 
     * @method updateUniforms
     */

    // Update view uniform
    gl.uniform3f(this.u_LookLoc, L_x-e_x, L_y-e_y, L_z-e_z);

    // Determine lighting type
    gl.uniform1f(this.u_LightCodeLoc, lightingMode);

    this.lamp0.I_pos.elements.set( [lightPosX, lightPosY, lightPosZ]);

    this.lamp0.I_ambi.elements.set(lightColr_Ambi);
    this.lamp0.I_diff.elements.set(lightColr_Diff);
    this.lamp0.I_spec.elements.set(lightColr_Spec);

    // Update lighting unifroms
    gl.uniform3fv(this.lamp0.u_pos, this.lamp0.I_pos.elements.slice(0,3));
    gl.uniform3fv(this.lamp0.u_ambi, this.lamp0.I_ambi.elements);
    gl.uniform3fv(this.lamp0.u_diff, this.lamp0.I_diff.elements);
    gl.uniform3fv(this.lamp0.u_spec, this.lamp0.I_spec.elements);

    // Update Material uniform
    gl.uniform3fv(this.matl0.uLoc_Ke, this.matl0.K_emit.slice(0, 3));
    gl.uniform3fv(this.matl0.uLoc_Ka, this.matl0.K_ambi.slice(0, 3));
    gl.uniform3fv(this.matl0.uLoc_Kd, this.matl0.K_diff.slice(0, 3));
    gl.uniform3fv(this.matl0.uLoc_Ks, this.matl0.K_spec.slice(0, 3));
    gl.uniform1i(this.matl0.uLoc_Kshiny, parseInt(this.matl0.K_shiny, 10));

    const MvpMat = new Matrix4();
    MvpMat.set(this.WorldMat);

    MvpMat.multiply(this.ModelMat);
    
    this.NormalMat.setInverseOf(this.ModelMat);
    this.NormalMat.transpose();

    // Send  new 'ModelMat' values to the GPU's uniform
    gl.uniformMatrix4fv(this.u_ModelMatLoc, false, this.ModelMat.elements);	
    gl.uniformMatrix4fv(this.u_MvpMatLoc, false, MvpMat.elements);
    gl.uniformMatrix4fv(this.u_NormalMatLoc, false, this.NormalMat.elements);
} 
VBObox2.prototype.draw = function() {
    /**
     * Render VBO contents in WebGL canvas
     * 
     * @method draw
     */

    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name + '.draw() call you needed to call this.switchToMe()');
    }  

    pushMatrix(this.ModelMat);

    // Draw sphere
    this.matl0.setMatl(sphereMatl);
    this.ModelMat.translate(-1, 1, 0.5);
    this.ModelMat.scale(0.5, 0.5, 0.5);
    this.ModelMat.rotate(g_angle_gyro, 0, 0, 1);
    this.updateUniforms();
    drawSphere();
    
    this.ModelMat = popMatrix();
    pushMatrix(this.ModelMat);

    // Draw folding cube
    this.matl0.setMatl(MATL_EMERALD)
    this.ModelMat.translate(0.9, 1.5, 0.0);
    this.ModelMat.rotate(180, 0, 0, 1);
    this.ModelMat.scale(0.5, 0.5, 0.5);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.rotate(180, 0, 1, 0);
    this.ModelMat.translate(-1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90-g_angle_box, 1, 0, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.translate(1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90+g_angle_box, 0, 1, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.translate(1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90+g_angle_box, 0, 1, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.translate(1.0, 0.0, 0.0);
    this.ModelMat.rotate(-90+g_angle_box, 0, 1, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat.rotate(180, 1, 0, 0);
    this.ModelMat.translate(0.0, -1.0, 0.0);
    this.ModelMat.rotate(-90-g_angle_box, 1, 0, 0);
    this.updateUniforms();
    drawBoxSide();

    this.ModelMat = popMatrix();
    pushMatrix(this.ModelMat);

    // Draw rotating rings
    this.matl0.setMatl(MATL_BLU_PLASTIC);
    this.ModelMat.translate(-1.8, -1.5, 0.0);
    this.ModelMat.scale(0.3, 0.3, 0.3);
    this.ModelMat.rotate(90, 0, 1, 0);
    this.ModelMat.translate(-1.2, 0.0, 0.0);
    this.ModelMat.rotate(3*g_angle_gyro, 1, 0, 0);
    this.updateUniforms();
    drawHollowCylinder();

    const scale=1.0/1.2;
    for (i=0; i<5; i++) {
        this.ModelMat.rotate(3*g_angle_gyro, 1-i%2, i%2, 0);
        this.ModelMat.scale(scale, scale, scale);
        this.updateUniforms();
        drawHollowCylinder();
    }

    this.ModelMat = popMatrix();

    // Draw rolling cylinder
    this.matl0.setMatl(MATL_PEARL);
    this.ModelMat.translate(0.8, -1.5, 0.1);
    this.updateUniforms();
    drawCylinderSection();

    for (i=0; i<7; i++) {
        this.ModelMat.translate(0.2, 0.0, 0.0);
        
        if (cylAngle < i*45) {
            this.ModelMat.rotate(-45, 0, 1, 0);
            this.updateUniforms();
            drawCylinderSection();
        } else if (cylAngle > (i+1)*45) {
            this.updateUniforms();
            drawCylinderSection();
        } else {
            const rotAngle = (i>0) ? (cylAngle % (i*45)) : cylAngle;
            this.ModelMat.rotate(-45+rotAngle, 0, 1, 0);
            this.updateUniforms();
            drawCylinderSection();
        }
    }        
}
VBObox2.prototype.reload = function() {
    /**
     * Refill VBO on GPU with current JS contents
     * 
     * @method reload
     */
    
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vboContents);
}
