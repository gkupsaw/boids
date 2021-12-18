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
    vec3 normalizedVelocity = normalize(aVelocity);

    mat4 S = transpose(mat4(
        uSize, 0, 0, 0,
        0, uSize, 0, 0,
        0, 0, uSize, 0,
        0, 0, 0, 1
    ));

    vec3 by = normalizedVelocity;
    vec3 bx = normalize(vec3(-normalizedVelocity.y, normalizedVelocity.x, 0));
    vec3 bz = cross(by, bx);
    mat4 R = transpose(mat4(
        bx.x, by.x, bz.x, 0,
        bx.y, by.y, bz.y, 0,
        bx.z, by.z, bz.z, 0,
        0, 0, 0, 1
    ));

    mat4 T = transpose(mat4(
        1, 0, 0, aPosition.x + aVelocity.x * uTick,
        0, 1, 0, aPosition.y + aVelocity.y * uTick,
        0, 0, 1, aPosition.z + aVelocity.z * uTick,
        0, 0, 0, 1
    ));

    mat4 W = T * R * S;

    vec4 p = W * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * p;

    float variation = 0.1 * (mod(aPindex, 5.0) - 2.0);
    vColor = vec4(uColor + variation, 1.0);
}