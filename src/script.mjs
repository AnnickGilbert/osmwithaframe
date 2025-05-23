const COLORS = {
  building: "#51516b",
  road: "#ffe100",
  forest: "#90c37f",
  water: "#6bc7e4",
  park: "#bfe5bf",
  default: "#cccccc",
};

let MAP_CENTER = { lon: 0, lat: 0 };
let SCALE = 9000;
const scene = document.querySelector("a-scene");

// Calcule le centre de la bounding box du GeoJSON
function computeGeoJSONCenter(geojson) {
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
  geojson.features.forEach(feature => {
    const geom = feature.geometry;
    let coords = [];
    if (geom.type === "Polygon") coords = geom.coordinates[0];
    else if (geom.type === "MultiPolygon") coords = geom.coordinates.flat(2);
    else if (geom.type === "LineString") coords = geom.coordinates;
    coords.forEach(([lon, lat]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });
  });
  return {
    lat: (minLat + maxLat) / 2,
    lon: (minLon + maxLon) / 2
  };
}

function lonLatToXY(lon, lat) {
  const x = (lon - MAP_CENTER.lon) * SCALE;
  const y = (lat - MAP_CENTER.lat) * SCALE;
  return [x, y];
}

function createPolygonEntity(vertices, height = 0.1, color = "#cccccc") {
  if (!vertices || vertices.length < 3) return;
  const entity = document.createElement("a-entity");
  entity.setAttribute("geometry", {
    primitive: "map-item",
    height,
    vertices,
  });
  entity.setAttribute("material", { color, side: "double" });
  scene.appendChild(entity);
}

function handlePolygon(coords, height, color) {
  if (Array.isArray(coords) && Array.isArray(coords[0])) {
    const vertices = coords.map(([lon, lat]) => {
      const [x, y] = lonLatToXY(lon, lat);
      return `${x} ${y}`;
    });
    createPolygonEntity(vertices, height, color);
  }
}

function handleGeoJSONFeature(feature) {
  const tags = feature.properties || {};
  const geom = feature.geometry;

  if (geom.type === "LineString" && tags.highway) {
    const points = geom.coordinates.map(([lon, lat]) => {
      const [x, y] = lonLatToXY(lon, lat);
      return new THREE.Vector3(x, 0.02, y);
    });
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: COLORS.road })
    );
    scene.object3D.add(line);
    return;
  }

  if (geom.type === "MultiPolygon") {
    geom.coordinates.forEach((polygon) => {
      if (Array.isArray(polygon[0])) {
        handlePolygon(polygon[0], detectHeight(tags), detectColor(tags));
      }
    });
    return;
  }

  if (geom.type === "Polygon") {
    const coords = geom.coordinates[0];
    handlePolygon(coords, detectHeight(tags), detectColor(tags));
    return;
  }
}

function detectColor(tags) {
  if (tags.building) return COLORS.building;
  if (
    (tags.landuse &&
      (tags.landuse === "forest" ||
        tags.landuse === "grass" ||
        tags.landuse === "meadow")) ||
    (tags.natural && tags.natural === "wood") ||
    (tags.leisure && tags.leisure === "park")
  ) {
    if (
      tags.landuse === "grass" ||
      tags.landuse === "meadow" ||
      tags.leisure === "park"
    ) {
      return COLORS.park;
    }
    return COLORS.forest;
  }
  if (
    (tags.natural && (tags.natural === "water" || tags.natural === "river")) ||
    (tags.waterway &&
      (tags.waterway === "riverbank" || tags.waterway === "stream"))
  ) {
    return COLORS.water;
  }
  return COLORS.default;
}

function detectHeight(tags) {
  if (tags.building) return 1;
  if (
    (tags.landuse &&
      (tags.landuse === "forest" ||
        tags.landuse === "grass" ||
        tags.landuse === "meadow")) ||
    (tags.natural && tags.natural === "wood") ||
    (tags.leisure && tags.leisure === "park")
  ) {
    return 0.2;
  }
  if (
    (tags.natural && (tags.natural === "water" || tags.natural === "river")) ||
    (tags.waterway &&
      (tags.waterway === "riverbank" || tags.waterway === "stream"))
  ) {
    return 0.1;
  }
  return 0.05;
}

// CHARGEMENT DU GEOJSON ET CENTRAGE DYNAMIQUE
fetch("/porteJeune.geojson")
  .then((res) => res.json())
  .then((geojson) => {
    // Calcule le centre de la carte
    MAP_CENTER = computeGeoJSONCenter(geojson);
    geojson.features.forEach((feature) => {
      handleGeoJSONFeature(feature);
    });

    // Centrage automatique caméra (si tu veux vraiment auto-adapter !)
    const cam = document.getElementById("mainCam");
    if (cam) {
      const y = 50 * span;
      const z = -120 * span;
      cam.setAttribute("position", `0 ${y} ${z}`);
      cam.setAttribute("orbit-controls", `target: 0 0 0; initialPosition: 0 ${y} ${z}; minDistance: 2; maxDistance: 3000`);
    }

    // 1. Récupère toutes les routes (LineString + highway)
    const highways = geojson.features.filter(
      (feature) =>
        feature.geometry.type === "LineString" &&
        (feature.properties || {}).highway
    );

    // 2. Tire une route au hasard et (optionnel) sens aléatoire
    let carPath = null;
    if (highways.length > 0) {
      const randomIndex = Math.floor(Math.random() * highways.length);
      carPath = highways[randomIndex].geometry.coordinates;
      if (Math.random() > 0.5) carPath = [...carPath].reverse();
    }

    // 3. Anime la voiture plate sur cette route (si une route a été trouvée)
    if (carPath) {
      const pathXY = carPath.map(([lon, lat]) => lonLatToXY(lon, lat));

      // Crée la voiture (modèle 3D glTF)
      const car = document.createElement("a-gltf-model");
      car.setAttribute("src", "/car.glb");
      // Voiture très plate, sans longueur exagérée :
      car.setAttribute("scale", "0.0012 0.0007 0.0012");
      scene.appendChild(car);

      let t = 0;
      function animateCar() {
        const i = Math.floor(t);
        const next = Math.min(i + 1, pathXY.length - 1);
        const progress = t - i;
        const [x1, y1] = pathXY[i];
        const [x2, y2] = pathXY[next];
        const x = x1 + (x2 - x1) * progress;
        const y = y1 + (y2 - y1) * progress;

        car.setAttribute("position", `${x} 0.08 ${y}`);

        // Orientation naturelle dans le sens de la route (pas de verticale !)
        const angle = Math.atan2(y2 - y1, x2 - x1);
        // car.setAttribute("rotation", `0 ${(-angle * 180) / Math.PI} 0`);
        car.setAttribute("rotation", `0 ${(-angle * 180) / Math.PI + 90} 0`);

        t += 0.025;
        if (t < pathXY.length - 1) {
          requestAnimationFrame(animateCar);
        } else {
          t = 0;
          requestAnimationFrame(animateCar);
        }
      }
      animateCar();
    }
  });
