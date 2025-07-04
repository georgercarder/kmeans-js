"user strict";

console.warn("kmeans tasks worker loaded");

onmessage = (e) => {
    const task = e.data.task;
    const jobId = e.data.jobId;

    let res;
    if (task === "buildPartitions") {
        res = buildPartitions(e.data);
    } else if (task === "buildNewCentroids") {
        res = buildNewCentroids(e.data);
    } else {
        throw Error("unsupported task: " + task);
    }
    self.postMessage({detail: {jobId: jobId, response: res}});
}

function buildPartitions(data) {
    const objects = data.objects;
    const centroids = data.centroids;
    const partitions = {};
    for (let i = 0; i < objects.length; ++i) {

        const o = objects[i];

        const c = _closestCentroidToObject(o, centroids);
        const sC = _centroidToString(c);

        if (partitions[sC] == null) partitions[sC] = [];

        partitions[sC].push(o);
    }
    return partitions;
}

function buildNewCentroids(data) {
    const sCentroids = data.sCentroids;
    const partitions = data.partitions;

    let newCentroids = [];
    for (let i = 0; i < sCentroids.length; ++i) {
        const sC = sCentroids[i];

        const p = partitions[sC];
        if (p.length < 1) continue;

        const newCentroid = _newCentroidFromPartition(p);
        newCentroids.push(newCentroid);
    }
    return newCentroids;
}

function _centroidToString(centroid) {
    const cArr = centroid.ogColor;
    return JSON.stringify(cArr);
}

// from stack overflow
function rgb2lab(rgb){
  let r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, x, y, z;
  r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
  x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
  z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
}

// from stack overflow
function deltaE(rgbA, rgbB) {
  let labA = rgb2lab(rgbA);
  let labB = rgb2lab(rgbB);
  let deltaL = labA[0] - labB[0];
  let deltaA = labA[1] - labB[1];
  let deltaB = labA[2] - labB[2];
  let c1 = Math.sqrt(labA[1] * labA[1] + labA[2] * labA[2]);
  let c2 = Math.sqrt(labB[1] * labB[1] + labB[2] * labB[2]);
  let deltaC = c1 - c2;
  let deltaH = deltaA * deltaA + deltaB * deltaB - deltaC * deltaC;
  deltaH = deltaH < 0 ? 0 : Math.sqrt(deltaH);
  let sc = 1.0 + 0.045 * c1;
  let sh = 1.0 + 0.015 * c1;
  let deltaLKlsl = deltaL / (1.0);
  let deltaCkcsc = deltaC / (sc);
  let deltaHkhsh = deltaH / (sh);
  let i = deltaLKlsl * deltaLKlsl + deltaCkcsc * deltaCkcsc + deltaHkhsh * deltaHkhsh;
  return i < 0 ? 0 : Math.sqrt(i);
}

function _colorObjectsDistance(a, b) {
    return deltaE(a.ogColor, b.ogColor);
}

let _distanceFn = _colorObjectsDistance;

function _closestCentroidToObject(object, centroids) {
    let closest;
    let minD = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < centroids.length; ++i) { // note since kmeans checks initialCentroids is not trivial, there will always be a closest
        const c = centroids[i];
        const d = _distanceFn(object, c);
        if (d < minD) {
            minD = d;
            closest = c;
        }
    }
    return closest;
}

function _averageColorAsObjects(objects) {
    let r, g, b;
    r = g = b = 0;
    for (let i = 0; i < objects.length; ++i) {
        const o = objects[i];
        const cArr = o.ogColor;
        r += cArr[0];
        g += cArr[1];
        b += cArr[2];
    }
    return {ogColor: [Math.floor(r/(objects.length)), Math.floor(g/objects.length), Math.floor(b/objects.length)]};
}

let _newCentroidFromPartition = _averageColorAsObjects;
