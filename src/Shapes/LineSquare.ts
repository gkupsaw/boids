export const LineSquare = (width: number, height: number) => {
    const positions = [];

    positions.push(0, 0, 0);
    positions.push(width, 0, 0);
    positions.push(width, height, 0);
    positions.push(0, height, 0);
    positions.push(0, 0, 0);

    return positions;
};
