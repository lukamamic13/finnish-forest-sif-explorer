"use strict";


/* ==========================================================
   FINNISH FOREST SIF EXPLORER — V2
   ========================================================== */


const MONTHS = [3, 4, 5, 6, 7, 8, 9];

const MONTH_LABELS = [
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep"
];


const FOREST_CLASSES = [
    "pine",
    "pine-spruce",
    "birch-pine",
    "birch-spruce",
    "spruce"
];


const FOREST_LABELS = {

    "pine": "Pine-dominated",
    "pine-spruce": "Pine–spruce",
    "birch-pine": "Birch–pine",
    "birch-spruce": "Birch–spruce",
    "spruce": "Spruce-dominated"

};


const FOREST_COLORS = {

    "pine": "#176b3a",
    "pine-spruce": "#8ba83c",
    "birch-pine": "#d29a39",
    "birch-spruce": "#8764a8",
    "spruce": "#245348"

};


const SINGLE_SIF_COLOR = "#176b3a";
const COMPARE_A_COLOR = "#176b3a";
const COMPARE_B_COLOR = "#245b8a";


const QUADRANT_LABELS = {

    "north-west": "North-west",
    "north-east": "North-east",
    "south-west": "South-west",
    "south-east": "South-east"

};


/*
Fixed geographic split metadata from the full stable
candidate population.

These are never recalculated from website subsets.
*/

const X_SPLIT = 465000;
const Y_SPLIT = 7045000;


/* ==========================================================
   STATE
   ========================================================== */


const state = {

    poisGeoJSON: null,
    admin0GeoJSON: null,
    admin1GeoJSON: null,

    sifRows: [],

    poiById: new Map(),
    sifByPoi: new Map(),

    appMode: "explore",

    spatialMode: "finland",
    quadrant: "north-west",
    admin1: null,

    coverageMin: 70,
    coverageMax: 100,

    selectedClasses:
        new Set(FOREST_CLASSES),

    showTemporal: true,
    showSpatial: true,
    showRetrieval: true,

    showAdmin1: true,
    showQuadrants: false,

    selectedCell: null,

    compareType: "admin1",
    compareClass: "pine",

    compareRegionA: null,
    compareRegionB: null,

    compareQuadrantA: "north-west",
    compareQuadrantB: "south-east",

    compareCellA: null,
    compareCellB: null,

    map: null

};


/* ==========================================================
   DOM
   ========================================================== */


const dom = {};


function cacheDOM() {

    const ids = [

        "loading-screen",

        "mode-eyebrow",
        "mode-description",

        "map-title",
        "map-subtitle",

        "explore-map-legend",
        "compare-map-legend",

        "explore-summary-section",
        "compare-summary-section",

        "selection-heading",
        "metric-pois",
        "metric-observations",
        "metric-years",

        "compare-summary-a",
        "compare-summary-a-meta",
        "compare-summary-b",
        "compare-summary-b-meta",

        "explore-spatial-section",
        "compare-spatial-section",

        "quadrant-control",
        "quadrant-select",

        "admin1-control",
        "admin1-select",

        "compare-region-controls",
        "compare-region-a",
        "compare-region-b",

        "compare-quadrant-controls",
        "compare-quadrant-a",
        "compare-quadrant-b",

        "compare-cell-controls",
        "compare-cell-a-label",
        "compare-cell-b-label",
        "clear-compare-cells",

        "coverage-min",
        "coverage-max",
        "coverage-badge",
        "range-track",

        "explore-class-section",
        "compare-class-section",

        "forest-class-controls",
        "select-all-classes",

        "compare-class-select",
        "compare-class-note",

        "toggle-temporal",
        "toggle-spatial",
        "toggle-retrieval",

        "toggle-admin1",
        "toggle-quadrants",

        "reset-button",

        "map-selection-card",
        "selected-cell-title",
        "selected-cell-details",
        "close-cell-selection",
        "return-group-button",

        "compare-click-card",
        "compare-click-title",
        "compare-click-text",

        "chart-title",
        "chart-subtitle",

        "meta-coverage",

        "small-selection-warning",
        "comparison-warning",

        "empty-selection",
        "empty-selection-title",
        "empty-selection-text",

        "sif-chart"

    ];


    for (const id of ids) {

        const camel =
            id.replace(
                /-([a-z])/g,
                (_, letter) =>
                    letter.toUpperCase()
            );

        dom[camel] =
            document.getElementById(id);

    }

}


/* ==========================================================
   UTILITIES
   ========================================================== */


function mean(values) {

    const valid =
        values.filter(Number.isFinite);

    if (!valid.length) {
        return NaN;
    }

    return (
        valid.reduce(
            (a, b) => a + b,
            0
        )
        /
        valid.length
    );

}


function sampleSD(values) {

    const valid =
        values.filter(Number.isFinite);

    if (valid.length < 2) {
        return NaN;
    }

    const m =
        mean(valid);

    const variance =
        valid.reduce(
            (sum, value) =>
                sum
                +
                Math.pow(
                    value - m,
                    2
                ),
            0
        )
        /
        (valid.length - 1);

    return Math.sqrt(variance);

}


function pct(value) {

    if (!Number.isFinite(value)) {
        return "—";
    }

    return `${Math.round(value * 100)}%`;

}


function normalizeId(value) {
    return String(value);
}


function hexToRGBA(hex, alpha) {

    const clean =
        hex.replace("#", "");

    const bigint =
        parseInt(clean, 16);

    const r =
        (bigint >> 16) & 255;

    const g =
        (bigint >> 8) & 255;

    const b =
        bigint & 255;

    return `rgba(${r},${g},${b},${alpha})`;

}


function getFeatureBounds(feature) {

    const bounds =
        new maplibregl.LngLatBounds();


    function walk(coords) {

        if (
            typeof coords[0] === "number"
            &&
            typeof coords[1] === "number"
        ) {

            bounds.extend(coords);
            return;

        }

        coords.forEach(walk);

    }


    walk(
        feature.geometry.coordinates
    );

    return bounds;

}


function coverageEligible(feature) {

    const coverage =
        Number(
            feature.properties.min_productive_fraction
        )
        * 100;

    return (
        coverage >= state.coverageMin
        &&
        coverage <= state.coverageMax
    );

}


/* ==========================================================
   DATA LOADING
   ========================================================== */


async function loadJSON(path) {

    const response =
        await fetch(path);

    if (!response.ok) {

        throw new Error(
            `Failed to load ${path}: ${response.status}`
        );

    }

    return response.json();

}


function loadCSV(path) {

    return new Promise(
        (resolve, reject) => {

            Papa.parse(
                path,
                {

                    download: true,
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,

                    complete:
                        results =>
                            resolve(results.data),

                    error:
                        reject

                }
            );

        }
    );

}


async function loadData() {

    const [
        pois,
        sif,
        admin0,
        admin1
    ] = await Promise.all([

        loadJSON(
            "data/pois.geojson"
        ),

        loadCSV(
            "data/sif_monthly.csv"
        ),

        loadJSON(
            "data/admin0_finland.geojson"
        ),

        loadJSON(
            "data/admin1_finland.geojson"
        )

    ]);


    state.poisGeoJSON = pois;
    state.sifRows = sif;
    state.admin0GeoJSON = admin0;
    state.admin1GeoJSON = admin1;


    for (
        const feature
        of state.poisGeoJSON.features
    ) {

        const id =
            normalizeId(
                feature.properties.cell_id
            );

        state.poiById.set(
            id,
            feature
        );

    }


    for (
        const row
        of state.sifRows
    ) {

        const id =
            normalizeId(row.cell_id);

        if (
            !state.sifByPoi.has(id)
        ) {

            state.sifByPoi.set(
                id,
                []
            );

        }

        state.sifByPoi
            .get(id)
            .push(row);

    }


    const adminNames =
        getAdminNames();


    state.admin1 =
        adminNames.includes("Lapland")
            ? "Lapland"
            : adminNames[0];


    state.compareRegionA =
        adminNames.includes("Lapland")
            ? "Lapland"
            : adminNames[0];


    state.compareRegionB =
        adminNames.includes("North Karelia")
            ? "North Karelia"
            : (
                adminNames.find(
                    name =>
                        name !== state.compareRegionA
                )
                ||
                adminNames[0]
            );


    state.compareClass =
        chooseAvailableComparisonClass(
            "admin1",
            state.compareRegionA,
            state.compareRegionB,
            "pine"
        );

}


/* ==========================================================
   DATA HELPERS
   ========================================================== */


function getAdminNames() {

    return state.admin1GeoJSON.features
        .map(
            feature =>
                feature.properties.admin1_name
        )
        .filter(Boolean)
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );

}


function featuresForLocation(
    type,
    value
) {

    if (type === "admin1") {

        return state.poisGeoJSON.features.filter(
            feature =>
                feature.properties.admin1_name
                === value
        );

    }


    if (type === "quadrant") {

        return state.poisGeoJSON.features.filter(
            feature =>
                feature.properties.geo_quadrant
                === value
        );

    }


    if (type === "cell") {

        const feature =
            state.poiById.get(
                normalizeId(value)
            );

        return feature
            ? [feature]
            : [];

    }


    return [];

}


function comparisonFeatures(side) {

    let features = [];


    if (
        state.compareType === "admin1"
    ) {

        const region =
            side === "A"
                ? state.compareRegionA
                : state.compareRegionB;

        features =
            featuresForLocation(
                "admin1",
                region
            );

    }


    else if (
        state.compareType === "quadrant"
    ) {

        const quadrant =
            side === "A"
                ? state.compareQuadrantA
                : state.compareQuadrantB;

        features =
            featuresForLocation(
                "quadrant",
                quadrant
            );

    }


    else if (
        state.compareType === "cell"
    ) {

        const id =
            side === "A"
                ? state.compareCellA
                : state.compareCellB;

        if (id === null) {
            return [];
        }

        features =
            featuresForLocation(
                "cell",
                id
            );

    }


    return features.filter(
        feature => {

            return (
                coverageEligible(feature)
                &&
                feature.properties.stable_forest_class
                === state.compareClass
            );

        }
    );

}


function comparisonCandidateFeatures() {

    return state.poisGeoJSON.features.filter(
        feature => {

            return (
                coverageEligible(feature)
                &&
                feature.properties.stable_forest_class
                === state.compareClass
            );

        }
    );

}


function chooseAvailableComparisonClass(
    type,
    valueA,
    valueB,
    preferred = "pine"
) {

    function countFor(
        forestClass,
        value
    ) {

        return featuresForLocation(
            type,
            value
        )
        .filter(
            feature =>
                coverageEligible(feature)
                &&
                feature.properties.stable_forest_class
                === forestClass
        )
        .length;

    }


    const order = [
        preferred,
        ...FOREST_CLASSES.filter(
            forestClass =>
                forestClass !== preferred
        )
    ];


    for (
        const forestClass
        of order
    ) {

        if (
            countFor(
                forestClass,
                valueA
            ) > 0
            &&
            countFor(
                forestClass,
                valueB
            ) > 0
        ) {

            return forestClass;

        }

    }


    return preferred;

}


/* ==========================================================
   BUILD CONTROLS
   ========================================================== */


function buildAdminSelectors() {

    const names =
        getAdminNames();


    const selectors = [
        dom.admin1Select,
        dom.compareRegionA,
        dom.compareRegionB
    ];


    for (
        const select
        of selectors
    ) {

        select.innerHTML = "";

        for (
            const name
            of names
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value = name;
            option.textContent = name;

            select.appendChild(
                option
            );

        }

    }


    dom.admin1Select.value =
        state.admin1;

    dom.compareRegionA.value =
        state.compareRegionA;

    dom.compareRegionB.value =
        state.compareRegionB;

}


function buildForestControls() {

    dom.forestClassControls.innerHTML =
        "";

    dom.compareClassSelect.innerHTML =
        "";


    for (
        const forestClass
        of FOREST_CLASSES
    ) {

        const label =
            document.createElement(
                "label"
            );

        label.className =
            "class-check";

        label.dataset.forestClass =
            forestClass;


        const input =
            document.createElement(
                "input"
            );

        input.type =
            "checkbox";

        input.checked =
            true;

        input.dataset.forestClass =
            forestClass;


        const dot =
            document.createElement(
                "span"
            );

        dot.className =
            "class-dot";

        dot.style.background =
            FOREST_COLORS[
                forestClass
            ];


        const name =
            document.createElement(
                "span"
            );

        name.className =
            "class-name";

        name.textContent =
            FOREST_LABELS[
                forestClass
            ];


        const count =
            document.createElement(
                "span"
            );

        count.className =
            "class-count";

        count.dataset.countClass =
            forestClass;

        count.textContent =
            "—";


        label.append(
            input,
            dot,
            name,
            count
        );


        dom.forestClassControls
            .appendChild(label);


        const option =
            document.createElement(
                "option"
            );

        option.value =
            forestClass;

        option.textContent =
            FOREST_LABELS[
                forestClass
            ];

        dom.compareClassSelect
            .appendChild(option);

    }


    dom.compareClassSelect.value =
        state.compareClass;

}


/* ==========================================================
   MAP
   ========================================================== */


function initializeMap() {

    state.map =
        new maplibregl.Map(
            {

                container:
                    "map",

                style: {

                    version:
                        8,

                    sources: {

                        "opentopomap": {

                            type:
                                "raster",

                            tiles: [
                                "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
                                "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
                                "https://c.tile.opentopomap.org/{z}/{x}/{y}.png"
                            ],

                            tileSize:
                                256,

                            attribution:
                                "Map data © OpenStreetMap contributors · SRTM · Map style © OpenTopoMap"

                        }

                    },

                    layers: [

                        {

                            id:
                                "basemap",

                            type:
                                "raster",

                            source:
                                "opentopomap",

                            paint: {

                                "raster-opacity":
                                    0.55,

                                "raster-saturation":
                                    -0.72,

                                "raster-contrast":
                                    -0.08,

                                "raster-brightness-min":
                                    0.20,

                                "raster-brightness-max":
                                    0.94

                            }

                        }

                    ]

                },

                center:
                    [26.0, 64.7],

                zoom:
                    4.35,

                minZoom:
                    3.4,

                maxZoom:
                    11,

                pitch:
                    0,

                bearing:
                    0,

                attributionControl:
                    true

            }
        );


    state.map.addControl(

        new maplibregl.NavigationControl(
            {
                showCompass:
                    false
            }
        ),

        "top-right"

    );


    state.map.on(
        "load",
        addMapLayers
    );

}


/* ==========================================================
   QUADRANT DISPLAY LINES
   ========================================================== */


function buildQuadrantGeoJSON() {

    const features =
        state.poisGeoJSON.features;


    function nearestCenter(
        axis,
        target
    ) {

        let best =
            null;

        let bestDiff =
            Infinity;


        for (
            const feature
            of features
        ) {

            const p =
                feature.properties;

            const value =
                axis === "x"
                    ? Number(p.center_x)
                    : Number(p.center_y);

            const diff =
                Math.abs(
                    value - target
                );


            if (
                diff < bestDiff
            ) {

                const center =
                    getFeatureBounds(
                        feature
                    ).getCenter();

                best = [
                    center.lng,
                    center.lat
                ];

                bestDiff =
                    diff;

            }

        }


        return best;

    }


    const xPoint =
        nearestCenter(
            "x",
            X_SPLIT
        );

    const yPoint =
        nearestCenter(
            "y",
            Y_SPLIT
        );


    return {

        type:
            "FeatureCollection",

        features: [

            {

                type:
                    "Feature",

                properties: {
                    split:
                        "x"
                },

                geometry: {

                    type:
                        "LineString",

                    coordinates: [
                        [xPoint[0], 59.3],
                        [xPoint[0], 70.5]
                    ]

                }

            },

            {

                type:
                    "Feature",

                properties: {
                    split:
                        "y"
                },

                geometry: {

                    type:
                        "LineString",

                    coordinates: [
                        [19.0, yPoint[1]],
                        [32.0, yPoint[1]]
                    ]

                }

            }

        ]

    };

}


/* ==========================================================
   MAP LAYERS
   ========================================================== */


function addMapLayers() {

    const map =
        state.map;


    map.addSource(
        "admin0",
        {

            type:
                "geojson",

            data:
                state.admin0GeoJSON

        }
    );


    map.addLayer(
        {

            id:
                "admin0-fill",

            type:
                "fill",

            source:
                "admin0",

            paint: {

                "fill-color":
                    "#ffffff",

                "fill-opacity":
                    0.08

            }

        }
    );


    map.addLayer(
        {

            id:
                "admin0-line",

            type:
                "line",

            source:
                "admin0",

            paint: {

                "line-color":
                    "#26362b",

                "line-width":
                    1.7,

                "line-opacity":
                    0.92

            }

        }
    );


    map.addSource(
        "admin1",
        {

            type:
                "geojson",

            data:
                state.admin1GeoJSON

        }
    );


    map.addLayer(
        {

            id:
                "admin1-fill",

            type:
                "fill",

            source:
                "admin1",

            paint: {

                "fill-color":
                    "#ffffff",

                "fill-opacity":
                    0

            }

        }
    );


    map.addLayer(
        {

            id:
                "admin1-line",

            type:
                "line",

            source:
                "admin1",

            paint: {

                "line-color":
                    "#66746a",

                "line-width":
                    0.75,

                "line-opacity":
                    0.56

            }

        }
    );


    map.addSource(
        "pois",
        {

            type:
                "geojson",

            data:
                state.poisGeoJSON,

            promoteId:
                "cell_id"

        }
    );


    map.addLayer(
        {

            id:
                "pois-fill",

            type:
                "fill",

            source:
                "pois",

            paint: {

                "fill-color": [

                    "match",

                    [
                        "get",
                        "stable_forest_class"
                    ],

                    "pine",
                    FOREST_COLORS["pine"],

                    "pine-spruce",
                    FOREST_COLORS["pine-spruce"],

                    "birch-pine",
                    FOREST_COLORS["birch-pine"],

                    "birch-spruce",
                    FOREST_COLORS["birch-spruce"],

                    "spruce",
                    FOREST_COLORS["spruce"],

                    "#777777"

                ],

                "fill-opacity":
                    0.80

            }

        }
    );


    map.addLayer(
        {

            id:
                "pois-outline",

            type:
                "line",

            source:
                "pois",

            paint: {

                "line-color":
                    "#ffffff",

                "line-width":
                    0.7,

                "line-opacity":
                    0.90

            }

        }
    );


    map.addLayer(
        {

            id:
                "compare-a-fill",

            type:
                "fill",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "fill-color":
                    COMPARE_A_COLOR,

                "fill-opacity":
                    0.78

            }

        }
    );


    map.addLayer(
        {

            id:
                "compare-a-outline",

            type:
                "line",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "line-color":
                    "#ffffff",

                "line-width":
                    0.8,

                "line-opacity":
                    0.95

            }

        }
    );


    map.addLayer(
        {

            id:
                "compare-b-fill",

            type:
                "fill",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "fill-color":
                    COMPARE_B_COLOR,

                "fill-opacity":
                    0.78

            }

        }
    );


    map.addLayer(
        {

            id:
                "compare-b-outline",

            type:
                "line",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "line-color":
                    "#ffffff",

                "line-width":
                    0.8,

                "line-opacity":
                    0.95

            }

        }
    );


    map.addLayer(
        {

            id:
                "selected-poi",

            type:
                "line",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "line-color":
                    "#101713",

                "line-width":
                    3.3,

                "line-opacity":
                    1

            }

        }
    );


    map.addLayer(
        {

            id:
                "compare-cell-a-outline",

            type:
                "line",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "line-color":
                    COMPARE_A_COLOR,

                "line-width":
                    4,

                "line-opacity":
                    1

            }

        }
    );


    map.addLayer(
        {

            id:
                "compare-cell-b-outline",

            type:
                "line",

            source:
                "pois",

            filter: [
                "==",
                ["get", "cell_id"],
                "__none__"
            ],

            paint: {

                "line-color":
                    COMPARE_B_COLOR,

                "line-width":
                    4,

                "line-opacity":
                    1

            }

        }
    );


    map.addSource(
        "quadrants",
        {

            type:
                "geojson",

            data:
                buildQuadrantGeoJSON()

        }
    );


    map.addLayer(
        {

            id:
                "quadrant-lines",

            type:
                "line",

            source:
                "quadrants",

            layout: {

                visibility:
                    state.showQuadrants
                        ? "visible"
                        : "none"

            },

            paint: {

                "line-color":
                    "#445148",

                "line-width":
                    1.25,

                "line-dasharray":
                    [4,3],

                "line-opacity":
                    0.75

            }

        }
    );


    setupMapInteractions();

    fitToFinland();

    updateEverything();

}


/* ==========================================================
   MAP INTERACTIONS
   ========================================================== */


function setupMapInteractions() {

    const map =
        state.map;


    const popup =
        new maplibregl.Popup(
            {

                closeButton:
                    false,

                closeOnClick:
                    false,

                offset:
                    8

            }
        );


    map.on(
        "mousemove",
        "pois-fill",
        event => {

            handleMapHover(
                event,
                popup
            );

        }
    );


    map.on(
        "mousemove",
        "compare-a-fill",
        event => {

            handleMapHover(
                event,
                popup
            );

        }
    );


    map.on(
        "mousemove",
        "compare-b-fill",
        event => {

            handleMapHover(
                event,
                popup
            );

        }
    );


    const leaveLayers = [
        "pois-fill",
        "compare-a-fill",
        "compare-b-fill"
    ];


    for (
        const layer
        of leaveLayers
    ) {

        map.on(
            "mouseleave",
            layer,
            () => {

                map.getCanvas().style.cursor =
                    "";

                popup.remove();

            }
        );

    }


    map.on(
        "click",
        "pois-fill",
        handlePOIClick
    );


    map.on(
        "click",
        "compare-a-fill",
        handlePOIClick
    );


    map.on(
        "click",
        "compare-b-fill",
        handlePOIClick
    );

}


function handleMapHover(
    event,
    popup
) {

    state.map.getCanvas().style.cursor =
        "pointer";


    if (!event.features.length) {
        return;
    }


    const p =
        event.features[0].properties;


    popup
        .setLngLat(
            event.lngLat
        )
        .setHTML(
            `
            <div class="poi-popup-title">
                POI ${p.cell_id}
            </div>

            <div class="poi-popup-detail">
                ${FOREST_LABELS[p.stable_forest_class] || p.stable_forest_class}
                <br>
                ${p.admin1_name || "—"}
                · ${p.koppen_class || "—"}
                <br>
                Productive forest:
                ${pct(Number(p.min_productive_fraction))}
            </div>
            `
        )
        .addTo(
            state.map
        );

}


function handlePOIClick(event) {

    if (!event.features.length) {
        return;
    }


    const id =
        normalizeId(
            event.features[0].properties.cell_id
        );


    if (
        state.appMode === "explore"
    ) {

        const visibleIds =
            new Set(
                getExploreFilteredFeatures()
                    .map(
                        feature =>
                            normalizeId(
                                feature.properties.cell_id
                            )
                    )
            );


        if (
            visibleIds.has(id)
        ) {

            selectExploreCell(id);

        }

        return;

    }


    if (
        state.appMode === "compare"
        &&
        state.compareType === "cell"
    ) {

        const eligibleIds =
            new Set(
                comparisonCandidateFeatures()
                    .map(
                        feature =>
                            normalizeId(
                                feature.properties.cell_id
                            )
                    )
            );


        if (
            !eligibleIds.has(id)
        ) {

            return;

        }


        if (
            state.compareCellA === null
        ) {

            state.compareCellA =
                id;

        }

        else if (
            state.compareCellB === null
            &&
            id !== state.compareCellA
        ) {

            state.compareCellB =
                id;

        }

        else {

            state.compareCellA =
                id;

            state.compareCellB =
                null;

        }


        updateEverything();

    }

}


/* ==========================================================
   MAP FITTING
   ========================================================== */


function fitToFinland() {

    if (
        !state.admin0GeoJSON.features.length
    ) {
        return;
    }


    state.map.fitBounds(
        getFeatureBounds(
            state.admin0GeoJSON.features[0]
        ),
        {

            padding:
                45,

            duration:
                850

        }
    );

}


function fitToAdmin1(name) {

    const feature =
        state.admin1GeoJSON.features.find(
            f =>
                f.properties.admin1_name
                === name
        );


    if (!feature) {
        return;
    }


    state.map.fitBounds(
        getFeatureBounds(feature),
        {

            padding:
                55,

            duration:
                850

        }
    );

}


function fitToFeatures(
    features,
    padding = 65
) {

    if (!features.length) {
        return;
    }


    const bounds =
        new maplibregl.LngLatBounds();


    for (
        const feature
        of features
    ) {

        const fb =
            getFeatureBounds(feature);

        bounds.extend(
            fb.getSouthWest()
        );

        bounds.extend(
            fb.getNorthEast()
        );

    }


    state.map.fitBounds(
        bounds,
        {

            padding:
                padding,

            duration:
                850,

            maxZoom:
                8.3

        }
    );

}


function fitToQuadrant(quadrant) {

    const features =
        state.poisGeoJSON.features.filter(
            feature =>
                feature.properties.geo_quadrant
                === quadrant
        );

    fitToFeatures(
        features,
        65
    );

}


function fitToComparison() {

    const a =
        comparisonFeatures("A");

    const b =
        comparisonFeatures("B");

    const combined =
        [...a, ...b];


    if (
        combined.length
    ) {

        fitToFeatures(
            combined,
            80
        );

    }

    else {

        fitToFinland();

    }

}


/* ==========================================================
   EXPLORE FILTERING
   ========================================================== */


function getExploreSpatialFeatures() {

    return state.poisGeoJSON.features.filter(
        feature => {

            const p =
                feature.properties;


            if (
                state.spatialMode === "quadrant"
                &&
                p.geo_quadrant !== state.quadrant
            ) {

                return false;

            }


            if (
                state.spatialMode === "admin1"
                &&
                p.admin1_name !== state.admin1
            ) {

                return false;

            }


            return true;

        }
    );

}


function getExploreFilteredFeatures() {

    return getExploreSpatialFeatures()
        .filter(
            feature => {

                return (
                    coverageEligible(feature)
                    &&
                    state.selectedClasses.has(
                        feature.properties.stable_forest_class
                    )
                );

            }
        );

}


/* ==========================================================
   MAP FILTERS
   ========================================================== */


function idsFilter(features) {

    const ids =
        features.map(
            feature =>
                feature.properties.cell_id
        );


    return ids.length
        ? [
            "in",
            ["get", "cell_id"],
            ["literal", ids]
          ]
        : [
            "==",
            ["get", "cell_id"],
            "__none__"
          ];

}


function hideLayerWithEmptyFilter(layer) {

    if (
        state.map.getLayer(layer)
    ) {

        state.map.setFilter(
            layer,
            [
                "==",
                ["get", "cell_id"],
                "__none__"
            ]
        );

    }

}


function updateMapFilters() {

    if (
        !state.map
        ||
        !state.map.getLayer(
            "pois-fill"
        )
    ) {

        return;

    }


    if (
        state.appMode === "explore"
    ) {

        const features =
            getExploreFilteredFeatures();

        const filter =
            idsFilter(features);


        state.map.setFilter(
            "pois-fill",
            filter
        );

        state.map.setFilter(
            "pois-outline",
            filter
        );


        hideLayerWithEmptyFilter(
            "compare-a-fill"
        );

        hideLayerWithEmptyFilter(
            "compare-a-outline"
        );

        hideLayerWithEmptyFilter(
            "compare-b-fill"
        );

        hideLayerWithEmptyFilter(
            "compare-b-outline"
        );


        if (
            state.selectedCell !== null
        ) {

            const stillVisible =
                features.some(
                    feature =>
                        normalizeId(
                            feature.properties.cell_id
                        )
                        ===
                        normalizeId(
                            state.selectedCell
                        )
                );


            if (!stillVisible) {

                clearExploreCell(
                    false
                );

            }

        }

    }


    else {

        hideLayerWithEmptyFilter(
            "pois-fill"
        );

        hideLayerWithEmptyFilter(
            "pois-outline"
        );


        let a;
        let b;


        if (
            state.compareType === "cell"
        ) {

            const candidates =
                comparisonCandidateFeatures();


            state.map.setFilter(
                "compare-a-fill",
                idsFilter(candidates)
            );

            state.map.setFilter(
                "compare-a-outline",
                idsFilter(candidates)
            );


            hideLayerWithEmptyFilter(
                "compare-b-fill"
            );

            hideLayerWithEmptyFilter(
                "compare-b-outline"
            );


            state.map.setPaintProperty(
                "compare-a-fill",
                "fill-opacity",
                0.48
            );

        }

        else {

            a =
                comparisonFeatures("A");

            b =
                comparisonFeatures("B");


            state.map.setFilter(
                "compare-a-fill",
                idsFilter(a)
            );

            state.map.setFilter(
                "compare-a-outline",
                idsFilter(a)
            );

            state.map.setFilter(
                "compare-b-fill",
                idsFilter(b)
            );

            state.map.setFilter(
                "compare-b-outline",
                idsFilter(b)
            );


            state.map.setPaintProperty(
                "compare-a-fill",
                "fill-opacity",
                0.78
            );

        }

    }


    updateCompareCellOutlines();

}


function updateCompareCellOutlines() {

    if (
        !state.map
        ||
        !state.map.getLayer(
            "compare-cell-a-outline"
        )
    ) {

        return;

    }


    const aFeature =
        state.compareCellA !== null
            ? state.poiById.get(
                normalizeId(
                    state.compareCellA
                )
              )
            : null;


    const bFeature =
        state.compareCellB !== null
            ? state.poiById.get(
                normalizeId(
                    state.compareCellB
                )
              )
            : null;


    state.map.setFilter(
        "compare-cell-a-outline",
        aFeature
            ? [
                "==",
                ["get", "cell_id"],
                aFeature.properties.cell_id
              ]
            : [
                "==",
                ["get", "cell_id"],
                "__none__"
              ]
    );


    state.map.setFilter(
        "compare-cell-b-outline",
        bFeature
            ? [
                "==",
                ["get", "cell_id"],
                bFeature.properties.cell_id
              ]
            : [
                "==",
                ["get", "cell_id"],
                "__none__"
              ]
    );

}


/* ==========================================================
   CLASS COUNTS
   ========================================================== */


function updateExploreClassCounts() {

    const spatialFeatures =
        getExploreSpatialFeatures()
            .filter(
                coverageEligible
            );


    for (
        const forestClass
        of FOREST_CLASSES
    ) {

        const count =
            spatialFeatures.filter(
                feature =>
                    feature.properties.stable_forest_class
                    === forestClass
            ).length;


        const countElement =
            document.querySelector(
                `[data-count-class="${forestClass}"]`
            );


        const row =
            document.querySelector(
                `[data-forest-class="${forestClass}"].class-check`
            );


        if (countElement) {

            countElement.textContent =
                count;

        }


        if (row) {

            row.classList.toggle(
                "disabled",
                count === 0
            );

        }


        const legend =
            document.querySelector(
                `[data-legend-class="${forestClass}"]`
            );


        if (legend) {

            legend.classList.toggle(
                "inactive",
                !state.selectedClasses.has(
                    forestClass
                )
            );

        }

    }

}


/* ==========================================================
   COMPARE CLASS AVAILABILITY
   ========================================================== */


function comparisonLocationRawFeatures(side) {

    if (
        state.compareType === "admin1"
    ) {

        return featuresForLocation(
            "admin1",
            side === "A"
                ? state.compareRegionA
                : state.compareRegionB
        );

    }


    if (
        state.compareType === "quadrant"
    ) {

        return featuresForLocation(
            "quadrant",
            side === "A"
                ? state.compareQuadrantA
                : state.compareQuadrantB
        );

    }


    return [];

}


function updateCompareClassAvailability() {

    const options =
        Array.from(
            dom.compareClassSelect.options
        );


    if (
        state.compareType === "cell"
    ) {

        for (
            const option
            of options
        ) {

            const forestClass =
                option.value;

            const count =
                state.poisGeoJSON.features.filter(
                    feature =>
                        coverageEligible(feature)
                        &&
                        feature.properties.stable_forest_class
                        === forestClass
                ).length;

            option.textContent =
                `${FOREST_LABELS[forestClass]} · ${count} eligible`;

            option.disabled =
                count < 2;

        }


        const selectedOption =
            options.find(
                option =>
                    option.value
                    === state.compareClass
            );


        if (
            !selectedOption
            ||
            selectedOption.disabled
        ) {

            const available =
                options.find(
                    option =>
                        !option.disabled
                );

            if (available) {

                state.compareClass =
                    available.value;

                dom.compareClassSelect.value =
                    available.value;

            }

        }


        dom.compareClassNote.textContent =
            "Cell comparison requires at least two eligible POIs for the selected forest class.";

        return;

    }


    const rawA =
        comparisonLocationRawFeatures(
            "A"
        )
        .filter(
            coverageEligible
        );


    const rawB =
        comparisonLocationRawFeatures(
            "B"
        )
        .filter(
            coverageEligible
        );


    for (
        const option
        of options
    ) {

        const forestClass =
            option.value;


        const nA =
            rawA.filter(
                feature =>
                    feature.properties.stable_forest_class
                    === forestClass
            ).length;


        const nB =
            rawB.filter(
                feature =>
                    feature.properties.stable_forest_class
                    === forestClass
            ).length;


        option.textContent =
            (
                `${FOREST_LABELS[forestClass]}`
                +
                ` · A ${nA} / B ${nB}`
            );


        option.disabled =
            nA === 0
            ||
            nB === 0;

    }


    const selectedOption =
        options.find(
            option =>
                option.value
                === state.compareClass
        );


    if (
        !selectedOption
        ||
        selectedOption.disabled
    ) {

        const available =
            options.find(
                option =>
                    !option.disabled
            );


        if (available) {

            state.compareClass =
                available.value;

            dom.compareClassSelect.value =
                available.value;

        }

    }


    const a =
        comparisonFeatures("A");

    const b =
        comparisonFeatures("B");


    dom.compareClassNote.textContent =
        (
            `Current class: A ${a.length} POIs · B ${b.length} POIs`
        );

}


/* ==========================================================
   RANGE UI
   ========================================================== */


function updateRangeUI() {

    const min =
        state.coverageMin;

    const max =
        state.coverageMax;


    dom.coverageBadge.textContent =
        `${min}–${max}%`;


    dom.metaCoverage.textContent =
        min === max
            ? `${min}%`
            : `${min}–${max}%`;


    dom.rangeTrack.style.background =
        `
        linear-gradient(
            to right,
            #d9dfd8 0%,
            #d9dfd8 ${min}%,
            #176b3a ${min}%,
            #176b3a ${max}%,
            #d9dfd8 ${max}%,
            #d9dfd8 100%
        )
        `;

}


/* ==========================================================
   SCIENTIFIC AGGREGATION
   ========================================================== */


function calculateSummaryForFeatures(
    features
) {

    const ids =
        new Set(
            features.map(
                feature =>
                    normalizeId(
                        feature.properties.cell_id
                    )
            )
        );


    const selectedRows =
        state.sifRows.filter(
            row =>
                ids.has(
                    normalizeId(
                        row.cell_id
                    )
                )
        );


    const monthBuckets =
        new Map();


    for (
        const month
        of MONTHS
    ) {

        monthBuckets.set(
            month,
            {

                meanSif: [],
                spatial: [],
                retrieval: []

            }
        );

    }


    for (
        const row
        of selectedRows
    ) {

        const month =
            Number(row.month);

        const bucket =
            monthBuckets.get(month);

        if (!bucket) {
            continue;
        }


        bucket.meanSif.push(
            Number(row.mean_sif)
        );

        bucket.spatial.push(
            Number(row.spatial_sd)
        );

        bucket.retrieval.push(
            Number(
                row.retrieval_uncertainty
            )
        );

    }


    /*
    Temporal variability:
    SD across years separately for POI × month,
    then mean those POI-specific SDs.
    */

    const poiMonth =
        new Map();


    for (
        const row
        of selectedRows
    ) {

        const id =
            normalizeId(row.cell_id);

        const month =
            Number(row.month);

        const key =
            `${id}|${month}`;


        if (
            !poiMonth.has(key)
        ) {

            poiMonth.set(
                key,
                []
            );

        }


        poiMonth
            .get(key)
            .push(
                Number(row.mean_sif)
            );

    }


    const temporalByMonth =
        new Map();


    for (
        const month
        of MONTHS
    ) {

        temporalByMonth.set(
            month,
            []
        );

    }


    for (
        const [
            key,
            values
        ]
        of poiMonth
    ) {

        const month =
            Number(
                key.split("|")[1]
            );

        temporalByMonth
            .get(month)
            .push(
                sampleSD(values)
            );

    }


    return {

        mean:
            MONTHS.map(
                month =>
                    mean(
                        monthBuckets
                            .get(month)
                            .meanSif
                    )
            ),

        temporal:
            MONTHS.map(
                month =>
                    mean(
                        temporalByMonth
                            .get(month)
                    )
            ),

        spatial:
            MONTHS.map(
                month =>
                    mean(
                        monthBuckets
                            .get(month)
                            .spatial
                    )
            ),

        retrieval:
            MONTHS.map(
                month =>
                    mean(
                        monthBuckets
                            .get(month)
                            .retrieval
                    )
            ),

        nPois:
            features.length,

        nRows:
            selectedRows.length

    };

}


function calculateExploreGroupSummary(
    features
) {

    const result =
        {};


    const presentClasses =
        FOREST_CLASSES.filter(
            forestClass =>
                features.some(
                    feature =>
                        feature.properties.stable_forest_class
                        === forestClass
                )
        );


    let totalRows =
        0;


    for (
        const forestClass
        of presentClasses
    ) {

        const classFeatures =
            features.filter(
                feature =>
                    feature.properties.stable_forest_class
                    === forestClass
            );


        const summary =
            calculateSummaryForFeatures(
                classFeatures
            );


        result[
            forestClass
        ] =
            summary;


        totalRows +=
            summary.nRows;

    }


    return {

        series:
            result,

        nRows:
            totalRows

    };

}


/* ==========================================================
   PLOT TRACES
   ========================================================== */


function makeSeriesTraces(
    name,
    values,
    color
) {

    const traces =
        [];


    if (
        state.showTemporal
    ) {

        const upper =
            values.mean.map(
                (value, index) =>
                    value
                    +
                    values.temporal[index]
            );


        const lower =
            values.mean.map(
                (value, index) =>
                    value
                    -
                    values.temporal[index]
            );


        traces.push(
            {

                x:
                    MONTH_LABELS,

                y:
                    lower,

                mode:
                    "lines",

                line: {
                    width:
                        0
                },

                hoverinfo:
                    "skip",

                showlegend:
                    false,

                legendgroup:
                    name

            }
        );


        traces.push(
            {

                x:
                    MONTH_LABELS,

                y:
                    upper,

                mode:
                    "lines",

                line: {
                    width:
                        0
                },

                fill:
                    "tonexty",

                fillcolor:
                    hexToRGBA(
                        color,
                        0.13
                    ),

                hoverinfo:
                    "skip",

                showlegend:
                    false,

                legendgroup:
                    name

            }
        );

    }


    if (
        state.showSpatial
    ) {

        const upper =
            values.mean.map(
                (value, index) =>
                    value
                    +
                    values.spatial[index]
            );


        const lower =
            values.mean.map(
                (value, index) =>
                    value
                    -
                    values.spatial[index]
            );


        traces.push(
            {

                x:
                    MONTH_LABELS,

                y:
                    upper,

                mode:
                    "lines",

                line: {

                    color:
                        color,

                    width:
                        1.1,

                    dash:
                        "dash"

                },

                opacity:
                    0.62,

                hoverinfo:
                    "skip",

                showlegend:
                    false,

                legendgroup:
                    name

            }
        );


        traces.push(
            {

                x:
                    MONTH_LABELS,

                y:
                    lower,

                mode:
                    "lines",

                line: {

                    color:
                        color,

                    width:
                        1.1,

                    dash:
                        "dash"

                },

                opacity:
                    0.62,

                hoverinfo:
                    "skip",

                showlegend:
                    false,

                legendgroup:
                    name

            }
        );

    }


    const meanTrace = {

        x:
            MONTH_LABELS,

        y:
            values.mean,

        type:
            "scatter",

        mode:
            "lines+markers",

        name:
            `${name} · n=${values.nPois}`,

        legendgroup:
            name,

        line: {

            color:
                color,

            width:
                2.8

        },

        marker: {

            size:
                7,

            color:
                "#ffffff",

            line: {

                color:
                    color,

                width:
                    2

            }

        },

        hovertemplate:
            (
                "<b>%{x}</b>"
                +
                "<br>SIF: %{y:.3f}"
                +
                "<extra>"
                +
                name
                +
                "</extra>"
            )

    };


    if (
        state.showRetrieval
    ) {

        meanTrace.error_y = {

            type:
                "data",

            array:
                values.retrieval,

            visible:
                true,

            color:
                "#222a24",

            thickness:
                1,

            width:
                3

        };

    }


    traces.push(
        meanTrace
    );


    return traces;

}


/* ==========================================================
   PLOT LAYOUT
   ========================================================== */


function plotLayout() {

    return {

        margin: {

            l:
                74,

            r:
                28,

            t:
                22,

            b:
                62

        },

        paper_bgcolor:
            "#ffffff",

        plot_bgcolor:
            "#ffffff",

        hovermode:
            "x unified",

        font: {

            family:
                "Inter, ui-sans-serif, system-ui, sans-serif",

            color:
                "#17211a",

            size:
                11

        },

        xaxis: {

            title: {

                text:
                    "Month",

                standoff:
                    15,

                font: {
                    size:
                        12
                }

            },

            type:
                "category",

            categoryorder:
                "array",

            categoryarray:
                MONTH_LABELS,

            showgrid:
                false,

            showline:
                true,

            mirror:
                true,

            linewidth:
                1,

            linecolor:
                "#aeb8af",

            ticks:
                "outside",

            tickcolor:
                "#aeb8af",

            zeroline:
                false

        },

        yaxis: {

            title: {

                text:
                    "Solar-induced fluorescence<br>(mW m⁻² sr⁻¹ nm⁻¹)",

                standoff:
                    12,

                font: {
                    size:
                        12
                }

            },

            showgrid:
                true,

            gridcolor:
                "#e8ece7",

            gridwidth:
                1,

            showline:
                true,

            mirror:
                true,

            linewidth:
                1,

            linecolor:
                "#aeb8af",

            ticks:
                "outside",

            tickcolor:
                "#aeb8af",

            zeroline:
                false

        },

        legend: {

            orientation:
                "h",

            x:
                0,

            xanchor:
                "left",

            y:
                1.08,

            yanchor:
                "bottom",

            font: {
                size:
                    10
            },

            bgcolor:
                "rgba(255,255,255,0)"

        },

        shapes: [

            {

                type:
                    "line",

                xref:
                    "paper",

                x0:
                    0,

                x1:
                    1,

                yref:
                    "y",

                y0:
                    0,

                y1:
                    0,

                line: {

                    color:
                        "#8a938c",

                    width:
                        1,

                    dash:
                        "dot"

                }

            }

        ],

        transition: {

            duration:
                260,

            easing:
                "cubic-in-out"

        }

    };

}


function plotConfig() {

    return {

        responsive:
            true,

        displaylogo:
            false,

        modeBarButtonsToRemove: [
            "lasso2d",
            "select2d",
            "autoScale2d"
        ],

        toImageButtonOptions: {

            format:
                "png",

            filename:
                "finnish_forest_sif",

            scale:
                2

        }

    };

}


/* ==========================================================
   EXPLORE CHART
   ========================================================== */


function updateExploreChart() {

    const features =
        getExploreFilteredFeatures();


    let summary;
    let selectedFeature =
        null;


    if (
        state.selectedCell !== null
    ) {

        selectedFeature =
            state.poiById.get(
                normalizeId(
                    state.selectedCell
                )
            );


        const values =
            calculateSummaryForFeatures(
                [selectedFeature]
            );


        summary = {

            series: {
                single:
                    values
            },

            nRows:
                values.nRows

        };

    }


    else {

        summary =
            calculateExploreGroupSummary(
                features
            );

    }


    const nPois =
        state.selectedCell !== null
            ? 1
            : features.length;


    dom.metricPois.textContent =
        nPois.toLocaleString();


    dom.metricObservations.textContent =
        summary.nRows.toLocaleString();


    dom.metricYears.textContent =
        "7";


    if (
        nPois === 0
    ) {

        showEmptyState(
            "No POIs match this selection",
            "Broaden the productive-forest range, select another forest class, or choose a different region."
        );

        dom.chartSubtitle.textContent =
            "No landscapes satisfy the current filters.";

        return;

    }


    hideEmptyState();


    if (
        state.selectedCell === null
        &&
        nPois < 10
    ) {

        dom.smallSelectionWarning
            .classList.remove(
                "hidden"
            );

    }

    else {

        dom.smallSelectionWarning
            .classList.add(
                "hidden"
            );

    }


    dom.comparisonWarning
        .classList.add(
            "hidden"
        );


    const entries =
        Object.entries(
            summary.series
        );


    const singleTrajectory =
        entries.length === 1;


    const traces =
        [];


    for (
        const [
            key,
            values
        ]
        of entries
    ) {

        let displayName;
        let color;


        if (
            state.selectedCell !== null
        ) {

            displayName =
                `POI ${state.selectedCell}`;

            color =
                SINGLE_SIF_COLOR;

        }

        else {

            displayName =
                FOREST_LABELS[key]
                || key;

            color =
                singleTrajectory
                    ? SINGLE_SIF_COLOR
                    : FOREST_COLORS[key];

        }


        traces.push(
            ...makeSeriesTraces(
                displayName,
                values,
                color
            )
        );

    }


    Plotly.react(
        dom.sifChart,
        traces,
        plotLayout(),
        plotConfig()
    );


    if (
        state.selectedCell !== null
        &&
        selectedFeature
    ) {

        const p =
            selectedFeature.properties;


        dom.chartTitle.textContent =
            `Seasonal SIF · POI ${p.cell_id}`;


        dom.chartSubtitle.textContent =
            (
                `${FOREST_LABELS[p.stable_forest_class] || p.stable_forest_class}`
                +
                ` · ${p.admin1_name || "—"}`
                +
                ` · ${p.koppen_class || "—"}`
                +
                ` · productive forest ${pct(Number(p.min_productive_fraction))}`
            );

    }


    else {

        const classes =
            FOREST_CLASSES
                .filter(
                    forestClass =>
                        features.some(
                            feature =>
                                feature.properties.stable_forest_class
                                === forestClass
                        )
                )
                .map(
                    forestClass =>
                        FOREST_LABELS[
                            forestClass
                        ]
                );


        dom.chartTitle.textContent =
            "Seasonal solar-induced fluorescence";


        dom.chartSubtitle.textContent =
            (
                `${getExploreSpatialLabel()}`
                +
                ` · ${nPois} POIs`
                +
                (
                    classes.length
                        ? ` · ${classes.join(", ")}`
                        : ""
                )
            );

    }

}


/* ==========================================================
   COMPARE CHART
   ========================================================== */


function comparisonSideName(side) {

    if (
        state.compareType === "admin1"
    ) {

        return (
            side === "A"
                ? state.compareRegionA
                : state.compareRegionB
        );

    }


    if (
        state.compareType === "quadrant"
    ) {

        const value =
            side === "A"
                ? state.compareQuadrantA
                : state.compareQuadrantB;

        return (
            `${QUADRANT_LABELS[value]} Finland`
        );

    }


    const id =
        side === "A"
            ? state.compareCellA
            : state.compareCellB;


    return (
        id === null
            ? `POI ${side} not selected`
            : `POI ${id}`
    );

}


function updateCompareChart() {

    const featuresA =
        comparisonFeatures("A");

    const featuresB =
        comparisonFeatures("B");


    const nameA =
        comparisonSideName("A");

    const nameB =
        comparisonSideName("B");


    const classLabel =
        FOREST_LABELS[
            state.compareClass
        ];


    updateCompareSummary(
        featuresA,
        featuresB,
        nameA,
        nameB
    );


    if (
        state.compareType === "cell"
        &&
        (
            state.compareCellA === null
            ||
            state.compareCellB === null
        )
    ) {

        showEmptyState(
            "Select two POIs to compare",
            (
                state.compareCellA === null
                    ? "Click an eligible grid cell to assign Selection A."
                    : "Selection A is ready. Click a different eligible grid cell to assign Selection B."
            )
        );


        dom.chartTitle.textContent =
            "POI comparison";


        dom.chartSubtitle.textContent =
            `${classLabel} · productive forest ${state.coverageMin}–${state.coverageMax}%`;


        dom.smallSelectionWarning
            .classList.add(
                "hidden"
            );


        dom.comparisonWarning
            .classList.add(
                "hidden"
            );


        return;

    }


    if (
        featuresA.length === 0
        ||
        featuresB.length === 0
    ) {

        showEmptyState(
            "This comparison has no matched POIs",
            "Choose another forest class, broaden the productive-forest range, or select different locations."
        );


        dom.chartTitle.textContent =
            "Seasonal SIF comparison";


        dom.chartSubtitle.textContent =
            `${classLabel} · ${nameA} vs ${nameB}`;


        dom.smallSelectionWarning
            .classList.add(
                "hidden"
            );


        dom.comparisonWarning
            .classList.add(
                "hidden"
            );


        return;

    }


    hideEmptyState();


    const summaryA =
        calculateSummaryForFeatures(
            featuresA
        );


    const summaryB =
        calculateSummaryForFeatures(
            featuresB
        );


    const traces = [

        ...makeSeriesTraces(
            `A · ${nameA}`,
            summaryA,
            COMPARE_A_COLOR
        ),

        ...makeSeriesTraces(
            `B · ${nameB}`,
            summaryB,
            COMPARE_B_COLOR
        )

    ];


    Plotly.react(
        dom.sifChart,
        traces,
        plotLayout(),
        plotConfig()
    );


    dom.chartTitle.textContent =
        `Seasonal SIF comparison · ${classLabel}`;


    dom.chartSubtitle.textContent =
        (
            `${nameA} vs ${nameB}`
            +
            ` · productive forest ${state.coverageMin}–${state.coverageMax}%`
        );


    const smallSides =
        [];


    if (
        summaryA.nPois < 10
        &&
        state.compareType !== "cell"
    ) {

        smallSides.push(
            `A n=${summaryA.nPois}`
        );

    }


    if (
        summaryB.nPois < 10
        &&
        state.compareType !== "cell"
    ) {

        smallSides.push(
            `B n=${summaryB.nPois}`
        );

    }


    if (
        smallSides.length
    ) {

        dom.comparisonWarning.textContent =
            (
                `Small comparison group (${smallSides.join(", ")}). `
                +
                `Aggregated variability should be interpreted cautiously.`
            );


        dom.comparisonWarning
            .classList.remove(
                "hidden"
            );

    }

    else {

        dom.comparisonWarning
            .classList.add(
                "hidden"
            );

    }


    dom.smallSelectionWarning
        .classList.add(
            "hidden"
        );

}


/* ==========================================================
   EMPTY STATE
   ========================================================== */


function showEmptyState(
    title,
    text
) {

    dom.emptySelectionTitle.textContent =
        title;

    dom.emptySelectionText.textContent =
        text;


    dom.emptySelection
        .classList.remove(
            "hidden"
        );


    dom.sifChart
        .classList.add(
            "hidden"
        );

}


function hideEmptyState() {

    dom.emptySelection
        .classList.add(
            "hidden"
        );


    dom.sifChart
        .classList.remove(
            "hidden"
        );

}


/* ==========================================================
   EXPLORE CELL
   ========================================================== */


function selectExploreCell(id) {

    const feature =
        state.poiById.get(
            normalizeId(id)
        );


    if (!feature) {
        return;
    }


    state.selectedCell =
        normalizeId(id);


    const p =
        feature.properties;


    state.map.setFilter(
        "selected-poi",
        [
            "==",
            ["get", "cell_id"],
            p.cell_id
        ]
    );


    dom.mapSelectionCard
        .classList.remove(
            "hidden"
        );


    dom.selectedCellTitle.textContent =
        `POI ${p.cell_id}`;


    dom.selectedCellDetails.innerHTML =
        `
        <div>
            <strong>
                ${FOREST_LABELS[p.stable_forest_class] || p.stable_forest_class}
            </strong>
        </div>

        <div>
            Administrative region:
            ${p.admin1_name || "—"}
        </div>

        <div>
            Geographic quadrant:
            ${QUADRANT_LABELS[p.geo_quadrant] || p.geo_quadrant || "—"}
        </div>

        <div>
            Köppen–Geiger:
            ${p.koppen_class || "—"}
        </div>

        <div>
            Productive forest:
            ${pct(Number(p.min_productive_fraction))}
        </div>

        <div>
            Stable class fraction:
            ${pct(Number(p.stable_class_min_fraction))}
        </div>
        `;


    state.map.fitBounds(
        getFeatureBounds(feature),
        {

            padding:
                170,

            maxZoom:
                8.3,

            duration:
                700

        }
    );


    updateEverything();

}


function clearExploreCell(
    refit = true
) {

    state.selectedCell =
        null;


    if (
        state.map
        &&
        state.map.getLayer(
            "selected-poi"
        )
    ) {

        state.map.setFilter(
            "selected-poi",
            [
                "==",
                ["get", "cell_id"],
                "__none__"
            ]
        );

    }


    dom.mapSelectionCard
        .classList.add(
            "hidden"
        );


    if (refit) {

        refitExploreSelection();

    }

}


/* ==========================================================
   LABELS
   ========================================================== */


function getExploreSpatialLabel() {

    if (
        state.spatialMode === "admin1"
    ) {

        return state.admin1;

    }


    if (
        state.spatialMode === "quadrant"
    ) {

        return (
            `${QUADRANT_LABELS[state.quadrant]} Finland`
        );

    }


    return "Finland";

}


function updateExploreSummaryHeading() {

    if (
        state.selectedCell !== null
    ) {

        dom.selectionHeading.textContent =
            `POI ${state.selectedCell}`;

    }

    else {

        dom.selectionHeading.textContent =
            getExploreSpatialLabel();

    }

}


/* ==========================================================
   COMPARE SUMMARY
   ========================================================== */


function updateCompareSummary(
    featuresA = comparisonFeatures("A"),
    featuresB = comparisonFeatures("B"),
    nameA = comparisonSideName("A"),
    nameB = comparisonSideName("B")
) {

    dom.compareSummaryA.textContent =
        nameA;

    dom.compareSummaryB.textContent =
        nameB;


    if (
        state.compareType === "cell"
    ) {

        const featureA =
            state.compareCellA !== null
                ? state.poiById.get(
                    normalizeId(
                        state.compareCellA
                    )
                  )
                : null;


        const featureB =
            state.compareCellB !== null
                ? state.poiById.get(
                    normalizeId(
                        state.compareCellB
                    )
                  )
                : null;


        dom.compareSummaryAMeta.textContent =
            featureA
                ? (
                    `${featureA.properties.admin1_name}`
                    +
                    ` · forest ${pct(Number(featureA.properties.min_productive_fraction))}`
                  )
                : "Awaiting map selection";


        dom.compareSummaryBMeta.textContent =
            featureB
                ? (
                    `${featureB.properties.admin1_name}`
                    +
                    ` · forest ${pct(Number(featureB.properties.min_productive_fraction))}`
                  )
                : "Awaiting map selection";

    }

    else {

        dom.compareSummaryAMeta.textContent =
            `${featuresA.length} POIs`;

        dom.compareSummaryBMeta.textContent =
            `${featuresB.length} POIs`;

    }

}


/* ==========================================================
   MODE UI
   ========================================================== */


function updateModeUI() {

    document
        .querySelectorAll(
            ".mode-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.appMode
                    === state.appMode
                );

            }
        );


    const compare =
        state.appMode === "compare";


    dom.exploreSummarySection
        .classList.toggle(
            "hidden",
            compare
        );


    dom.compareSummarySection
        .classList.toggle(
            "hidden",
            !compare
        );


    dom.exploreSpatialSection
        .classList.toggle(
            "hidden",
            compare
        );


    dom.compareSpatialSection
        .classList.toggle(
            "hidden",
            !compare
        );


    dom.exploreClassSection
        .classList.toggle(
            "hidden",
            compare
        );


    dom.compareClassSection
        .classList.toggle(
            "hidden",
            !compare
        );


    dom.exploreMapLegend
        .classList.toggle(
            "hidden",
            compare
        );


    dom.compareMapLegend
        .classList.toggle(
            "hidden",
            !compare
        );


    dom.mapSelectionCard
        .classList.toggle(
            "hidden",
            compare
            ||
            state.selectedCell === null
        );


    dom.compareClickCard
        .classList.toggle(
            "hidden",
            !compare
            ||
            state.compareType !== "cell"
        );


    if (compare) {

        dom.modeEyebrow.textContent =
            "COMPARISON MODE";

        dom.modeDescription.textContent =
            "Compare the same forest class between two regions, quadrants, or individual 10 × 10 km cells.";

        dom.mapTitle.textContent =
            "Spatial comparison";


        if (
            state.compareType === "cell"
        ) {

            dom.mapSubtitle.textContent =
                "Click two eligible cells to assign A and B";

        }

        else {

            dom.mapSubtitle.textContent =
                "Selection A is green · Selection B is blue";

        }

    }

    else {

        dom.modeEyebrow.textContent =
            "EXPLORER MODE";

        dom.modeDescription.textContent =
            "Explore forest classes across Finland, regions, quadrants, or individual cells.";

        dom.mapTitle.textContent =
            getExploreSpatialLabel();

        dom.mapSubtitle.textContent =
            "Click a 10 × 10 km cell for POI-level SIF";

    }

}


/* ==========================================================
   SPATIAL UI
   ========================================================== */


function updateExploreSpatialUI() {

    document
        .querySelectorAll(
            ".spatial-mode"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.mode
                    === state.spatialMode
                );

            }
        );


    dom.quadrantControl
        .classList.toggle(
            "hidden",
            state.spatialMode
            !== "quadrant"
        );


    dom.admin1Control
        .classList.toggle(
            "hidden",
            state.spatialMode
            !== "admin1"
        );

}


function updateCompareTypeUI() {

    document
        .querySelectorAll(
            ".compare-type"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.compareType
                    === state.compareType
                );

            }
        );


    dom.compareRegionControls
        .classList.toggle(
            "hidden",
            state.compareType
            !== "admin1"
        );


    dom.compareQuadrantControls
        .classList.toggle(
            "hidden",
            state.compareType
            !== "quadrant"
        );


    dom.compareCellControls
        .classList.toggle(
            "hidden",
            state.compareType
            !== "cell"
        );


    dom.compareClickCard
        .classList.toggle(
            "hidden",
            state.appMode !== "compare"
            ||
            state.compareType !== "cell"
        );


    if (
        state.compareType === "cell"
    ) {

        if (
            state.compareCellA === null
        ) {

            dom.compareClickTitle.textContent =
                "Select POI A";

            dom.compareClickText.textContent =
                "Click an eligible grid cell on the map.";

        }

        else if (
            state.compareCellB === null
        ) {

            dom.compareClickTitle.textContent =
                "Select POI B";

            dom.compareClickText.textContent =
                `POI ${state.compareCellA} is A. Click a different cell for B.`;

        }

        else {

            dom.compareClickTitle.textContent =
                `POI ${state.compareCellA} vs POI ${state.compareCellB}`;

            dom.compareClickText.textContent =
                "Click another cell to begin a new comparison pair.";

        }

    }


    dom.compareCellALabel.textContent =
        state.compareCellA === null
            ? "Not selected"
            : `POI ${state.compareCellA}`;


    dom.compareCellBLabel.textContent =
        state.compareCellB === null
            ? "Not selected"
            : `POI ${state.compareCellB}`;

}


/* ==========================================================
   CONTEXT LAYERS
   ========================================================== */


function updateContextLayers() {

    if (
        !state.map
        ||
        !state.map.getLayer(
            "admin1-line"
        )
    ) {

        return;

    }


    state.map.setLayoutProperty(
        "admin1-line",
        "visibility",
        state.showAdmin1
            ? "visible"
            : "none"
    );


    state.map.setLayoutProperty(
        "quadrant-lines",
        "visibility",
        state.showQuadrants
            ? "visible"
            : "none"
    );

}


/* ==========================================================
   REFIT
   ========================================================== */


function refitExploreSelection() {

    if (
        state.spatialMode === "admin1"
    ) {

        fitToAdmin1(
            state.admin1
        );

        return;

    }


    if (
        state.spatialMode === "quadrant"
    ) {

        fitToQuadrant(
            state.quadrant
        );

        return;

    }


    fitToFinland();

}


/* ==========================================================
   UPDATE
   ========================================================== */


function updateEverything() {

    updateRangeUI();

    updateModeUI();

    updateExploreSpatialUI();

    updateCompareTypeUI();

    updateCompareClassAvailability();

    updateMapFilters();

    updateExploreClassCounts();

    updateContextLayers();


    if (
        state.appMode === "explore"
    ) {

        updateExploreSummaryHeading();

        updateExploreChart();

    }

    else {

        updateCompareChart();

    }

}


/* ==========================================================
   EVENTS
   ========================================================== */


function bindEvents() {

    document
        .querySelectorAll(
            ".mode-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const mode =
                            button.dataset.appMode;


                        if (
                            mode === state.appMode
                        ) {
                            return;
                        }


                        state.appMode =
                            mode;


                        clearExploreCell(
                            false
                        );


                        updateEverything();


                        if (
                            state.appMode === "compare"
                        ) {

                            fitToComparison();

                        }

                        else {

                            refitExploreSelection();

                        }

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".spatial-mode"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        state.spatialMode =
                            button.dataset.mode;


                        clearExploreCell(
                            false
                        );


                        updateEverything();

                        refitExploreSelection();

                    }
                );

            }
        );


    dom.quadrantSelect.addEventListener(
        "change",
        event => {

            state.quadrant =
                event.target.value;


            clearExploreCell(
                false
            );


            updateEverything();

            fitToQuadrant(
                state.quadrant
            );

        }
    );


    dom.admin1Select.addEventListener(
        "change",
        event => {

            state.admin1 =
                event.target.value;


            clearExploreCell(
                false
            );


            updateEverything();

            fitToAdmin1(
                state.admin1
            );

        }
    );


    document
        .querySelectorAll(
            ".compare-type"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        state.compareType =
                            button.dataset.compareType;


                        state.compareCellA =
                            null;

                        state.compareCellB =
                            null;


                        if (
                            state.compareType === "admin1"
                        ) {

                            state.compareClass =
                                chooseAvailableComparisonClass(
                                    "admin1",
                                    state.compareRegionA,
                                    state.compareRegionB,
                                    state.compareClass
                                );

                        }


                        else if (
                            state.compareType === "quadrant"
                        ) {

                            state.compareClass =
                                chooseAvailableComparisonClass(
                                    "quadrant",
                                    state.compareQuadrantA,
                                    state.compareQuadrantB,
                                    state.compareClass
                                );

                        }


                        dom.compareClassSelect.value =
                            state.compareClass;


                        updateEverything();

                        fitToComparison();

                    }
                );

            }
        );


    dom.compareRegionA.addEventListener(
        "change",
        event => {

            state.compareRegionA =
                event.target.value;


            state.compareClass =
                chooseAvailableComparisonClass(
                    "admin1",
                    state.compareRegionA,
                    state.compareRegionB,
                    state.compareClass
                );


            dom.compareClassSelect.value =
                state.compareClass;


            updateEverything();

            fitToComparison();

        }
    );


    dom.compareRegionB.addEventListener(
        "change",
        event => {

            state.compareRegionB =
                event.target.value;


            state.compareClass =
                chooseAvailableComparisonClass(
                    "admin1",
                    state.compareRegionA,
                    state.compareRegionB,
                    state.compareClass
                );


            dom.compareClassSelect.value =
                state.compareClass;


            updateEverything();

            fitToComparison();

        }
    );


    dom.compareQuadrantA.addEventListener(
        "change",
        event => {

            state.compareQuadrantA =
                event.target.value;


            state.compareClass =
                chooseAvailableComparisonClass(
                    "quadrant",
                    state.compareQuadrantA,
                    state.compareQuadrantB,
                    state.compareClass
                );


            dom.compareClassSelect.value =
                state.compareClass;


            updateEverything();

            fitToComparison();

        }
    );


    dom.compareQuadrantB.addEventListener(
        "change",
        event => {

            state.compareQuadrantB =
                event.target.value;


            state.compareClass =
                chooseAvailableComparisonClass(
                    "quadrant",
                    state.compareQuadrantA,
                    state.compareQuadrantB,
                    state.compareClass
                );


            dom.compareClassSelect.value =
                state.compareClass;


            updateEverything();

            fitToComparison();

        }
    );


    dom.compareClassSelect.addEventListener(
        "change",
        event => {

            state.compareClass =
                event.target.value;


            state.compareCellA =
                null;

            state.compareCellB =
                null;


            updateEverything();

            fitToComparison();

        }
    );


    dom.clearCompareCells.addEventListener(
        "click",
        () => {

            state.compareCellA =
                null;

            state.compareCellB =
                null;


            updateEverything();

            fitToFinland();

        }
    );


    dom.coverageMin.addEventListener(
        "input",
        event => {

            let value =
                Number(
                    event.target.value
                );


            if (
                value > state.coverageMax
            ) {

                value =
                    state.coverageMax;

                event.target.value =
                    value;

            }


            state.coverageMin =
                value;


            clearExploreCell(
                false
            );


            validateCompareCells();

            updateEverything();

        }
    );


    dom.coverageMax.addEventListener(
        "input",
        event => {

            let value =
                Number(
                    event.target.value
                );


            if (
                value < state.coverageMin
            ) {

                value =
                    state.coverageMin;

                event.target.value =
                    value;

            }


            state.coverageMax =
                value;


            clearExploreCell(
                false
            );


            validateCompareCells();

            updateEverything();

        }
    );


    dom.forestClassControls.addEventListener(
        "change",
        event => {

            const input =
                event.target;


            if (
                !input.matches(
                    'input[type="checkbox"][data-forest-class]'
                )
            ) {

                return;

            }


            const forestClass =
                input.dataset.forestClass;


            if (
                input.checked
            ) {

                state.selectedClasses.add(
                    forestClass
                );

            }

            else {

                state.selectedClasses.delete(
                    forestClass
                );

            }


            clearExploreCell(
                false
            );


            updateEverything();

        }
    );


    dom.selectAllClasses.addEventListener(
        "click",
        () => {

            state.selectedClasses =
                new Set(
                    FOREST_CLASSES
                );


            document
                .querySelectorAll(
                    'input[data-forest-class]'
                )
                .forEach(
                    input => {

                        input.checked =
                            true;

                    }
                );


            clearExploreCell(
                false
            );


            updateEverything();

        }
    );


    dom.toggleTemporal.addEventListener(
        "change",
        event => {

            state.showTemporal =
                event.target.checked;

            updateCurrentChart();

        }
    );


    dom.toggleSpatial.addEventListener(
        "change",
        event => {

            state.showSpatial =
                event.target.checked;

            updateCurrentChart();

        }
    );


    dom.toggleRetrieval.addEventListener(
        "change",
        event => {

            state.showRetrieval =
                event.target.checked;

            updateCurrentChart();

        }
    );


    dom.toggleAdmin1.addEventListener(
        "change",
        event => {

            state.showAdmin1 =
                event.target.checked;

            updateContextLayers();

        }
    );


    dom.toggleQuadrants.addEventListener(
        "change",
        event => {

            state.showQuadrants =
                event.target.checked;

            updateContextLayers();

        }
    );


    dom.closeCellSelection.addEventListener(
        "click",
        () => {

            clearExploreCell(
                true
            );

            updateEverything();

        }
    );


    dom.returnGroupButton.addEventListener(
        "click",
        () => {

            clearExploreCell(
                true
            );

            updateEverything();

        }
    );


    dom.resetButton.addEventListener(
        "click",
        resetExplorer
    );


    window.addEventListener(
        "resize",
        () => {

            if (state.map) {
                state.map.resize();
            }


            if (dom.sifChart) {

                Plotly.Plots.resize(
                    dom.sifChart
                );

            }

        }
    );

}


/* ==========================================================
   VALIDATE COMPARE CELLS
   ========================================================== */


function validateCompareCells() {

    const eligible =
        new Set(
            comparisonCandidateFeatures()
                .map(
                    feature =>
                        normalizeId(
                            feature.properties.cell_id
                        )
                )
        );


    if (
        state.compareCellA !== null
        &&
        !eligible.has(
            normalizeId(
                state.compareCellA
            )
        )
    ) {

        state.compareCellA =
            null;

    }


    if (
        state.compareCellB !== null
        &&
        !eligible.has(
            normalizeId(
                state.compareCellB
            )
        )
    ) {

        state.compareCellB =
            null;

    }

}


/* ==========================================================
   CURRENT CHART
   ========================================================== */


function updateCurrentChart() {

    if (
        state.appMode === "compare"
    ) {

        updateCompareChart();

    }

    else {

        updateExploreChart();

    }

}


/* ==========================================================
   RESET
   ========================================================== */


function resetExplorer() {

    state.appMode =
        "explore";

    state.spatialMode =
        "finland";

    state.quadrant =
        "north-west";

    state.coverageMin =
        70;

    state.coverageMax =
        100;

    state.selectedClasses =
        new Set(
            FOREST_CLASSES
        );

    state.showTemporal =
        true;

    state.showSpatial =
        true;

    state.showRetrieval =
        true;

    state.showAdmin1 =
        true;

    state.showQuadrants =
        false;

    state.selectedCell =
        null;

    state.compareType =
        "admin1";

    state.compareCellA =
        null;

    state.compareCellB =
        null;


    const names =
        getAdminNames();


    state.compareRegionA =
        names.includes("Lapland")
            ? "Lapland"
            : names[0];


    state.compareRegionB =
        names.includes("North Karelia")
            ? "North Karelia"
            : (
                names.find(
                    name =>
                        name !== state.compareRegionA
                )
                ||
                names[0]
            );


    state.compareQuadrantA =
        "north-west";

    state.compareQuadrantB =
        "south-east";


    state.compareClass =
        chooseAvailableComparisonClass(
            "admin1",
            state.compareRegionA,
            state.compareRegionB,
            "pine"
        );


    dom.quadrantSelect.value =
        state.quadrant;

    dom.admin1Select.value =
        state.admin1;

    dom.compareRegionA.value =
        state.compareRegionA;

    dom.compareRegionB.value =
        state.compareRegionB;

    dom.compareQuadrantA.value =
        state.compareQuadrantA;

    dom.compareQuadrantB.value =
        state.compareQuadrantB;

    dom.compareClassSelect.value =
        state.compareClass;

    dom.coverageMin.value =
        70;

    dom.coverageMax.value =
        100;

    dom.toggleTemporal.checked =
        true;

    dom.toggleSpatial.checked =
        true;

    dom.toggleRetrieval.checked =
        true;

    dom.toggleAdmin1.checked =
        true;

    dom.toggleQuadrants.checked =
        false;


    document
        .querySelectorAll(
            'input[data-forest-class]'
        )
        .forEach(
            input => {

                input.checked =
                    true;

            }
        );


    dom.mapSelectionCard
        .classList.add(
            "hidden"
        );


    if (
        state.map
        &&
        state.map.getLayer(
            "selected-poi"
        )
    ) {

        state.map.setFilter(
            "selected-poi",
            [
                "==",
                ["get", "cell_id"],
                "__none__"
            ]
        );

    }


    updateEverything();

    fitToFinland();

}


/* ==========================================================
   INITIALIZE
   ========================================================== */


async function initialize() {

    try {

        cacheDOM();

        await loadData();

        buildAdminSelectors();

        buildForestControls();

        bindEvents();

        initializeMap();


        state.map.once(
            "idle",
            () => {

                setTimeout(
                    () => {

                        dom.loadingScreen
                            .classList.add(
                                "loaded"
                            );

                    },
                    200
                );

            }
        );

    }


    catch (error) {

        console.error(error);


        document.getElementById(
            "loading-screen"
        ).innerHTML =
            `
            <div class="loading-title">
                Could not initialize explorer
            </div>

            <div
                class="loading-subtitle"
                style="
                    max-width:600px;
                    padding:20px;
                    text-align:center;
                "
            >
                ${error.message}
                <br><br>
                Open the browser developer console for details.
            </div>
            `;

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);
