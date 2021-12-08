import { Vector3 } from 'three';

export const Shaders = () => ({
    default: {
        uniforms: {},
        frag: `
        `,
        vert: `
        `,
        // frag: /** FRAGSHADERSTART */ './shader.frag.glsl' /** FRAGSHADEREND */,
        // vert: /** VERTSHADERSTART */ './shader.vert.glsl' /** VERTSHADEREND */,
    },
    boids: {
        uniforms: {
            uTime: { value: 0 },
            uRandom: { value: 1.0 },
            uSize: { value: 0.2 },
            uColor: { value: new Vector3(0, 0, 1) },
        },
        frag: `
        varying lowp vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
        `,
        vert: `
        #define PI 3.1415926538

uniform float uTime;
uniform float uRandom;
uniform float uSize;
uniform vec3 uColor;

attribute float aPindex;
attribute vec3 aInitialPosition;
attribute vec3 aVelocity;
attribute float aTime;

varying lowp vec4 vColor;

void main() {
    float theta = acos(normalize(aVelocity).x) * -sign(aVelocity.y);
    mat3 rot = mat3(
        cos(theta), -sin(theta), 0,
        sin(theta), cos(theta), 0,
        0, 0, 1
    );

    vec4 scaledPosition = vec4(rot * position * uSize + aInitialPosition, 1.0);
    vec4 distance = vec4(aVelocity, 0.0) * aTime;
    vec4 finalPosition = scaledPosition + distance;
    gl_Position = projectionMatrix * modelViewMatrix * finalPosition;

    float variation = 0.1 * (mod(aPindex, 5.0) - 2.0);
    vColor = vec4(uColor + variation, 1.0);
}
        `,
    },
});
