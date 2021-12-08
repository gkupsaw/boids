import { mat4 } from 'gl-matrix';

//
// Sources:
//     1: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
//

const GLOBALS = {
    animate: true,
    use2d: false,
    rotation: 0.0,
};

//
// Start the WebGL app [1]
//
function initializeGL() {
    const canvas = document.querySelector('#glCanvas');
    // Initialize the GL context
    const gl = canvas.getContext('webgl');

    // Only continue if WebGL is available and working
    if (gl === null) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
    }

    `;
    const fsSource = `varying lowp vec4 vColor;

    void main() {
        gl_FragColor = vColor;
    }
    `;

    const standardShader = initShaderProgram(gl, vsSource, fsSource);

    const buffers = GLOBALS.use2d ? initSquareBuffers(gl) : initCubeBuffers(gl);

    if (GLOBALS.animate) {
        let then = 0;
        // Draw the scene repeatedly
        function render(now) {
            now *= 0.001; // convert to seconds
            const deltaTime = now - then;
            then = now;

            drawScene(gl, standardShader, buffers, deltaTime);

            GLOBALS.rotation += deltaTime;

            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
    } else {
        drawScene(gl, standardShader, buffers);
    }

    return { gl };
}

//
// Initialize a shader program, so WebGL knows how to draw our data. [1]
//
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create the shader program

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    const shader = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        },
    };

    return shader;
}

//
// Creates a shader of the given type, uploads the source and compiles it. [1]
//
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

//
// Initialize buffers for a square [1]
//
function initSquareBuffers(gl) {
    // Create a buffer for the square's positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.

    // prettier-ignore
    const positions = [
      -1.0, 1.0,        // top left
      1.0, 1.0,         // top right
      -1.0, -1.0,       // bottom left
      1.0, -1.0,        // bottom right
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // prettier-ignore
    const colors = [
      1.0,  1.0,  1.0,  1.0,    // white
      1.0,  0.0,  0.0,  1.0,    // red
      0.0,  1.0,  0.0,  1.0,    // green
      0.0,  0.0,  1.0,  1.0,    // blue
    ];

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: { buffer: positionBuffer, dimensions: 2 },
        color: { buffer: colorBuffer, dimensions: 4 },
    };
}

// //
// // Initialize buffers for a cube [1]
// //
function initCubeBuffers(gl) {
    // Create a buffer for the square's positions.

    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Now create an array of positions for the square.

    // prettier-ignore
    const positions = [
      // Front face
      -1.0, -1.0,  1.0,
       1.0, -1.0,  1.0,
       1.0,  1.0,  1.0,
      -1.0,  1.0,  1.0,

      // Back face
      -1.0, -1.0, -1.0,
      -1.0,  1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0, -1.0, -1.0,

      // Top face
      -1.0,  1.0, -1.0,
      -1.0,  1.0,  1.0,
       1.0,  1.0,  1.0,
       1.0,  1.0, -1.0,

      // Bottom face
      -1.0, -1.0, -1.0,
       1.0, -1.0, -1.0,
       1.0, -1.0,  1.0,
      -1.0, -1.0,  1.0,

      // Right face
       1.0, -1.0, -1.0,
       1.0,  1.0, -1.0,
       1.0,  1.0,  1.0,
       1.0, -1.0,  1.0,

      // Left face
      -1.0, -1.0, -1.0,
      -1.0, -1.0,  1.0,
      -1.0,  1.0,  1.0,
      -1.0,  1.0, -1.0,
    ];

    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // prettier-ignore
    const faceColors = [
      [1.0,  1.0,  1.0,  1.0],    // Front face: white
      [1.0,  0.0,  0.0,  1.0],    // Back face: red
      [0.0,  1.0,  0.0,  1.0],    // Top face: green
      [0.0,  0.0,  1.0,  1.0],    // Bottom face: blue
      [1.0,  1.0,  0.0,  1.0],    // Right face: yellow
      [1.0,  0.0,  1.0,  1.0],    // Left face: purple
    ];

    // Convert the array of colors into a table for all the vertices.

    let colors = [];

    for (let j = 0; j < faceColors.length; ++j) {
        const c = faceColors[j];

        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    // prettier-ignore
    const indices = [
      0,  1,  2,      0,  2,  3,    // front
      4,  5,  6,      4,  6,  7,    // back
      8,  9,  10,     8,  10, 11,   // top
      12, 13, 14,     12, 14, 15,   // bottom
      16, 17, 18,     16, 18, 19,   // right
      20, 21, 22,     20, 22, 23,   // left
    ];

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: { buffer: positionBuffer, dimensions: 3 },
        color: { buffer: colorBuffer, dimensions: 4 },
        indices: { buffer: indexBuffer, count: indices.length },
    };
}

//
// Draw the scene [1]
//
function drawScene(gl, shader, buffers) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things

    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Now move the drawing position a bit to where we want to
    // start drawing the square.

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
    mat4.translate(
        modelViewMatrix, // destination matrix
        modelViewMatrix, // matrix to translate
        [-0.0, 0.0, -6.0]
    ); // amount to translate

    if (GLOBALS.animate) {
        mat4.rotate(
            modelViewMatrix, // destination matrix
            modelViewMatrix, // matrix to rotate
            GLOBALS.rotation, // amount to rotate in radians
            [0, 0, 1] // axis to rotate around
        );
        if (!GLOBALS.use2d) {
            mat4.rotate(
                modelViewMatrix, // destination matrix
                modelViewMatrix, // matrix to rotate
                GLOBALS.rotation * 0.7, // amount to rotate in radians
                [0, 1, 0]
            ); // axis to rotate around (X)
        }
    }

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    if (buffers.position) {
        const numComponents = buffers.position.dimensions;
        const type = gl.FLOAT; // the data in the buffer is 32bit floats
        const normalize = false; // don't normalize
        const stride = 0; // how many bytes to get from one set of values to the next
        // 0 = use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position.buffer);
        gl.vertexAttribPointer(shader.attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(shader.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute.
    if (buffers.color) {
        const numComponents = buffers.color.dimensions;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color.buffer);
        gl.vertexAttribPointer(shader.attribLocations.vertexColor, numComponents, type, normalize, stride, offset);
        gl.enableVertexAttribArray(shader.attribLocations.vertexColor);
    }

    const DRAW_ELEMENTS = Boolean(buffers.indices);

    if (DRAW_ELEMENTS) {
        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices.buffer);
    }

    // Tell WebGL to use our program when drawing

    gl.useProgram(shader.program);

    // Set the shader uniforms

    gl.uniformMatrix4fv(shader.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(shader.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    if (DRAW_ELEMENTS) {
        const vertexCount = buffers.indices.count;
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    } else {
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }
}

export default initializeGL;
