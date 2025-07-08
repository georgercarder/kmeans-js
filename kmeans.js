"use strict";

// tune these based on your implementation
let NUM_WORKERS = 4;
let MAX_TRIES = 128*32*32;

let gWorkerIdx = 0;
let gKMeansTasksWWs = [];
let gKMeansPromises = {};

function init() {
    for (let i = 0; i < NUM_WORKERS; ++i) {
        const w = new Worker("./kmeans_tasks_worker.js");
        gKMeansTasksWWs.push(w);

        w.addEventListener("message", (msg) => {
            const jobId = msg.data.detail.jobId;
            const resolveOrReject = msg.data.detail.resolveOrReject;

            const resolver = gKMeansPromises[jobId];
            if (resolveOrReject === "reject") {
                resolver.reject(false);
                return;
            }
            resolver.resolve(msg.data.detail.response);
        });
    }
}
init();

export async function kmeans(objects, initialCentroids) {
    if (initialCentroids.length < 1) throw Error("trivial centroids");

    // partition objects wrt centroids
    let centroids = initialCentroids;
    let same = false;

    let partitions;

    const maxTries = _max(Math.sqrt(initialCentroids.length * objects.length), MAX_TRIES);
    let tries = 0;

    const objectsSplit = splitArrBy(objects, NUM_WORKERS);

    while (!same && tries < maxTries) {
        partitions = await buildPartitions(objectsSplit, centroids);
      
        const newCentroids = await buildNewCentroids(partitions);
      
        same = centroidArrsAreSame(centroids, newCentroids);
        centroids = newCentroids;
        ++tries;
    }
    const ret = [];
    const keys = Object.keys(partitions);
    for (let i = 0; i < keys.length; ++i) {
        const k = keys[i];
        const centroid = k; // as a json stringified array
        const p = partitions[k];
        for (let j = 0; j < p.length; ++j) {
            const o = p[j];
            _updateRestingColorObject(o, centroid);
            ret.push(o);
        }
    }
    return ret;
}

async function buildPartitions(objectsSplit, centroids) {
    const ress = [];
    for (let i = 0; i < objectsSplit.length; ++i) {
        const os = objectsSplit[i];
        const res = _workerBuildPartitions(os, centroids);
        ress.push(res);
    }
    const partitions = {};
    for (let i = 0; i < ress.length; ++i) {
        const _partitions = await ress[i];
        const keys = Object.keys(_partitions); 
        for (let j = 0; j < keys.length; ++j) {
            const k = keys[j];
            const v = _partitions[k];
            if (partitions[k] == null) partitions[k] = [];
            partitions[k] = partitions[k].concat(v);
        }
    }
    return partitions;
}

async function _workerBuildPartitions(objects, centroids) {
    const msg = {task: "buildPartitions", objects: objects, centroids: centroids};
    return kmeansWorker(msg);
}

async function buildNewCentroids(partitions) {
    const sCentroids = Object.keys(partitions);
    const sCentroidsSplit = splitArrBy(sCentroids, NUM_WORKERS);
    const ress = [];
    for (let i = 0; i < sCentroidsSplit.length; ++i) {
        const s = sCentroidsSplit[i];
        const res = _workerBuildNewCentroids(s, partitions); 
        ress.push(res);
    }
    let newCentroids = [];
    for (let i = 0; i < ress.length; ++i) {
        const res = await ress[i];
        newCentroids = newCentroids.concat(res);   
    }
    return newCentroids;
}

function _workerBuildNewCentroids(sCentroids, partitions) {
    const msg = {task: "buildNewCentroids", sCentroids: sCentroids, partitions: partitions};
    return kmeansWorker(msg);
}

function splitArrBy(arr, n) {
    const ret = [];

    const l = Math.ceil(arr.length / n);
    for (let i = 0; i < l; ++i) {
        ret.push(arr.slice(i*n, (i+1)*n));
    }
    return ret;
}

let gKMeansWorkerJobId = 0;

function kmeansWorker(msg) {
    const jobId = (gKMeansWorkerJobId++).toString();

    let resolver;
    const prom = new Promise((resolve, reject) => {
        resolver = {resolve: resolve, reject: reject};
    });
    gKMeansPromises[jobId] = resolver;
    msg.jobId = jobId;

    const idx = (gWorkerIdx++) % NUM_WORKERS;
    gKMeansTasksWWs[idx].postMessage(msg);

    return prom;
}

function _updateRestingColorObject(object, sCentroid) {
    object.restingColor = JSON.parse(sCentroid);
}

// assuming they are same length
function compareArrs(a, b) {
    if (a.length == b.length && b.length == 0) return 0;
    const _a = a[0];
    const _b = b[0];
    if (_a < _b) return -1;
    if (_a > _b) return 1;
    return compareArrs(a.slice(1), b.slice(1));
}

function compareColorObjects(a, b) {
    const aArr = a.ogColor;
    const bArr = b.ogColor;
    return compareArrs(aArr, bArr); 
}

function centroidArrsAreSame(arrA, arrB) {
    if (arrA.length !== arrB.length) return false;
    const aSorted = arrA.sort(compareColorObjects);
    const bSorted = arrB.sort(compareColorObjects);

    let d = 0;
    for (let i = 0; i < aSorted.length; ++i) {
        const a = aSorted[i].ogColor;
        const b = bSorted[i].ogColor;
        d += Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
    }
    d /= aSorted.length;
    return d < 1; // more certain convergence

    /*
    const sA = JSON.stringify(aSorted);
    const sB = JSON.stringify(bSorted);

    return sA === sB;
    */
}

function _max(a, b) {
    if (a > b) return a;
    return b;
}
