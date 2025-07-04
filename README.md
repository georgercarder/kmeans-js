# kmeans-js

## vanilla javascript implementation of Lloyd's algorithm to cluster rgb colors 

### uses webworkers for efficiency and speed

### number of webworkers and convergence threshold parameters tunable in header of `kmeans.js`

### usage

```
import {kmeans} from "./kmeans.js"

...

const clusteredObjects = await kmeans(objects, initialCentroids);

// now use the clusteredObjects for your application

```

An object must be of the form

```
const object = {ogColor: rgbColorAsArr, restingColor: rgbColorAsArr};
```

The second entry is updated during the algorithm and keeps first entry intact to be referenced when `clusteredObjects` are used.

`objects` is an array of the items of the `object` form above.

`rgbColorAsArr` is what you'd expect, a color represented as for example `[34, 16, 122]` where each entry is within the range 0-255

`initialCentroids` are chosen arbitrarily within the space and the simplest way to choose them is to just take a slice of `objects`. The lenght of `initialCentroids` should match the target number of clusters you hope to get from this function.


Please make git issues if you find breakage or areas for improvement.


not audited. use at your own risk.

Support my work on this module by donating ETH or other coins to

`0x1331DA733F329F7918e38Bc13148832D146e5adE`

