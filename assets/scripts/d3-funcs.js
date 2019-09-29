export function customScaledProjection(xMult, yMult, rawProjection) {
    return d3.geoProjection(function(...args) {
        const [x, y] = rawProjection(...args);
        return [x * xMult, y * yMult];
    });
}
