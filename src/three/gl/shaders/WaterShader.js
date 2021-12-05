/**
 * Filter applied when in water
 * https://threejsfundamentals.org/threejs/lessons/threejs-post-processing.html
 */

const WaterShader = {
    uniforms: {
        tDiffuse: { value: null },
    },
    vertexShader: `
		varying vec2 vUv;
		void main() {
		  vUv = uv;
		  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
		}
	  `,
    fragmentShader: `
		varying vec2 vUv;
		uniform sampler2D tDiffuse;
		void main() {
		  vec3 color = vec3( 0.53, 0.8, 1 );
		  vec4 previousPassColor = texture2D(tDiffuse, vUv);
		  gl_FragColor = vec4(
			  previousPassColor.rgb * color,
			  previousPassColor.a);
		}
	  `,
};

export { WaterShader };
