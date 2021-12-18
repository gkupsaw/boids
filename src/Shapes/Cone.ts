export const Cone = (n: number, r: number, h: number) => {
    const verts: number[] = [];

    const halfHeight = h / 2;
    const delta = (Math.PI * 2) / n;
    for (let theta = 0; theta < Math.PI * 2; theta += delta) {
        verts.push(0, -halfHeight, 0);
        verts.push(r * Math.sin(theta), -halfHeight, r * Math.cos(theta));
        verts.push(r * Math.sin(theta + delta), -halfHeight, r * Math.cos(theta + delta));

        verts.push(r * Math.sin(theta + delta), -halfHeight, r * Math.cos(theta + delta));
        verts.push(r * Math.sin(theta), -halfHeight, r * Math.cos(theta));
        verts.push(0, halfHeight, 0);
    }

    return verts;
};
