import { BufferAttribute, BufferGeometry, Material, Mesh, Object3D, PlaneGeometry, Scene, ShaderMaterial } from 'three';
import { Shaders } from '.';

export class ParticleSystem {
    screen: Object3D;

    constructor(scene: Scene) {
        const shaders = Shaders();

        const geo = new PlaneGeometry(2, 2);
        const mat = new ShaderMaterial({
            uniforms: shaders.default.uniforms,
            vertexShader: shaders.default.vert,
            fragmentShader: shaders.default.frag,
        });

        const numVertices = geo.attributes.position.count;
        const numComponents = 4;
        const random = new Float32Array(numVertices * numComponents);
        for (let i = 0; i < random.length; i++) {
            random[i] = (i + 1) % 4 ? Math.random() * 1.0 : 1.0;
        }
        geo.setAttribute('aVertexColor', new BufferAttribute(random, numComponents));

        const screen = new Mesh(geo, mat);
        scene.add(screen);

        animate(geo, mat);

        this.screen = screen;
    }
}

const animate = (geo: BufferGeometry, mat: Material) => {
    const numVertices = geo.attributes.position.count;
    const components = new Int8Array(numVertices).fill(0);
    const dirs = new Int8Array(numVertices).fill(1);

    setInterval(() => {
        for (let i = 0; i < numVertices; i++) {
            const delta = 0.1;

            const x = geo.attributes['aVertexColor'].getX(i),
                y = geo.attributes['aVertexColor'].getY(i),
                z = geo.attributes['aVertexColor'].getZ(i),
                w = geo.attributes['aVertexColor'].getW(i);

            if (components[i] === 0 && (x > 1.0 || x < 0)) {
                components[i] = Math.floor(Math.random() * numVertices);
                dirs[i] *= -1;
            } else if (components[i] === 1 && (y > 1.0 || y < 0)) {
                components[i] = Math.floor(Math.random() * numVertices);
                dirs[i] *= -1;
            } else if (components[i] === 2 && (z > 1.0 || z < 0)) {
                components[i] = Math.floor(Math.random() * numVertices);
                dirs[i] *= -1;
            } else if (components[i] === 3 && (w > 1.0 || w < 0)) {
                components[i] = Math.floor(Math.random() * numVertices);
                dirs[i] *= -1;
            }

            const component = components[i];
            geo.attributes['aVertexColor'].setXYZW(
                i,

                dirs[i] * (component === 0 ? delta : 0) + x,
                dirs[i] * (component === 1 ? delta : 0) + y,
                dirs[i] * (component === 2 ? delta : 0) + z,
                dirs[i] * (component === 3 ? delta : 0) + w
            );
        }

        geo.attributes['aVertexColor'].needsUpdate = true;
    }, 100);
};
