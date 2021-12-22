export const LineCube = (width: number, height: number, depth: number) => {
    const positions = [];

    positions.push(0, 0, 0);
    positions.push(width, 0, 0);
    positions.push(width, height, 0);
    positions.push(0, height, 0);
    positions.push(0, 0, 0);

    positions.push(0, 0, depth);
    positions.push(width, 0, depth);
    positions.push(width, 0, 0);

    positions.push(width, height, 0);
    positions.push(width, height, depth);
    positions.push(width, 0, depth);

    positions.push(width, height, depth);
    positions.push(0, height, depth);
    positions.push(0, 0, depth);
    positions.push(0, height, depth);
    positions.push(0, height, 0);

    return positions;
};
