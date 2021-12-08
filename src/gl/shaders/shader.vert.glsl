attribute vec4 aVertexColor;

varying lowp vec4 vColor;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * position;
    vColor = aVertexColor;
}
