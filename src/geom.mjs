AFRAME.registerGeometry("map-item", {
  schema: {
    height: { default: 1 },
    vertices: { default: ["-2 -2", "-2 0", "1 1", "2 0"] },
  },
  init: function (data) {
    const shape = new THREE.Shape();
    data.vertices.forEach((vertex, i) => {
      let [x, y] = vertex.split(" ").map(Number);
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    const extrudeSettings = {
      steps: 1,
      depth: data.height,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, data.height, 0);
    this.geometry = geometry;
  },
});

// AFRAME.registerGeometry("map-item", {
//   schema: {
//     height: { default: 1 },
//     vertices: { default: ["-2 -2", "-2 0", "1 1", "2 0"] },
//   },
//   init: function (data) {
//     const shape = new THREE.Shape();
//     data.vertices.forEach((vertex, i) => {
//       let [x, y] = vertex.split(" ").map(Number);
//       if (i === 0) shape.moveTo(x, y);
//       else shape.lineTo(x, y);
//     });
//     const extrudeSettings = {
//       steps: 2,
//       depth: data.height,
//       bevelEnabled: true,
//       bevelThickness: 0.02,
//       bevelSize: 0.01,
//       bevelSegments: 8,
//     };
//     const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
//     geometry.rotateX(Math.PI / 2);
//     geometry.translate(0, data.height, 0);
//     geometry.computeBoundingBox();
//     this.geometry = geometry;
//   },
// });
