export const Sphere = (n: number, r: number) => {
    const verts: number[] = [];

    r *= 2;

    const deltaPhi = Math.PI / n;
    const deltaTheta = (Math.PI * 2) / n;

    for (let phi = 0; phi < Math.PI; phi += deltaPhi) {
        const sinPhi = Math.sin(phi);
        const sinNextPhi = Math.sin(phi + deltaPhi);
        const cosPhi = Math.cos(phi);
        const cosNextPhi = Math.cos(phi + deltaPhi);

        for (let theta = 0; theta < Math.PI * 2; theta += deltaTheta) {
            const sinTheta = Math.sin(theta);
            const sinNextTheta = Math.sin(theta - deltaTheta);
            const cosTheta = Math.cos(theta);
            const cosNextTheta = Math.cos(theta - deltaTheta);

            verts.push(r * sinTheta * sinNextPhi, r * cosNextPhi, r * sinNextPhi * cosTheta);
            verts.push(r * sinNextTheta * sinNextPhi, r * cosNextPhi, r * sinNextPhi * cosNextTheta);
            verts.push(r * sinTheta * sinPhi, r * cosPhi, r * sinPhi * cosTheta);

            verts.push(r * sinNextTheta * sinPhi, r * cosPhi, r * sinPhi * cosNextTheta);
            verts.push(r * sinTheta * sinPhi, r * cosPhi, r * sinPhi * cosTheta);
            verts.push(r * sinNextTheta * sinNextPhi, r * cosNextPhi, r * sinNextPhi * cosNextTheta);
        }
    }

    return verts;
};
