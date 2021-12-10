#define PI 3.1415926538

uniform float uTime;
uniform float uTick;
uniform float uRandom;
uniform float uSize;
uniform vec3 uColor;

attribute float aPindex;
attribute vec3 aPosition;
attribute vec3 aVelocity;

varying lowp vec4 vColor;

void main() {
    float theta = acos(normalize(aVelocity).x) * -sign(aVelocity.y);
    mat3 rot = mat3(
        cos(theta), -sin(theta), 0,
        sin(theta), cos(theta), 0,
        0, 0, 1
    );

    vec4 scaledPosition = vec4(rot * position * uSize + aPosition, 1.0);
    vec4 distance = vec4(aVelocity, 0.0) * uTick;
    vec4 finalPosition = scaledPosition + distance;
    gl_Position = projectionMatrix * modelViewMatrix * finalPosition;

    float variation = 0.1 * (mod(aPindex, 5.0) - 2.0);
    vColor = vec4(uColor + variation, 1.0);
}