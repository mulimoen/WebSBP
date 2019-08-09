import { Universe, WorkBuffers, set_panic_hook, default as init } from "./webgl.js";

async function run() {
    let wasm = await init("./webgl_bg.wasm");
    set_panic_hook();

    const canvas = document.getElementById("glCanvas");

    const gl = canvas.getContext("webgl");
    if (gl === null) {
        console.error("Unable to initialise WebGL");
        return;
    }

    const supports_floats_in_textures = gl.getExtension("OES_texture_float");
    if (!supports_floats_in_textures) {
        console.error("Floats are not supported in textures for your device, please warn the author about this incompatability");
        return;
    }


    const vsSource = String.raw`
        attribute vec2 aVertexPosition;
        varying lowp vec2 vVertexPosition;

        void main() {
            vVertexPosition = (aVertexPosition + 1.0)/2.0;
            gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, 0.0, 1.0);
        }
    `;

    const fsSource = String.raw`
        varying lowp vec2 vVertexPosition;

        uniform sampler2D uSampler;

        void main() {
            mediump float c = texture2D(uSampler, vVertexPosition).a;
            gl_FragColor = vec4((c + 1.0)/2.0, 0.0, 0.0, 1.0);
        }
    `;

    const vsShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsShader, vsSource);
    gl.compileShader(vsShader);
    if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)) {
        console.error('Could not compile shader: ' + gl.getShaderInfoLog(vsShader));
        return;
    }

    const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsShader, fsSource);
    gl.compileShader(fsShader);
    if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)) {
        console.error('Could not compile shader: ' + gl.getShaderInfoLog(fsShader));
        return;
    }

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vsShader);
    gl.attachShader(shaderProgram, fsShader);
    gl.linkProgram(shaderProgram);
    gl.validateProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to link shader program: ' + gl.getProgramInfoLog(shaderProgram))
        return;
    }
    gl.useProgram(shaderProgram);


    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, 1.0,
        1.0, 1.0,
        -1.0, -1.0,
        1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalise = false;
        const stride = 0;
        const offset = 0;
        const attrib_vertex_location = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
        gl.vertexAttribPointer(attrib_vertex_location, numComponents, type, normalise, stride, offset);
        gl.enableVertexAttribArray(attrib_vertex_location);
    }

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);


    const uniform_sampler = gl.getUniformLocation(shaderProgram, 'uSampler');
    gl.uniform1i(uniform_sampler, 0);


    gl.clearColor(1.0, 0.753, 0.796, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);

    console.info("Successfully set OpenGL state");


    const width = 40;
    const height = 50;
    let universes = [Universe.new(width, height), Universe.new(width, height)];
    const workbuffer = WorkBuffers.new(width, height);

    const TIMEFACTOR = 1.0/7000;
    let t = performance.now()*TIMEFACTOR;
    universes[0].set_initial(t, "sin+cos");

    function drawMe(t_draw) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let dt = t_draw*TIMEFACTOR - t;
        if (dt >= 0.01) {
            console.warn("Can not keep up with framerate");
            t = t_draw*TIMEFACTOR;
            dt = 0.01;
        } else {
            t += dt;
        }
        universes[0].advance(universes[1], dt, workbuffer);

        const field = new Float32Array(wasm.memory.buffer,
                universes[0].get_ptr(),
                width*height);
        {
            const level = 0;
            const internalFormat = gl.ALPHA;
            const border = 0;
            const srcFormat = internalFormat;
            const srcType = gl.FLOAT;
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, field);
        }

        {
            const offset = 0;
            const vertexCount = 4;
            gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        }

        universes = [universes[1], universes[0]];
        window.requestAnimationFrame(drawMe);
    }

    // https://stackoverflow.com/questions/4288253/html5-canvas-100-width-height-of-viewport#8486324
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();
    window.requestAnimationFrame(drawMe);
}

run();