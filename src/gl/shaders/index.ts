import { Vector3 } from 'three';

export const Shaders = () => ({
    default: {
        uniforms: {},
        /** FRAGSHADERSTART */
        frag: './shader.frag.glsl',
        /** FRAGSHADEREND */
        /** VERTSHADERSTART */
        vert: './shader.vert.glsl',
        /** VERTSHADEREND */
    },
    boids: {
        uniforms: {
            uTime: { value: 0 },
            uTick: { value: 0 },
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
        vert: `#define PI 3.1415926538

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
            vec3 restingOrientation = vec3(1,0,0);
            vec3 normalizedVelocity = normalize(aVelocity);

            // vec3 v = cross(restingOrientation, normalizedVelocity);
            // float s = length(v);
            // float c = dot(restingOrientation, normalizedVelocity);
            // mat3 v_sscp = mat3(
            //     0, -v.z, v.y,
            //     v.z, 0, -v.x,
            //     -v.y, v.x, 0
            // );
            // mat3 I = mat3(
            //     1, 0, 0,
            //     0, 1, 0,
            //     0, 0, 1
            // );
            // mat3 U = I + v_sscp + v_sscp * v_sscp * ((1.0 - c) / (s * s));

            // float alpha = acos(dot(normalizedVelocity, restingOrientation)) * sign(aVelocity.y);
            // mat3 yaw = mat3(
            //     cos(alpha), -sin(alpha), 0,
            //     sin(alpha), cos(alpha), 0,
            //     0, 0, 1
            // );
            // float beta = acos(dot(normalizedVelocity, restingOrientation)) * sign(aVelocity.z);
            // mat3 pitch = mat3(
            //     cos(beta), 0, sin(beta),
            //     0, 1, 0,
            //     -sin(beta), 0, cos(beta)
            // );
            // float gamma = acos(dot(normalizedVelocity, vec3(0,0,1))) * sign(aVelocity.y);
            // mat3 roll = mat3(
            //     1, 0, 0,
            //     0, cos(gamma), -sin(gamma),
            //     0, sin(gamma), cos(gamma)
            // );

            // mat3 U = yaw * pitch * roll;

            // vec3 normal = cross(restingOrientation, normalizedVelocity);
            // float theta = arcos(dot(restingOrientation, normalizedVelocity));

            // // https://math.stackexchange.com/questions/180418/calculate-rotation-matrix-to-align-vector-a-to-vector-b-in-3d
            // vec3 crossed = cross(restingOrientation, normalizedVelocity);
            // float crossedNorm = length(crossed);
            // float dotted = dot(restingOrientation, normalizedVelocity);

            // mat3 G = mat3(
            //     dotted, -crossedNorm, 0,
            //     crossedNorm, dotted, 0,
            //     0, 0, 1
            // );

            // vec3 u = restingOrientation;
            // vec3 v = normalize(normalizedVelocity - (dotted) * restingOrientation);
            // vec3 w = cross(normalizedVelocity, restingOrientation);

            // mat3 Finv = mat3(u, v, w);

            // mat3 U = Finv * G * inverse(Finv);

            // vec3 eye = vec3(0);
            // vec3 zaxis = normalize(normalizedVelocity - eye);
            // vec3 xaxis = normalize(cross(zaxis, vec3(0,0,1)));
            // vec3 yaxis = cross(xaxis, zaxis);

            // zaxis = zaxis * -1.0;

            // mat4 U = mat4(
            //     vec4(xaxis.x, xaxis.y, xaxis.z, -dot(xaxis, eye)),
            //     vec4(yaxis.x, yaxis.y, yaxis.z, -dot(yaxis, eye)),
            //     vec4(zaxis.x, zaxis.y, zaxis.z, -dot(zaxis, eye)),
            //     vec4(0, 0, 0, 1)
            // );

            mat4 S = transpose(mat4(
                uSize, 0, 0, 0,
                0, uSize, 0, 0,
                0, 0, uSize, 0,
                0, 0, 0, 1
            ));

            float theta = acos(normalize(aVelocity).x) * -sign(aVelocity.y);
            mat3 yaw = transpose(mat3(
                cos(theta), -sin(theta), 0,
                sin(theta), cos(theta), 0,
                0, 0, 1
            ));

            float phi = acos(normalize(aVelocity).x) * -sign(aVelocity.z);
            mat3 pitch = transpose(mat3(
                cos(phi), 0, sin(phi),
                0, 1, 0,
                -sin(phi), 0, cos(phi)
            ));

            // vec3 x = restingOrientation;
            // vec3 y = vec3(0,1,0);
            // vec3 u = normalizedVelocity;
            // vec3 v = yaw * pitch * y;
            // vec3 s = vec3((u.y*v.z-u.z*v.y), (u.z*v.x-u.x*v.z), (u.x*v.y-u.y*v.x));
            // vec3 t = vec3((x.x*y.z-x.z*y.y), (x.z*y.x-x.x*y.z), (x.x*y.y-x.y*y.x));
            // mat4 R = transpose(mat4(
            //     dot(x,u), dot(x,v), dot(x,s), 0,
            //     dot(y,u), dot(y,v), dot(y,s), 0,
            //     dot(u,t), dot(v,t), dot(s,t), 0,
            //     0, 0, 0, 1
            // ));

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
        }`,
    },
});
