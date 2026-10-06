"use strict";


/* ==========================================================
   FINNISH FOREST SIF EXPLORER
   ========================================================== */


const MONTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const MONTH_LABELS = [
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct"
];


let FOREST_CLASSES = [];


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

    // NOTEBOOK11_COMPARE_BY_ENVIRONMENT
    compareBy: "location",
    environmentCompareType: "koppen",

    // NOTEBOOK11_ENVIRONMENT_COMPARE_ACTIVE
    compareKoppenA: "Dfb",
    compareKoppenB: "Dfc",

    comparePeatlandAMin: 0,
    comparePeatlandAMax: 20,
    comparePeatlandBMin: 60,
    comparePeatlandBMax: 100,

    compareDrainageA: "drained",
    compareDrainageB: "undrained",

    compareClimateVariable: "temperature",

    compareClimateAMin: null,
    compareClimateAMax: null,
    compareClimateBMin: null,
    compareClimateBMax: null,

    scienceView: "signature",
    gridScale: "5km",
    scaleLoading: false,

    spatialMode: "finland",
    quadrant: "north-west",
    admin1: null,

    coverageMin: 70,
    coverageMax: 100,

    selectedClasses:
        new Set(),

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

        "compare-location-panel",
        "compare-environment-panel",

        "environment-koppen-controls",
        "environment-peatland-controls",
        "environment-drainage-controls",
        "environment-climate-controls",

        "compare-koppen-a",
        "compare-koppen-b",

        "compare-peatland-a-min",
        "compare-peatland-a-max",
        "compare-peatland-b-min",
        "compare-peatland-b-max",

        "compare-drainage-a",
        "compare-drainage-b",

        "compare-climate-variable",
        "compare-climate-a-min",
        "compare-climate-a-max",
        "compare-climate-b-min",
        "compare-climate-b-max",

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



/* ==========================================================
   NOTEBOOK11_BLOCK7_ENVIRONMENT
   LANDSCAPE + CLIMATE FILTERS
   ========================================================== */


const ENVIRONMENT_FILTER_DEFAULTS = Object.freeze({

    peatlandMin: 0,
    peatlandMax: 100,

    koppen: "all",

    vpdMin: 0.17,
    vpdMax: 0.38,

    snowMinCm: 0,
    snowMaxCm: 44,

    drainage: "all"

});


const environmentFilters = {

    peatlandMin:
        ENVIRONMENT_FILTER_DEFAULTS.peatlandMin,

    peatlandMax:
        ENVIRONMENT_FILTER_DEFAULTS.peatlandMax,

    koppen:
        ENVIRONMENT_FILTER_DEFAULTS.koppen,

    vpdMin:
        ENVIRONMENT_FILTER_DEFAULTS.vpdMin,

    vpdMax:
        ENVIRONMENT_FILTER_DEFAULTS.vpdMax,

    snowMinCm:
        ENVIRONMENT_FILTER_DEFAULTS.snowMinCm,

    snowMaxCm:
        ENVIRONMENT_FILTER_DEFAULTS.snowMaxCm,

    drainage:
        ENVIRONMENT_FILTER_DEFAULTS.drainage

};


function environmentCategoryEligible(
    value,
    selected
) {

    if (selected === "all") {
        return true;
    }

    if (selected === "unclassified") {

        return (
            value === null
            ||
            value === undefined
            ||
            String(value).trim() === ""
        );

    }

    return (
        String(value)
        === selected
    );

}


function environmentEligible(feature) {

    if (
        !feature
        ||
        !feature.properties
    ) {
        return false;
    }


    const properties =
        feature.properties;


    const peatland =
        Number(
            properties.total_peatland_fraction_mean
        )
        * 100;


    if (
        !Number.isFinite(peatland)
        ||
        peatland
            < environmentFilters.peatlandMin
        ||
        peatland
            > environmentFilters.peatlandMax
    ) {
        return false;
    }


    if (
        !environmentCategoryEligible(
            properties.koppen_class,
            environmentFilters.koppen
        )
    ) {
        return false;
    }


    const vpd =
        Number(
            properties.mean_vpd
        );


    if (
        !Number.isFinite(vpd)
        ||
        vpd
            < environmentFilters.vpdMin
        ||
        vpd
            > environmentFilters.vpdMax
    ) {
        return false;
    }


    const snowCm =
        Number(
            properties.mean_snow_depth
        )
        * 100;


    if (
        !Number.isFinite(snowCm)
        ||
        snowCm
            < environmentFilters.snowMinCm
        ||
        snowCm
            > environmentFilters.snowMaxCm
    ) {
        return false;
    }


    if (
        !environmentCategoryEligible(
            properties.dominant_site_drainage_status,
            environmentFilters.drainage
        )
    ) {
        return false;
    }


    return true;

}


function updateEnvironmentRangeUI(
    minId,
    maxId,
    trackId,
    badgeId,
    minimum,
    maximum,
    formatter
) {

    const minInput =
        document.getElementById(
            minId
        );

    const maxInput =
        document.getElementById(
            maxId
        );

    const track =
        document.getElementById(
            trackId
        );

    const badge =
        document.getElementById(
            badgeId
        );


    if (
        !minInput
        ||
        !maxInput
    ) {
        return;
    }


    minInput.value =
        String(minimum);

    maxInput.value =
        String(maximum);


    const domainMin =
        Number(
            minInput.min
        );

    const domainMax =
        Number(
            minInput.max
        );

    const width =
        domainMax
        - domainMin;


    let left = 0;
    let right = 100;


    if (
        Number.isFinite(width)
        &&
        width > 0
    ) {

        left =
            (
                (
                    minimum
                    - domainMin
                )
                / width
            )
            * 100;

        right =
            (
                (
                    maximum
                    - domainMin
                )
                / width
            )
            * 100;

    }


    left =
        Math.max(
            0,
            Math.min(
                100,
                left
            )
        );

    right =
        Math.max(
            0,
            Math.min(
                100,
                right
            )
        );


    if (track) {

        track.style.setProperty(
            "--range-left",
            `${left}%`
        );

        track.style.setProperty(
            "--range-right",
            `${right}%`
        );

    }


    if (badge) {

        badge.textContent =
            (
                formatter(minimum)
                + "–"
                + formatter(maximum)
            );

    }

}


function updateEnvironmentFilterUI() {

    updateEnvironmentRangeUI(
        "peatland-min",
        "peatland-max",
        "peatland-track",
        "peatland-badge",
        environmentFilters.peatlandMin,
        environmentFilters.peatlandMax,
        value => `${Math.round(value)}%`
    );


    updateEnvironmentRangeUI(
        "vpd-min",
        "vpd-max",
        "vpd-track",
        "vpd-badge",
        environmentFilters.vpdMin,
        environmentFilters.vpdMax,
        value => `${Number(value).toFixed(2)} kPa`
    );


    updateEnvironmentRangeUI(
        "snow-min",
        "snow-max",
        "snow-track",
        "snow-badge",
        environmentFilters.snowMinCm,
        environmentFilters.snowMaxCm,
        value => `${Math.round(value)} cm`
    );


    const koppen =
        document.getElementById(
            "koppen-filter"
        );


    if (koppen) {

        koppen.value =
            environmentFilters.koppen;

    }


    const drainage =
        document.getElementById(
            "drainage-filter"
        );


    if (drainage) {

        drainage.value =
            environmentFilters.drainage;

    }

}


function environmentFilterChanged() {

    updateEnvironmentFilterUI();

    clearExploreCell(
        false
    );

    validateCompareCells();

    updateEverything();

}


function bindEnvironmentRange(
    minId,
    maxId,
    minKey,
    maxKey
) {

    const minInput =
        document.getElementById(
            minId
        );

    const maxInput =
        document.getElementById(
            maxId
        );


    if (
        !minInput
        ||
        !maxInput
    ) {
        return;
    }


    minInput.addEventListener(
        "input",
        event => {

            let value =
                Number(
                    event.target.value
                );


            if (
                value
                > environmentFilters[maxKey]
            ) {

                value =
                    environmentFilters[maxKey];

            }


            environmentFilters[minKey] =
                value;

            event.target.value =
                String(value);

            environmentFilterChanged();

        }
    );


    maxInput.addEventListener(
        "input",
        event => {

            let value =
                Number(
                    event.target.value
                );


            if (
                value
                < environmentFilters[minKey]
            ) {

                value =
                    environmentFilters[minKey];

            }


            environmentFilters[maxKey] =
                value;

            event.target.value =
                String(value);

            environmentFilterChanged();

        }
    );

}


function resetEnvironmentFilters(
    refresh = true
) {

    environmentFilters.peatlandMin =
        ENVIRONMENT_FILTER_DEFAULTS.peatlandMin;

    environmentFilters.peatlandMax =
        ENVIRONMENT_FILTER_DEFAULTS.peatlandMax;

    environmentFilters.koppen =
        ENVIRONMENT_FILTER_DEFAULTS.koppen;

    environmentFilters.vpdMin =
        ENVIRONMENT_FILTER_DEFAULTS.vpdMin;

    environmentFilters.vpdMax =
        ENVIRONMENT_FILTER_DEFAULTS.vpdMax;

    environmentFilters.snowMinCm =
        ENVIRONMENT_FILTER_DEFAULTS.snowMinCm;

    environmentFilters.snowMaxCm =
        ENVIRONMENT_FILTER_DEFAULTS.snowMaxCm;

    environmentFilters.drainage =
        ENVIRONMENT_FILTER_DEFAULTS.drainage;


    updateEnvironmentFilterUI();


    if (refresh) {

        clearExploreCell(
            false
        );

        validateCompareCells();

        updateEverything();

    }

}


function bindEnvironmentFilters() {

    bindEnvironmentRange(
        "peatland-min",
        "peatland-max",
        "peatlandMin",
        "peatlandMax"
    );


    bindEnvironmentRange(
        "vpd-min",
        "vpd-max",
        "vpdMin",
        "vpdMax"
    );


    bindEnvironmentRange(
        "snow-min",
        "snow-max",
        "snowMinCm",
        "snowMaxCm"
    );


    const koppen =
        document.getElementById(
            "koppen-filter"
        );


    if (koppen) {

        koppen.addEventListener(
            "change",
            event => {

                environmentFilters.koppen =
                    event.target.value;

                environmentFilterChanged();

            }
        );

    }


    const drainage =
        document.getElementById(
            "drainage-filter"
        );


    if (drainage) {

        drainage.addEventListener(
            "change",
            event => {

                environmentFilters.drainage =
                    event.target.value;

                environmentFilterChanged();

            }
        );

    }


    const reset =
        document.getElementById(
            "reset-environment-filters"
        );


    if (reset) {

        reset.addEventListener(
            "click",
            () => {

                resetEnvironmentFilters(
                    true
                );

            }
        );

    }

}

function coverageEligible(feature) {

    const coverage =
        Number(
            feature.properties.min_productive_fraction
        )
        * 100;


    return (
        Number.isFinite(coverage)
        &&
        coverage >= state.coverageMin
        &&
        coverage <= state.coverageMax
        &&
        environmentEligible(feature)
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



async function fetchScaleData(scale) {

    const [
        cells,
        signature
    ] = await Promise.all([

        loadJSON(
            `data/cells_${scale}.geojson`
        ),

        loadCSV(
            `data/signature_${scale}.csv`
        )

    ]);


    return {
        cells,
        signature
    };

}


function applyScaleData(
    cells,
    signature
) {

    state.poisGeoJSON =
        cells;


    state.sifRows =
        signature.map(
            row => ({

                cell_id:
                    normalizeId(
                        row.cell_id
                    ),

                month:
                    Number(
                        row.month
                    ),

                mean_sif:
                    Number(
                        row.sif_mean
                    ),

                temporal_sd:
                    Number(
                        row.sif_interannual_sd
                    ),

                spatial_sd:
                    Number(
                        row.spatial_sd_mean
                    ),

                retrieval_uncertainty:
                    Number(
                        row.retrieval_uncertainty_mean
                    ),

                n_years:
                    Number(
                        row.n_years
                    ),

                sif_support_mean:
                    Number(
                        row.sif_support_mean
                    ),

                support90_fraction_of_available_years:
                    Number(
                        row.support90_fraction_of_available_years
                    ),

                support95_fraction_of_available_years:
                    Number(
                        row.support95_fraction_of_available_years
                    ),

                year_coverage_fraction:
                    Number(
                        row.year_coverage_fraction
                    )

            })
        );


    state.poiById =
        new Map();

    state.sifByPoi =
        new Map();


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
            normalizeId(
                row.cell_id
            );


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


    FOREST_CLASSES =
        [
            ...new Set(
                state.poisGeoJSON.features
                    .map(
                        feature =>
                            feature.properties
                                .stable_forest_class
                    )
                    .filter(
                        value =>
                            value !== null
                            &&
                            value !== undefined
                            &&
                            String(value).trim() !== ""
                    )
            )
        ]
        .sort();


    const pretty =
        value =>
            String(value)
                .replaceAll("_", " ")
                .replaceAll("-", "–")
                .replace(
                    /\b\w/g,
                    letter =>
                        letter.toUpperCase()
                );


    const palette = [
        "#176b3a",
        "#8ba83c",
        "#d29a39",
        "#8764a8",
        "#245348",
        "#4d7c5d",
        "#9b6b43"
    ];


    FOREST_CLASSES.forEach(
        (
            forestClass,
            index
        ) => {

            if (
                !FOREST_LABELS[
                    forestClass
                ]
            ) {

                FOREST_LABELS[
                    forestClass
                ] =
                    pretty(
                        forestClass
                    );

            }


            if (
                !FOREST_COLORS[
                    forestClass
                ]
            ) {

                FOREST_COLORS[
                    forestClass
                ] =
                    palette[
                        index
                        %
                        palette.length
                    ];

            }

        }
    );


    state.selectedClasses =
        new Set(
            FOREST_CLASSES
        );

}


async function loadData() {

    const [
        scaleData,
        admin0,
        admin1
    ] = await Promise.all([

        fetchScaleData(
            state.gridScale
        ),

        loadJSON(
            "data/admin0_finland.geojson"
        ),

        loadJSON(
            "data/admin1_finland.geojson"
        )

    ]);


    state.admin0GeoJSON =
        admin0;

    state.admin1GeoJSON =
        admin1;


    applyScaleData(
        scaleData.cells,
        scaleData.signature
    );


    const adminNames =
        getAdminNames();


    state.admin1 =
        adminNames.includes(
            "Lapland"
        )
            ? "Lapland"
            : adminNames[0];


    state.compareRegionA =
        adminNames.includes(
            "Lapland"
        )
            ? "Lapland"
            : adminNames[0];


    state.compareRegionB =
        adminNames.includes(
            "North Karelia"
        )
            ? "North Karelia"
            : (
                adminNames.find(
                    name =>
                        name
                        !== state.compareRegionA
                )
                ||
                adminNames[0]
            );


    state.compareClass =
        chooseAvailableComparisonClass(
            "admin1",
            state.compareRegionA,
            state.compareRegionB,
            FOREST_CLASSES[0]
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
                === quadrantDataCode(value)
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


/* ================================================================
   NOTEBOOK11_ENVIRONMENT_COMPARE_ACTIVE
   ================================================================ */


function comparisonNumberOrNull(value) {

    if (
        value === null
        ||
        value === undefined
        ||
        value === ""
    ) {
        return null;
    }


    const number =
        Number(value);


    return (
        Number.isFinite(number)
            ? number
            : null
    );

}


function comparisonRangeEligible(
    value,
    minimum,
    maximum
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {
        return false;
    }


    const min =
        comparisonNumberOrNull(
            minimum
        );


    const max =
        comparisonNumberOrNull(
            maximum
        );


    if (
        min !== null
        &&
        number < min
    ) {
        return false;
    }


    if (
        max !== null
        &&
        number > max
    ) {
        return false;
    }


    return true;

}


function comparisonKoppenValue(value) {

    if (
        value === null
        ||
        value === undefined
        ||
        String(value).trim() === ""
    ) {
        return "not-classified";
    }


    return String(value).trim();

}


function comparisonDrainageValue(value) {

    if (
        value === null
        ||
        value === undefined
        ||
        String(value).trim() === ""
    ) {
        return "not-classified";
    }


    const normalized =
        String(value)
            .trim()
            .toLowerCase();


    if (
        normalized.includes(
            "undrain"
        )
    ) {
        return "undrained";
    }


    if (
        normalized.includes(
            "drain"
        )
    ) {
        return "drained";
    }


    return "not-classified";

}


function comparisonProductiveEligible(feature) {

    if (
        !feature
        ||
        !feature.properties
    ) {
        return false;
    }


    const coverage =
        Number(
            feature.properties
                .min_productive_fraction
        )
        * 100;


    return (
        Number.isFinite(coverage)
        &&
        coverage >= state.coverageMin
        &&
        coverage <= state.coverageMax
    );

}


function comparisonEnvironmentBaseEligible(feature) {

    if (
        !feature
        ||
        !feature.properties
    ) {
        return false;
    }


    const properties =
        feature.properties;


    if (
        state.environmentCompareType
        !== "peatland"
    ) {

        const peatland =
            Number(
                properties
                    .total_peatland_fraction_mean
            )
            * 100;


        if (
            !Number.isFinite(peatland)
            ||
            peatland
                < environmentFilters.peatlandMin
            ||
            peatland
                > environmentFilters.peatlandMax
        ) {
            return false;
        }

    }


    if (
        state.environmentCompareType
        !== "koppen"
    ) {

        if (
            !environmentCategoryEligible(
                properties.koppen_class,
                environmentFilters.koppen
            )
        ) {
            return false;
        }

    }


    if (
        !(
            state.environmentCompareType
                === "climate"
            &&
            state.compareClimateVariable
                === "vpd"
        )
    ) {

        const vpd =
            Number(
                properties.mean_vpd
            );


        if (
            !Number.isFinite(vpd)
            ||
            vpd
                < environmentFilters.vpdMin
            ||
            vpd
                > environmentFilters.vpdMax
        ) {
            return false;
        }

    }


    if (
        !(
            state.environmentCompareType
                === "climate"
            &&
            state.compareClimateVariable
                === "snow"
        )
    ) {

        const snowCm =
            Number(
                properties.mean_snow_depth
            )
            * 100;


        if (
            !Number.isFinite(snowCm)
            ||
            snowCm
                < environmentFilters.snowMinCm
            ||
            snowCm
                > environmentFilters.snowMaxCm
        ) {
            return false;
        }

    }


    if (
        state.environmentCompareType
        !== "drainage"
    ) {

        if (
            !environmentCategoryEligible(
                properties
                    .dominant_site_drainage_status,
                environmentFilters.drainage
            )
        ) {
            return false;
        }

    }


    return true;

}


function comparisonEnvironmentEligible(feature) {

    return (
        comparisonProductiveEligible(
            feature
        )
        &&
        comparisonEnvironmentBaseEligible(
            feature
        )
    );

}


/* ================================================================
   NOTEBOOK11_CLIMATE_COMPARE_DEFAULTS
   ================================================================ */


function comparisonClimateValue(
    feature,
    variable = state.compareClimateVariable
) {

    if (
        !feature
        ||
        !feature.properties
    ) {
        return NaN;
    }


    const properties =
        feature.properties;


    if (
        variable === "temperature"
    ) {

        return Number(
            properties.mean_air_temperature
        );

    }


    if (
        variable === "vpd"
    ) {

        return Number(
            properties.mean_vpd
        );

    }


    if (
        variable === "snow"
    ) {

        const metres =
            Number(
                properties.mean_snow_depth
            );


        return (
            Number.isFinite(metres)
                ? metres * 100
                : NaN
        );

    }


    return NaN;

}


function comparisonClimatePrecision(
    variable = state.compareClimateVariable
) {

    if (
        variable === "temperature"
    ) {
        return 2;
    }


    if (
        variable === "vpd"
    ) {
        return 3;
    }


    if (
        variable === "snow"
    ) {
        return 1;
    }


    return 2;

}


function comparisonClimateStep(
    variable = state.compareClimateVariable
) {

    if (
        variable === "temperature"
    ) {
        return 0.01;
    }


    if (
        variable === "vpd"
    ) {
        return 0.001;
    }


    if (
        variable === "snow"
    ) {
        return 0.1;
    }


    return 0.01;

}


function comparisonClimateReferenceFeatures() {

    return state.poisGeoJSON.features
        .filter(
            feature => {

                return (
                    comparisonEnvironmentEligible(
                        feature
                    )
                    &&
                    feature.properties
                        .stable_forest_class
                        === state.compareClass
                );

            }
        );

}


function comparisonClimateStats() {

    const variable =
        state.compareClimateVariable;


    const values =
        comparisonClimateReferenceFeatures()
            .map(
                feature =>
                    comparisonClimateValue(
                        feature,
                        variable
                    )
            )
            .filter(
                value =>
                    Number.isFinite(value)
            );


    if (
        values.length === 0
    ) {

        return null;

    }


    let minimum =
        values[0];

    let maximum =
        values[0];

    let total =
        0;


    values.forEach(
        value => {

            minimum =
                Math.min(
                    minimum,
                    value
                );

            maximum =
                Math.max(
                    maximum,
                    value
                );

            total += value;

        }
    );


    return {
        minimum,
        maximum,
        mean:
            total / values.length,
        n:
            values.length
    };

}


function setClimateComparisonDefaults(
    refresh = true
) {

    if (
        state.compareBy
        !== "environment"
        ||
        state.environmentCompareType
        !== "climate"
    ) {
        return;
    }


    const stats =
        comparisonClimateStats();


    if (!stats) {

        state.compareClimateAMin =
            null;

        state.compareClimateAMax =
            null;

        state.compareClimateBMin =
            null;

        state.compareClimateBMax =
            null;


        dom.compareClimateAMin.value =
            "";

        dom.compareClimateAMax.value =
            "";

        dom.compareClimateBMin.value =
            "";

        dom.compareClimateBMax.value =
            "";


        if (refresh) {
            updateEverything();
        }


        return;

    }


    const variable =
        state.compareClimateVariable;


    const precision =
        comparisonClimatePrecision(
            variable
        );


    const step =
        comparisonClimateStep(
            variable
        );


    const minimum =
        Number(
            stats.minimum.toFixed(
                precision
            )
        );


    const maximum =
        Number(
            stats.maximum.toFixed(
                precision
            )
        );


    const mean =
        Number(
            stats.mean.toFixed(
                precision
            )
        );


    let upperStart =
        Number(
            (
                mean
                +
                step
            ).toFixed(
                precision
            )
        );


    if (
        upperStart > maximum
    ) {

        upperStart =
            mean;

    }


    state.compareClimateAMin =
        minimum;

    state.compareClimateAMax =
        mean;

    state.compareClimateBMin =
        upperStart;

    state.compareClimateBMax =
        maximum;


    dom.compareClimateAMin.value =
        minimum;

    dom.compareClimateAMax.value =
        mean;

    dom.compareClimateBMin.value =
        upperStart;

    dom.compareClimateBMax.value =
        maximum;


    if (
        dom.compareClimateAMin
    ) {

        dom.compareClimateAMin.step =
            String(step);

        dom.compareClimateAMax.step =
            String(step);

        dom.compareClimateBMin.step =
            String(step);

        dom.compareClimateBMax.step =
            String(step);

    }


    if (refresh) {
        updateEverything();
    }

}


function comparisonEnvironmentMatch(
    feature,
    side
) {

    if (
        !feature
        ||
        !feature.properties
    ) {
        return false;
    }


    const properties =
        feature.properties;


    if (
        state.environmentCompareType
        === "koppen"
    ) {

        const selected =
            side === "A"
                ? state.compareKoppenA
                : state.compareKoppenB;


        return (
            comparisonKoppenValue(
                properties.koppen_class
            )
            === selected
        );

    }


    if (
        state.environmentCompareType
        === "peatland"
    ) {

        const peatland =
            Number(
                properties
                    .total_peatland_fraction_mean
            )
            * 100;


        return comparisonRangeEligible(
            peatland,

            side === "A"
                ? state.comparePeatlandAMin
                : state.comparePeatlandBMin,

            side === "A"
                ? state.comparePeatlandAMax
                : state.comparePeatlandBMax
        );

    }


    if (
        state.environmentCompareType
        === "drainage"
    ) {

        const selected =
            side === "A"
                ? state.compareDrainageA
                : state.compareDrainageB;


        return (
            comparisonDrainageValue(
                properties
                    .dominant_site_drainage_status
            )
            === selected
        );

    }


    if (
        state.environmentCompareType
        === "climate"
    ) {

        let value;


        if (
            state.compareClimateVariable
            === "temperature"
        ) {

            value =
                Number(
                    properties
                        .mean_air_temperature
                );

        }


        else if (
            state.compareClimateVariable
            === "vpd"
        ) {

            value =
                Number(
                    properties.mean_vpd
                );

        }


        else if (
            state.compareClimateVariable
            === "snow"
        ) {

            value =
                Number(
                    properties.mean_snow_depth
                )
                * 100;

        }


        else {
            return false;
        }


        return comparisonRangeEligible(
            value,

            side === "A"
                ? state.compareClimateAMin
                : state.compareClimateBMin,

            side === "A"
                ? state.compareClimateAMax
                : state.compareClimateBMax
        );

    }


    return false;

}


function comparisonEnvironmentFeatures(side) {

    return state.poisGeoJSON.features
        .filter(
            feature => {

                return (
                    comparisonEnvironmentEligible(
                        feature
                    )
                    &&
                    feature.properties
                        .stable_forest_class
                        === state.compareClass
                    &&
                    comparisonEnvironmentMatch(
                        feature,
                        side
                    )
                );

            }
        );

}


function comparisonEnvironmentSideName(side) {

    if (
        state.environmentCompareType
        === "koppen"
    ) {

        const value =
            side === "A"
                ? state.compareKoppenA
                : state.compareKoppenB;


        return (
            value === "not-classified"
                ? "Köppen · Not classified"
                : `Köppen · ${value}`
        );

    }


    if (
        state.environmentCompareType
        === "peatland"
    ) {

        const minimum =
            side === "A"
                ? state.comparePeatlandAMin
                : state.comparePeatlandBMin;


        const maximum =
            side === "A"
                ? state.comparePeatlandAMax
                : state.comparePeatlandBMax;


        return (
            `Peatland · ${minimum}–${maximum}%`
        );

    }


    if (
        state.environmentCompareType
        === "drainage"
    ) {

        const value =
            side === "A"
                ? state.compareDrainageA
                : state.compareDrainageB;


        const labels = {
            drained: "Drained",
            undrained: "Undrained",
            "not-classified": "Not classified"
        };


        return (
            `Drainage · ${
                labels[value] || value
            }`
        );

    }


    const variableLabels = {
        temperature: "Air temperature",
        vpd: "VPD",
        snow: "Snow depth"
    };


    const units = {
        temperature: "°C",
        vpd: "kPa",
        snow: "cm"
    };


    const minimum =
        side === "A"
            ? state.compareClimateAMin
            : state.compareClimateBMin;


    const maximum =
        side === "A"
            ? state.compareClimateAMax
            : state.compareClimateBMax;


    const minimumLabel =
        minimum === null
            ? "open"
            : minimum;


    const maximumLabel =
        maximum === null
            ? "open"
            : maximum;


    return (
        `${variableLabels[state.compareClimateVariable]}`
        +
        ` · ${minimumLabel}–${maximumLabel}`
        +
        ` ${units[state.compareClimateVariable]}`
    );

}


function syncEnvironmentComparisonState() {

    state.compareKoppenA =
        dom.compareKoppenA.value;

    state.compareKoppenB =
        dom.compareKoppenB.value;


    state.comparePeatlandAMin =
        Number(
            dom.comparePeatlandAMin.value
        );

    state.comparePeatlandAMax =
        Number(
            dom.comparePeatlandAMax.value
        );

    state.comparePeatlandBMin =
        Number(
            dom.comparePeatlandBMin.value
        );

    state.comparePeatlandBMax =
        Number(
            dom.comparePeatlandBMax.value
        );


    state.compareDrainageA =
        dom.compareDrainageA.value;

    state.compareDrainageB =
        dom.compareDrainageB.value;


    state.compareClimateVariable =
        dom.compareClimateVariable.value;


    state.compareClimateAMin =
        comparisonNumberOrNull(
            dom.compareClimateAMin.value
        );

    state.compareClimateAMax =
        comparisonNumberOrNull(
            dom.compareClimateAMax.value
        );

    state.compareClimateBMin =
        comparisonNumberOrNull(
            dom.compareClimateBMin.value
        );

    state.compareClimateBMax =
        comparisonNumberOrNull(
            dom.compareClimateBMax.value
        );

}


function updateEnvironmentComparison() {

    syncEnvironmentComparisonState();

    updateEverything();

}


function comparisonFeatures(side) {

    if (
        state.compareBy
        === "environment"
    ) {

        return comparisonEnvironmentFeatures(
            side
        );

    }


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




const QUADRANT_DATA_CODES = Object.freeze({

    "north-west": "NW",
    "north-east": "NE",
    "south-west": "SW",
    "south-east": "SE",

    "NW": "NW",
    "NE": "NE",
    "SW": "SW",
    "SE": "SE"

});


function quadrantDataCode(value) {

    if (
        value === null
        ||
        value === undefined
    ) {
        return null;
    }

    return (
        QUADRANT_DATA_CODES[value]
        ||
        null
    );

}


function buildQuadrantGeoJSON() {

    return {

        type:
            "FeatureCollection",

        features:
            []

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

                    ...FOREST_CLASSES.flatMap(
                        forestClass => [
                            forestClass,
                            FOREST_COLORS[
                                forestClass
                            ]
                        ]
                    ),

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
        state.compareBy === "location"
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
                === quadrantDataCode(quadrant)
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
                p.geo_quadrant !==
                quadrantDataCode(state.quadrant)
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




function notebook11ValidTimeSeriesRow(
    row
) {

    const year =
        Number(
            row?.year
        );

    const month =
        Number(
            row?.month
        );

    const sif =
        Number(
            row?.sif
            ??
            row?.mean
            ??
            row?.mean_sif
        );


    return (
        Number.isFinite(year)
        &&
        year >= 2019
        &&
        year <= 2025
        &&
        Number.isFinite(month)
        &&
        month >= 1
        &&
        month <= 12
        &&
        month !== 2
        &&
        Number.isFinite(sif)
    );

}


function notebook11CalendarDate(
    year,
    month
) {

    return (
        `${year}-${String(month).padStart(2, "0")}-15`
    );

}


function notebook11CalendarSeries(
    rows,
    valueAccessor,
    errorAccessor = null
) {

    const source =
        new Map();


    for (
        const row
        of (
            Array.isArray(rows)
                ?
                rows
                :
                []
        )
    ) {

        const year =
            Number(
                row.year
            );


        const month =
            Number(
                row.month
            );


        if (
            !Number.isInteger(year)
            ||
            year < 2019
            ||
            year > 2025
            ||
            month < 3
            ||
            month > 10
        ) {
            continue;
        }


        source.set(
            `${year}-${String(month).padStart(2, "0")}`,
            row
        );

    }


    const x =
        [];


    const y =
        [];


    const error =
        [];


    for (
        let year = 2019;
        year <= 2025;
        year += 1
    ) {

        for (
            let month = 1;
            month <= 12;
            month += 1
        ) {

            x.push(
                `${year}-${String(month).padStart(2, "0")}-15`
            );


            if (
                month < 3
                ||
                month > 10
            ) {

                y.push(null);
                error.push(null);
                continue;

            }


            const row =
                source.get(
                    `${year}-${String(month).padStart(2, "0")}`
                );


            if (!row) {

                y.push(null);
                error.push(null);
                continue;

            }


            const rawValue =
                valueAccessor(
                    row
                );


            const value =
                (
                    rawValue === null
                    ||
                    rawValue === undefined
                    ||
                    rawValue === ""
                )
                    ?
                    NaN
                    :
                    Number(
                        rawValue
                    );


            if (
                !Number.isFinite(value)
            ) {

                y.push(null);
                error.push(null);
                continue;

            }


            y.push(
                value
            );


            if (!errorAccessor) {

                error.push(null);
                continue;

            }


            const rawError =
                errorAccessor(
                    row
                );


            const uncertainty =
                (
                    rawError === null
                    ||
                    rawError === undefined
                    ||
                    rawError === ""
                )
                    ?
                    NaN
                    :
                    Number(
                        rawError
                    );


            error.push(
                Number.isFinite(
                    uncertainty
                )
                    ?
                    uncertainty
                    :
                    null
            );

        }

    }


    return {
        x,
        y,
        error
    };

}


function calculateSummaryForFeatures(
    features
) {

    const signatureMonths =
        [3, 4, 5, 6, 7, 8, 9, 10];


    const validFeatures =
        features.filter(
            Boolean
        );


    const ids =
        new Set(
            validFeatures.map(
                feature =>
                    normalizeId(
                        feature.properties.cell_id
                    )
            )
        );


    const selectedRows =
        state.sifRows.filter(
            row =>
                signatureMonths.includes(
                    Number(row.month)
                )
                &&
                ids.has(
                    normalizeId(
                        row.cell_id
                    )
                )
        );


    const buckets =
        new Map();


    for (
        const month
        of signatureMonths
    ) {

        buckets.set(
            month,
            {
                mean: [],
                temporal: [],
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
            Number(
                row.month
            );


        const bucket =
            buckets.get(
                month
            );


        if (!bucket) {
            continue;
        }


        const values = {

            mean:
                Number(
                    row.mean_sif
                ),

            temporal:
                Number(
                    row.temporal_sd
                ),

            spatial:
                Number(
                    row.spatial_sd
                ),

            retrieval:
                Number(
                    row.retrieval_uncertainty
                )

        };


        for (
            const [
                key,
                value
            ]
            of Object.entries(values)
        ) {

            if (
                Number.isFinite(value)
            ) {

                bucket[key].push(
                    value
                );

            }

        }

    }


    const resultFor =
        key =>
            signatureMonths.map(
                month =>
                    mean(
                        buckets.get(month)[key]
                    )
            );


    return {

        months:
            signatureMonths,

        mean:
            resultFor("mean"),

        temporal:
            resultFor("temporal"),

        spatial:
            resultFor("spatial"),

        retrieval:
            resultFor("retrieval"),

        nPois:
            validFeatures.length,

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


    const monthNames = {
        3: "Mar",
        4: "Apr",
        5: "May",
        6: "Jun",
        7: "Jul",
        8: "Aug",
        9: "Sep",
        10: "Oct"
    };


    const months =
        Array.isArray(values.months)
            ?
            values.months
            :
            [3, 4, 5, 6, 7, 8, 9, 10];


    const x =
        months.map(
            month =>
                monthNames[
                    Number(month)
                ]
        );


    const finiteOrNull =
        value => {

            if (
                value === null
                ||
                value === undefined
                ||
                value === ""
            ) {
                return null;
            }


            const n =
                Number(value);


            return Number.isFinite(n)
                ?
                n
                :
                null;

        };


    const meanValues =
        values.mean.map(
            finiteOrNull
        );


    const temporalValues =
        values.temporal.map(
            finiteOrNull
        );


    const spatialValues =
        values.spatial.map(
            finiteOrNull
        );


    const retrievalValues =
        values.retrieval.map(
            finiteOrNull
        );


    if (
        state.showTemporal
    ) {

        const lower =
            meanValues.map(
                (
                    value,
                    index
                ) => {

                    const spread =
                        temporalValues[index];


                    return (
                        value !== null
                        &&
                        spread !== null
                    )
                        ?
                        value - spread
                        :
                        null;

                }
            );


        const upper =
            meanValues.map(
                (
                    value,
                    index
                ) => {

                    const spread =
                        temporalValues[index];


                    return (
                        value !== null
                        &&
                        spread !== null
                    )
                        ?
                        value + spread
                        :
                        null;

                }
            );


        traces.push(
            {
                x,
                y: lower,
                type: "scatter",
                mode: "lines",
                connectgaps: false,
                line: {
                    width: 0
                },
                hoverinfo: "skip",
                showlegend: false,
                legendgroup:
                    `${name}-temporal`
            }
        );


        traces.push(
            {
                x,
                y: upper,
                type: "scatter",
                mode: "lines",
                connectgaps: false,
                line: {
                    width: 0
                },
                fill: "tonexty",
                fillcolor:
                    hexToRGBA(
                        color,
                        0.13
                    ),
                hoverinfo: "skip",
                showlegend: false,
                legendgroup:
                    `${name}-temporal`
            }
        );

    }


    if (
        state.showSpatial
    ) {

        const lower =
            meanValues.map(
                (
                    value,
                    index
                ) => {

                    const spread =
                        spatialValues[index];


                    return (
                        value !== null
                        &&
                        spread !== null
                    )
                        ?
                        value - spread
                        :
                        null;

                }
            );


        const upper =
            meanValues.map(
                (
                    value,
                    index
                ) => {

                    const spread =
                        spatialValues[index];


                    return (
                        value !== null
                        &&
                        spread !== null
                    )
                        ?
                        value + spread
                        :
                        null;

                }
            );


        traces.push(
            {
                x,
                y: upper,
                type: "scatter",
                mode: "lines",
                connectgaps: false,
                line: {
                    color,
                    width: 1.1,
                    dash: "dash"
                },
                opacity: 0.62,
                hoverinfo: "skip",
                showlegend: false,
                legendgroup:
                    `${name}-spatial`
            }
        );


        traces.push(
            {
                x,
                y: lower,
                type: "scatter",
                mode: "lines",
                connectgaps: false,
                line: {
                    color,
                    width: 1.1,
                    dash: "dash"
                },
                opacity: 0.62,
                hoverinfo: "skip",
                showlegend: false,
                legendgroup:
                    `${name}-spatial`
            }
        );

    }


    const meanTrace = {

        x,

        y:
            meanValues,

        type:
            "scatter",

        mode:
            "lines+markers",

        name:
            `${name} · n=${values.nPois}`,

        legendgroup:
            name,

        connectgaps:
            false,

        line: {
            color,
            width: 2.8
        },

        marker: {
            size: 7,
            color: "#ffffff",
            line: {
                color,
                width: 2
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
                retrievalValues,

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
        state.compareBy
        === "environment"
    ) {

        return comparisonEnvironmentSideName(
            side
        );

    }


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
        state.compareBy === "location"
        &&
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
        (
            state.compareBy === "environment"
            ||
            state.compareType !== "cell"
        )
    ) {

        smallSides.push(
            `A n=${summaryA.nPois}`
        );

    }


    if (
        summaryB.nPois < 10
        &&
        (
            state.compareBy === "environment"
            ||
            state.compareType !== "cell"
        )
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

    enrichSelectedCell(
        p.cell_id
    );

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
        state.compareBy === "location"
        &&
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



// NOTEBOOK11_COMPARE_BY_ENVIRONMENT
function updateCompareByUI() {

    document
        .querySelectorAll(
            ".compare-by"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.compareBy
                    === state.compareBy
                );

            }
        );


    const location =
        state.compareBy === "location";


    dom.compareLocationPanel
        .classList.toggle(
            "hidden",
            !location
        );


    dom.compareEnvironmentPanel
        .classList.toggle(
            "hidden",
            location
        );


    document
        .querySelectorAll(
            ".environment-type"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.environmentType
                    === state.environmentCompareType
                );

            }
        );


    const panels = {
        koppen:
            dom.environmentKoppenControls,

        peatland:
            dom.environmentPeatlandControls,

        drainage:
            dom.environmentDrainageControls,

        climate:
            dom.environmentClimateControls
    };


    Object.entries(
        panels
    )
        .forEach(
            ([type, element]) => {

                element.classList.toggle(
                    "hidden",
                    type
                    !== state.environmentCompareType
                );

            }
        );

}


function updateCompareTypeUI() {

    updateCompareByUI();


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
            state.compareBy !== "location"
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



/* ==========================================================
   SCIENCE VIEW + SCALE
   ========================================================== */

const timeSeriesIndexCache =
    new Map();

const timeSeriesShardCache =
    new Map();

const timeSeriesCellCache =
    new Map();


function currentScaleLabel() {

    return (
        state.gridScale
        === "5km"
            ? "5 × 5 km"
            : "10 × 10 km"
    );

}


function prettyForestClass(
    value
) {

    return (
        FOREST_LABELS[
            value
        ]
        ||
        String(
            value || "—"
        )
        .replaceAll(
            "_",
            " "
        )
        .replaceAll(
            "-",
            "–"
        )
    );

}


function updateScienceUI() {

    document
        .querySelectorAll(
            "[data-science-view]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset
                        .scienceView
                    ===
                    state.scienceView
                );

            }
        );


    document
        .querySelectorAll(
            "[data-grid-scale]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset
                        .gridScale
                    ===
                    state.gridScale
                );

                button.disabled =
                    state.scaleLoading;

            }
        );


    const scaleLabel =
        document.getElementById(
            "grid-scale-label"
        );


    if (scaleLabel) {

        scaleLabel.textContent =
            `${currentScaleLabel()} cells`;

    }


    if (
        dom.mapSubtitle
    ) {

        dom.mapSubtitle.textContent =
            state.scienceView
            === "signature"
                ?
                `Click a ${currentScaleLabel()} cell for seasonal SIF`
                :
                `Click a ${currentScaleLabel()} cell for its 2019–2025 SIF time series`;

    }



    if (dom.toggleTemporal) {

        const temporalRow =
            dom.toggleTemporal.closest(
                ".toggle-row, .compact-toggle"
            );


        dom.toggleTemporal.disabled =
            (
                state.scienceView
                === "timeseries"
            );


        if (temporalRow) {

            temporalRow.style.display =
                (
                    state.scienceView
                    === "timeseries"
                )
                    ?
                    "none"
                    :
                    "";

        }

    }

}


function rebuildForestLegend() {

    if (
        !dom.exploreMapLegend
    ) {
        return;
    }


    dom.exploreMapLegend.innerHTML =
        '<div class="legend-title">Forest class</div>';


    for (
        const forestClass
        of FOREST_CLASSES
    ) {

        const item =
            document.createElement(
                "div"
            );

        item.className =
            "map-legend-item";

        item.dataset.legendClass =
            forestClass;


        item.innerHTML =
            `
            <span
                class="legend-swatch"
                style="background:${FOREST_COLORS[forestClass]}"
            ></span>
            ${prettyForestClass(forestClass)}
            `;


        dom.exploreMapLegend
            .appendChild(
                item
            );

    }

}


async function setGridScale(
    scale
) {

    if (
        scale
        === state.gridScale
        ||
        state.scaleLoading
    ) {
        return;
    }


    state.scaleLoading =
        true;

    updateScienceUI();


    try {

        const scaleData =
            await fetchScaleData(
                scale
            );


        state.gridScale =
            scale;


        state.selectedCell =
            null;

        state.compareCellA =
            null;

        state.compareCellB =
            null;


        applyScaleData(
            scaleData.cells,
            scaleData.signature
        );


        const adminNames =
            getAdminNames();


        if (
            !adminNames.includes(
                state.admin1
            )
        ) {

            state.admin1 =
                adminNames[0];

        }


        if (
            !adminNames.includes(
                state.compareRegionA
            )
        ) {

            state.compareRegionA =
                adminNames[0];

        }


        if (
            !adminNames.includes(
                state.compareRegionB
            )
        ) {

            state.compareRegionB =
                adminNames.find(
                    name =>
                        name
                        !==
                        state.compareRegionA
                )
                ||
                adminNames[0];

        }


        state.compareClass =
            chooseAvailableComparisonClass(
                "admin1",
                state.compareRegionA,
                state.compareRegionB,
                FOREST_CLASSES[0]
            );


        buildAdminSelectors();
        buildForestControls();
        rebuildForestLegend();


        if (
            state.map
            &&
            state.map.getSource(
                "pois"
            )
        ) {

            state.map
                .getSource(
                    "pois"
                )
                .setData(
                    state.poisGeoJSON
                );

        }


        if (
            state.map
            &&
            state.map.getSource(
                "quadrant-lines"
            )
        ) {

            state.map
                .getSource(
                    "quadrant-lines"
                )
                .setData(
                    buildQuadrantGeoJSON()
                );

        }


        if (
            state.map
            &&
            state.map.getLayer(
                "pois-fill"
            )
        ) {

            state.map.setPaintProperty(
                "pois-fill",
                "fill-color",
                [
                    "match",
                    [
                        "get",
                        "stable_forest_class"
                    ],
                    ...FOREST_CLASSES.flatMap(
                        forestClass => [
                            forestClass,
                            FOREST_COLORS[
                                forestClass
                            ]
                        ]
                    ),
                    "#777777"
                ]
            );

        }


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
                    [
                        "get",
                        "cell_id"
                    ],
                    "__none__"
                ]
            );

        }


        dom.mapSelectionCard
            .classList.add(
                "hidden"
            );


        updateEverything();
        fitToFinland();

    }


    catch (error) {

        console.error(
            error
        );


        showEmptyState(
            "Could not switch grid scale",
            "Please try the scale control again."
        );

    }


    finally {

        state.scaleLoading =
            false;

        updateScienceUI();

    }

}


function setScienceView(
    view
) {

    if (
        view
        === state.scienceView
    ) {
        return;
    }


    state.scienceView =
        view;

    updateScienceUI();
    updateCurrentChart();

}


/* ==========================================================
   LAZY TIME SERIES
   ========================================================== */


/* NOTEBOOK 11 BLOCK 10C START */

    new Set(
        [2]
    );














function notebook11ParseYearMonth(
    value
) {

    if (
        typeof value
        === "string"
    ) {

        const match =
            value.match(
                /^(\d{4})-(\d{1,2})(?:-\d{1,2})?/
            );


        if (match) {

            const year =
                Number(
                    match[1]
                );

            const month =
                Number(
                    match[2]
                );


            if (
                Number.isFinite(year)
                &&
                Number.isFinite(month)
                &&
                month >= 1
                &&
                month <= 12
            ) {

                return {
                    year,
                    month
                };

            }

        }

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return {

        year:
            date.getUTCFullYear(),

        month:
            date.getUTCMonth()
            +
            1

    };

}

















/* NOTEBOOK 11 BLOCK 10C END */


async function getTimeSeriesIndex() {

    const scale =
        state.gridScale;


    if (
        timeSeriesIndexCache.has(
            scale
        )
    ) {

        return timeSeriesIndexCache.get(
            scale
        );

    }


    const response =
        await fetch(
            `data/timeseries/${scale}/index.json`
        );


    if (!response.ok) {

        throw new Error(
            "Time-series index unavailable."
        );

    }


    const index =
        await response.json();


    timeSeriesIndexCache.set(
        scale,
        index
    );


    return index;

}


function rowId(
    row
) {

    return normalizeId(
        row.cell_id
        ??
        row.cell_id_5km
        ??
        row.cell_id_10km
        ??
        ""
    );

}


function rowsForCell(
    payload,
    cellId
) {

    const id =
        normalizeId(
            cellId
        );


    if (
        Array.isArray(
            payload
        )
    ) {

        return payload.filter(
            row =>
                rowId(row)
                === id
        );

    }


    if (
        payload
        &&
        typeof payload
        === "object"
    ) {

        if (
            Object.prototype
                .hasOwnProperty
                .call(
                    payload,
                    id
                )
        ) {

            const value =
                payload[id];


            if (
                Array.isArray(
                    value
                )
            ) {
                return value;
            }


            if (
                value
                &&
                Array.isArray(
                    value.rows
                )
            ) {
                return value.rows;
            }

        }


        if (
            Array.isArray(
                payload.rows
            )
        ) {

            return payload.rows.filter(
                row =>
                    rowId(row)
                    === id
            );

        }

    }


    return [];

}


async function loadCellTimeSeries(
    cellId
) {

    const normalized =
        normalizeId(
            cellId
        );


    const scale =
        state.gridScale;


    const cacheKey =
        `${scale}:${normalized}`;


    if (
        timeSeriesCellCache.has(
            cacheKey
        )
    ) {

        return timeSeriesCellCache.get(
            cacheKey
        );

    }


    const index =
        await getTimeSeriesIndex();


    const shard =
        index[
            normalized
        ];


    if (
        shard === undefined
        ||
        shard === null
    ) {

        timeSeriesCellCache.set(
            cacheKey,
            []
        );


        return [];

    }


    const shardKey =
        `${scale}:${shard}`;


    let payload =
        timeSeriesShardCache.get(
            shardKey
        );


    if (!payload) {

        const response =
            await fetch(
                `data/timeseries/${scale}/${shard}.json`
            );


        if (!response.ok) {

            throw new Error(
                `Could not load Time-series shard ${shard}.`
            );

        }


        payload =
            await response.json();


        timeSeriesShardCache.set(
            shardKey,
            payload
        );

    }


    const sourceRows =
        Array.isArray(
            payload[
                normalized
            ]
        )
            ?
            payload[
                normalized
            ]
            :
            [];


    const rows =
        sourceRows
        .filter(
            row => {

                const year =
                    Number(
                        row.year
                    );


                const month =
                    Number(
                        row.month
                    );


                const rawSif =
                    row.sif;


                const sif =
                    (
                        rawSif === null
                        ||
                        rawSif === undefined
                        ||
                        rawSif === ""
                    )
                        ?
                        NaN
                        :
                        Number(
                            rawSif
                        );


                return (
                    Number.isInteger(year)
                    &&
                    year >= 2019
                    &&
                    year <= 2025
                    &&
                    month >= 3
                    &&
                    month <= 10
                    &&
                    Number.isFinite(sif)
                );

            }
        )
        .sort(
            (
                a,
                b
            ) => {

                const yearDifference =
                    Number(a.year)
                    -
                    Number(b.year);


                if (
                    yearDifference !== 0
                ) {

                    return yearDifference;

                }


                return (
                    Number(a.month)
                    -
                    Number(b.month)
                );

            }
        );


    timeSeriesCellCache.set(
        cacheKey,
        rows
    );


    return rows;

}




/* ==========================================================
   TREND STATISTICS
   ========================================================== */

function logGamma(z) {

    const c = [
        676.5203681218851,
        -1259.1392167224028,
        771.3234287776531,
        -176.6150291621406,
        12.507343278686905,
        -0.13857109526572012,
        9.984369578019571e-6,
        1.5056327351493116e-7
    ];


    if (z < 0.5) {

        return (
            Math.log(
                Math.PI
            )
            -
            Math.log(
                Math.sin(
                    Math.PI * z
                )
            )
            -
            logGamma(
                1 - z
            )
        );

    }


    z -= 1;


    let x =
        0.9999999999998099;


    for (
        let i = 0;
        i < c.length;
        i += 1
    ) {

        x +=
            c[i]
            /
            (
                z
                +
                i
                +
                1
            );

    }


    const t =
        z
        +
        c.length
        -
        0.5;


    return (
        0.5
        *
        Math.log(
            2 * Math.PI
        )
        +
        (
            z + 0.5
        )
        *
        Math.log(t)
        -
        t
        +
        Math.log(x)
    );

}


function betaFraction(
    a,
    b,
    x
) {

    const tiny =
        1e-30;

    let qab =
        a + b;

    let qap =
        a + 1;

    let qam =
        a - 1;

    let c =
        1;

    let d =
        1
        -
        qab
        *
        x
        /
        qap;


    if (
        Math.abs(d)
        < tiny
    ) {
        d = tiny;
    }


    d =
        1 / d;


    let h =
        d;


    for (
        let m = 1;
        m <= 200;
        m += 1
    ) {

        const m2 =
            2 * m;


        let aa =
            m
            *
            (
                b - m
            )
            *
            x
            /
            (
                (
                    qam + m2
                )
                *
                (
                    a + m2
                )
            );


        d =
            1
            +
            aa
            *
            d;


        if (
            Math.abs(d)
            < tiny
        ) {
            d = tiny;
        }


        c =
            1
            +
            aa
            /
            c;


        if (
            Math.abs(c)
            < tiny
        ) {
            c = tiny;
        }


        d =
            1 / d;

        h *=
            d * c;


        aa =
            -
            (
                a + m
            )
            *
            (
                qab + m
            )
            *
            x
            /
            (
                (
                    a + m2
                )
                *
                (
                    qap + m2
                )
            );


        d =
            1
            +
            aa
            *
            d;


        if (
            Math.abs(d)
            < tiny
        ) {
            d = tiny;
        }


        c =
            1
            +
            aa
            /
            c;


        if (
            Math.abs(c)
            < tiny
        ) {
            c = tiny;
        }


        d =
            1 / d;


        const delta =
            d * c;


        h *=
            delta;


        if (
            Math.abs(
                delta - 1
            )
            < 3e-12
        ) {
            break;
        }

    }


    return h;

}


function regularizedBeta(
    x,
    a,
    b
) {

    if (x <= 0) {
        return 0;
    }

    if (x >= 1) {
        return 1;
    }


    const bt =
        Math.exp(
            logGamma(
                a + b
            )
            -
            logGamma(a)
            -
            logGamma(b)
            +
            a
            *
            Math.log(x)
            +
            b
            *
            Math.log(
                1 - x
            )
        );


    if (
        x
        <
        (
            a + 1
        )
        /
        (
            a + b + 2
        )
    ) {

        return (
            bt
            *
            betaFraction(
                a,
                b,
                x
            )
            /
            a
        );

    }


    return (
        1
        -
        bt
        *
        betaFraction(
            b,
            a,
            1 - x
        )
        /
        b
    );

}


function trendStatistics(
    rows
) {

    const points =
        rows
        .filter(
            row => {

                const year =
                    Number(
                        row.year
                    );

                const month =
                    Number(
                        row.month
                    );

                const value =
                    Number(
                        row.sif
                        ??
                        row.mean
                        ??
                        row.mean_sif
                    );


                return (
                    Number.isFinite(year)
                    &&
                    year >= 2019
                    &&
                    year <= 2025
                    &&
                    Number.isFinite(month)
                    &&
                    month >= 1
                    &&
                    month <= 12
                    &&
                    month !== 2
                    &&
                    Number.isFinite(value)
                );

            }
        )
        .map(
            row => ({

                x:
                    Number(
                        row.year
                    )
                    +
                    (
                        Number(
                            row.month
                        )
                        -
                        1
                    )
                    /
                    12,

                y:
                    Number(
                        row.sif
                        ??
                        row.mean
                        ??
                        row.mean_sif
                    )

            })
        );


    const n =
        points.length;


    if (
        n < 3
    ) {

        return {
            n,
            slope:
                NaN,
            intercept:
                NaN,
            r2:
                NaN,
            p:
                NaN
        };

    }


    const mx =
        mean(
            points.map(
                point =>
                    point.x
            )
        );


    const my =
        mean(
            points.map(
                point =>
                    point.y
            )
        );


    let sxx = 0;
    let syy = 0;
    let sxy = 0;


    for (
        const point
        of points
    ) {

        const dx =
            point.x - mx;

        const dy =
            point.y - my;

        sxx +=
            dx * dx;

        syy +=
            dy * dy;

        sxy +=
            dx * dy;

    }


    const slope =
        sxx > 0
            ?
            sxy / sxx
            :
            NaN;


    const intercept =
        Number.isFinite(
            slope
        )
            ?
            my
            -
            slope
            *
            mx
            :
            NaN;


    const r2 =
        (
            sxx > 0
            &&
            syy > 0
        )
            ?
            (
                sxy * sxy
                /
                (
                    sxx * syy
                )
            )
            :
            NaN;


    let sse = 0;


    if (
        Number.isFinite(
            slope
        )
        &&
        Number.isFinite(
            intercept
        )
    ) {

        for (
            const point
            of points
        ) {

            const residual =
                point.y
                -
                (
                    intercept
                    +
                    slope
                    *
                    point.x
                );

            sse +=
                residual * residual;

        }

    }


    const df =
        n - 2;


    const se =
        (
            df > 0
            &&
            sxx > 0
        )
            ?
            Math.sqrt(
                (
                    sse / df
                )
                /
                sxx
            )
            :
            NaN;


    const t =
        (
            Number.isFinite(
                se
            )
            &&
            se > 0
            &&
            Number.isFinite(
                slope
            )
        )
            ?
            Math.abs(
                slope / se
            )
            :
            NaN;


    const p =
        Number.isFinite(
            t
        )
            ?
            regularizedBeta(
                df
                /
                (
                    df
                    +
                    t * t
                ),
                df / 2,
                0.5
            )
            :
            NaN;


    return {
        n,
        slope,
        intercept,
        r2,
        p
    };

}




function fmt(
    value,
    digits = 3
) {

    return Number.isFinite(
        value
    )
        ?
        value.toFixed(
            digits
        )
        :
        "—";

}


function fmtP(value) {

    if (
        !Number.isFinite(
            value
        )
    ) {
        return "—";
    }


    return value < 0.001
        ?
        "< 0.001"
        :
        value.toFixed(3);

}


/* ==========================================================
   TIME-SERIES CHART
   ========================================================== */

/* ==========================================================
   NOTEBOOK 11 — GROUP TIME SERIES
   ========================================================== */

const groupTimeSeriesCache =
    new Map();


async function getGroupTimeSeriesRows() {

    const scale =
        state.gridScale;


    if (
        groupTimeSeriesCache.has(
            scale
        )
    ) {

        return groupTimeSeriesCache.get(
            scale
        );

    }


    const promise =
        fetch(
            `data/group_timeseries/${scale}.json`
        )
        .then(
            response => {

                if (!response.ok) {

                    throw new Error(
                        "Group time-series package unavailable."
                    );

                }

                return response.json();

            }
        );


    groupTimeSeriesCache.set(
        scale,
        promise
    );


    return promise;

}


function groupRowsForFeatures(
    rows,
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


    return rows.filter(
        row =>
            ids.has(
                normalizeId(
                    row.cell_id
                )
            )
    );

}


function aggregateMonthlyGroupRows(
    rows
) {

    const buckets =
        new Map();


    for (
        const row
        of rows
    ) {

        const year =
            Number(
                row.year
            );

        const month =
            Number(
                row.month
            );

        const sif =
            Number(
                row.sif
            );

        const retrieval =
            Number(
                row.retrieval
            );

        const spatial =
            Number(
                row.spatial
            );


        if (
            !Number.isFinite(year)
            ||
            !Number.isFinite(month)
            ||
            !Number.isFinite(sif)
            ||
            year < 2019
            ||
            year > 2025
            ||
            month < 1
            ||
            month > 12
            ||
            month === 2
        ) {
            continue;
        }


        const key =
            `${year}-${String(month).padStart(2, "0")}`;


        if (
            !buckets.has(
                key
            )
        ) {

            buckets.set(
                key,
                {
                    year,
                    month,
                    sif: [],
                    retrieval: [],
                    spatial: []
                }
            );

        }


        const bucket =
            buckets.get(
                key
            );


        bucket.sif.push(
            sif
        );


        if (
            Number.isFinite(
                retrieval
            )
        ) {
            bucket.retrieval.push(
                retrieval
            );
        }


        if (
            Number.isFinite(
                spatial
            )
        ) {
            bucket.spatial.push(
                spatial
            );
        }

    }


    return [
        ...buckets.values()
    ]
    .sort(
        (a, b) =>
            (
                a.year * 12
                +
                a.month
            )
            -
            (
                b.year * 12
                +
                b.month
            )
    )
    .map(
        bucket => ({

            year:
                bucket.year,

            month:
                bucket.month,

            date:
                `${bucket.year}-${String(bucket.month).padStart(2, "0")}-15`,

            mean:
                mean(
                    bucket.sif
                ),

            spatial:
                mean(
                    bucket.spatial
                ),

            retrieval:
                mean(
                    bucket.retrieval
                ),

            n:
                bucket.sif.length

        })
    );

}




function makeGroupTimeSeriesTraces(
    rows,
    name,
    color
) {

    const monthly =
        (
            Array.isArray(rows)
                ?
                rows
                :
                []
        )
        .filter(
            row => {

                const year =
                    Number(
                        row.year
                    );


                const month =
                    Number(
                        row.month
                    );


                const center =
                    Number(
                        row.mean
                    );


                return (
                    Number.isInteger(year)
                    &&
                    year >= 2019
                    &&
                    year <= 2025
                    &&
                    month >= 3
                    &&
                    month <= 10
                    &&
                    Number.isFinite(center)
                );

            }
        );


    const center =
        notebook11CalendarSeries(
            monthly,
            row =>
                Number(
                    row.mean
                ),
            row =>
                Number(
                    row.retrieval
                )
        );


    const lower =
        notebook11CalendarSeries(
            monthly,
            row => {

                const centerValue =
                    Number(
                        row.mean
                    );


                const spread =
                    Number(
                        row.spatial
                    );


                return (
                    Number.isFinite(centerValue)
                    &&
                    Number.isFinite(spread)
                )
                    ?
                    centerValue - spread
                    :
                    NaN;

            }
        );


    const upper =
        notebook11CalendarSeries(
            monthly,
            row => {

                const centerValue =
                    Number(
                        row.mean
                    );


                const spread =
                    Number(
                        row.spatial
                    );


                return (
                    Number.isFinite(centerValue)
                    &&
                    Number.isFinite(spread)
                )
                    ?
                    centerValue + spread
                    :
                    NaN;

            }
        );


    const traces =
        [];


    if (
        state.showSpatial
    ) {

        traces.push(
            {
                x:
                    upper.x,

                y:
                    upper.y,

                type:
                    "scatter",

                mode:
                    "lines",

                connectgaps:
                    false,

                line: {
                    color,
                    width:
                        1.2,
                    dash:
                        "dash"
                },

                opacity:
                    0.58,

                hoverinfo:
                    "skip",

                showlegend:
                    false,

                legendgroup:
                    `${name}-spatial`
            }
        );


        traces.push(
            {
                x:
                    lower.x,

                y:
                    lower.y,

                type:
                    "scatter",

                mode:
                    "lines",

                connectgaps:
                    false,

                line: {
                    color,
                    width:
                        1.2,
                    dash:
                        "dash"
                },

                opacity:
                    0.58,

                hoverinfo:
                    "skip",

                showlegend:
                    false,

                legendgroup:
                    `${name}-spatial`
            }
        );

    }


    const meanTrace = {

        x:
            center.x,

        y:
            center.y,

        type:
            "scatter",

        mode:
            "lines+markers",

        name,

        legendgroup:
            name,

        connectgaps:
            false,

        line: {
            color,
            width:
                2.4
        },

        marker: {
            color,
            size:
                4.5
        },

        hovertemplate:
            (
                "<b>%{x|%b %Y}</b>"
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
                center.error,

            visible:
                true,

            color,

            thickness:
                1,

            width:
                2

        };

    }


    traces.push(
        meanTrace
    );


    return traces;

}




function timeSeriesLayout() {

    const layout =
        plotLayout();


    layout.xaxis = {
        ...layout.xaxis,

        type:
            "date",

        categoryorder:
            undefined,

        categoryarray:
            undefined,

        title: {
            text:
                "Date"
        }
    };


    return layout;

}

async function renderExploreTimeSeries() {

    const features =
        getExploreFilteredFeatures();


    dom.metricPois.textContent =
        (
            state.selectedCell !== null
                ?
                1
                :
                features.length
        )
        .toLocaleString();


    dom.metricYears.textContent =
        "7";


    if (
        state.selectedCell !== null
    ) {

        const requested =
            normalizeId(
                state.selectedCell
            );


        const rows =
            await loadCellTimeSeries(
                requested
            );


        if (
            normalizeId(
                state.selectedCell
            )
            !== requested
            ||
            state.scienceView
            !== "timeseries"
        ) {
            return;
        }


        const valid =
            rows.filter(
                row => {

                    const month =
                        Number(
                            row.month
                        );


                    return (
                        month >= 3
                        &&
                        month <= 10
                        &&
                        Number.isFinite(
                            Number(
                                row.sif
                                ??
                                row.mean_sif
                            )
                        )
                    );

                }
            );


        if (!valid.length) {

            showEmptyState(
                "No SIF series available",
                "This forest cell has no monthly SIF series in the current science package."
            );


            dom.metricObservations.textContent =
                "0";


            return;

        }


        hideEmptyState();


        const center =
            notebook11CalendarSeries(
                valid,
                row =>
                    Number(
                        row.sif
                        ??
                        row.mean_sif
                    ),
                row =>
                    Number(
                        row.sif_uncertainty
                        ??
                        row.retrieval_uncertainty
                    )
            );


        const traces =
            [];


        if (
            state.showSpatial
        ) {

            const lower =
                notebook11CalendarSeries(
                    valid,
                    row => {

                        const sif =
                            Number(
                                row.sif
                                ??
                                row.mean_sif
                            );


                        const spread =
                            Number(
                                row.spatial_sd
                                ??
                                row.spatial
                            );


                        return (
                            Number.isFinite(sif)
                            &&
                            Number.isFinite(spread)
                        )
                            ?
                            sif - spread
                            :
                            NaN;

                    }
                );


            const upper =
                notebook11CalendarSeries(
                    valid,
                    row => {

                        const sif =
                            Number(
                                row.sif
                                ??
                                row.mean_sif
                            );


                        const spread =
                            Number(
                                row.spatial_sd
                                ??
                                row.spatial
                            );


                        return (
                            Number.isFinite(sif)
                            &&
                            Number.isFinite(spread)
                        )
                            ?
                            sif + spread
                            :
                            NaN;

                    }
                );


            traces.push(
                {
                    x:
                        upper.x,

                    y:
                        upper.y,

                    type:
                        "scatter",

                    mode:
                        "lines",

                    connectgaps:
                        false,

                    line: {
                        color:
                            SINGLE_SIF_COLOR,
                        width:
                            1.2,
                        dash:
                            "dash"
                    },

                    opacity:
                        0.58,

                    hoverinfo:
                        "skip",

                    showlegend:
                        false,

                    legendgroup:
                        "selected-cell-spatial"
                }
            );


            traces.push(
                {
                    x:
                        lower.x,

                    y:
                        lower.y,

                    type:
                        "scatter",

                    mode:
                        "lines",

                    connectgaps:
                        false,

                    line: {
                        color:
                            SINGLE_SIF_COLOR,
                        width:
                            1.2,
                        dash:
                            "dash"
                    },

                    opacity:
                        0.58,

                    hoverinfo:
                        "skip",

                    showlegend:
                        false,

                    legendgroup:
                        "selected-cell-spatial"
                }
            );

        }


        const mainTrace = {

            x:
                center.x,

            y:
                center.y,

            type:
                "scatter",

            mode:
                "lines+markers",

            name:
                "Monthly SIF",

            connectgaps:
                false,

            line: {
                color:
                    SINGLE_SIF_COLOR,
                width:
                    2
            },

            marker: {
                color:
                    SINGLE_SIF_COLOR,
                size:
                    5
            }

        };


        if (
            state.showRetrieval
        ) {

            mainTrace.error_y = {

                type:
                    "data",

                array:
                    center.error,

                visible:
                    true,

                thickness:
                    1,

                width:
                    2

            };

        }


        traces.push(
            mainTrace
        );


        const trend =
            trendStatistics(
                valid
            );


        const trendRows =
            valid.filter(
                row => {

                    const month =
                        Number(
                            row.month
                        );


                    return (
                        month >= 3
                        &&
                        month <= 10
                    );

                }
            );


        const trendX =
            trendRows.map(
                row =>
                    `${row.year}-${String(row.month).padStart(2, "0")}-15`
            );


        const trendY =
            trendRows.map(
                row => {

                    const decimalYear =
                        Number(
                            row.year
                        )
                        +
                        (
                            Number(
                                row.month
                            )
                            -
                            1
                        )
                        /
                        12;


                    return (
                        trend.intercept
                        +
                        trend.slope
                        *
                        decimalYear
                    );

                }
            );


        traces.push(
            {
                x:
                    trendX,

                y:
                    trendY,

                type:
                    "scatter",

                mode:
                    "lines",

                name:
                    "Linear trend",

                hoverinfo:
                    "skip",

                connectgaps:
                    false,

                line: {
                    color:
                        "rgba(23,107,58,0.38)",
                    width:
                        2,
                    dash:
                        "dot"
                }
            }
        );


        Plotly.react(
            dom.sifChart,
            traces,
            timeSeriesLayout(),
            plotConfig()
        );


        const feature =
            state.poiById.get(
                requested
            );


        const p =
            feature
                ?
                feature.properties
                :
                {};


        dom.chartTitle.textContent =
            `Monthly SIF · cell ${requested}`;


        dom.chartSubtitle.innerHTML =
            `
            2019–2025
            · ${prettyForestClass(p.stable_forest_class)}
            · ${p.admin1_name || "—"}
            <span class="trend-stat-line">
                slope ${fmt(trend.slope, 4)} yr⁻¹
                · R² ${fmt(trend.r2, 3)}
                · n ${trend.n}
                · p ${fmtP(trend.p)}
            </span>
            `;


        dom.metricObservations.textContent =
            valid.length.toLocaleString();


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
        features.length === 0
    ) {

        showEmptyState(
            "No cells match this selection",
            "Broaden the current filters or choose another location."
        );


        dom.metricObservations.textContent =
            "0";


        dom.chartTitle.textContent =
            "Monthly SIF time series";


        dom.chartSubtitle.textContent =
            "No forest cells satisfy the current filters.";


        return;

    }


    const scaleAtRequest =
        state.gridScale;


    const allRows =
        await getGroupTimeSeriesRows();


    if (
        state.scienceView
        !== "timeseries"
        ||
        state.gridScale
        !== scaleAtRequest
        ||
        state.selectedCell
        !== null
    ) {
        return;
    }


    const filteredRows =
        groupRowsForFeatures(
            allRows,
            features
        );


    const traces =
        [];


    let observationCount =
        0;


    const presentClasses =
        FOREST_CLASSES.filter(
            forestClass =>
                features.some(
                    feature =>
                        feature.properties.stable_forest_class
                        === forestClass
                )
        );


    for (
        const forestClass
        of presentClasses
    ) {

        const classIds =
            new Set(
                features
                    .filter(
                        feature =>
                            feature.properties.stable_forest_class
                            === forestClass
                    )
                    .map(
                        feature =>
                            normalizeId(
                                feature.properties.cell_id
                            )
                    )
            );


        const classRows =
            filteredRows.filter(
                row =>
                    classIds.has(
                        normalizeId(
                            row.cell_id
                        )
                    )
                    &&
                    Number(row.month) >= 3
                    &&
                    Number(row.month) <= 10
            );


        observationCount +=
            classRows.length;


        const monthly =
            aggregateMonthlyGroupRows(
                classRows
            );


        if (!monthly.length) {
            continue;
        }


        traces.push(
            ...makeGroupTimeSeriesTraces(
                monthly,
                FOREST_LABELS[
                    forestClass
                ]
                ||
                forestClass,
                FOREST_COLORS[
                    forestClass
                ]
                ||
                SINGLE_SIF_COLOR
            )
        );

    }


    if (!traces.length) {

        showEmptyState(
            "No SIF series available",
            "The selected forest group has no monthly SIF observations."
        );


        dom.metricObservations.textContent =
            "0";


        return;

    }


    hideEmptyState();


    Plotly.react(
        dom.sifChart,
        traces,
        timeSeriesLayout(),
        plotConfig()
    );


    dom.chartTitle.textContent =
        "Monthly SIF time series";


    dom.chartSubtitle.textContent =
        (
            `${getExploreSpatialLabel()}`
            +
            ` · ${features.length.toLocaleString()} cells`
            +
            ` · 2019–2025`
        );


    dom.metricObservations.textContent =
        observationCount.toLocaleString();


    if (
        features.length < 10
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

}





/* ==========================================================
   TIME-SERIES COMPARE
   ========================================================== */

async function renderCompareTimeSeries() {

    const featuresA =
        comparisonFeatures(
            "A"
        );


    const featuresB =
        comparisonFeatures(
            "B"
        );


    const nameA =
        comparisonSideName(
            "A"
        );


    const nameB =
        comparisonSideName(
            "B"
        );


    const classLabel =
        FOREST_LABELS[
            state.compareClass
        ]
        ||
        state.compareClass;


    if (
        state.compareBy
        === "location"
        &&
        state.compareType
        === "cell"
        &&
        (
            state.compareCellA === null
            ||
            state.compareCellB === null
        )
    ) {

        showEmptyState(
            "Select two cells",
            "Click two eligible forest cells on the map to compare their 2019–2025 monthly SIF series."
        );


        dom.chartTitle.textContent =
            "Monthly SIF comparison";


        dom.chartSubtitle.textContent =
            `${classLabel} · select two cells`;


        return;

    }


    if (
        featuresA.length === 0
        ||
        featuresB.length === 0
    ) {

        showEmptyState(
            "This comparison has no matched cells",
            "Choose another forest class, broaden the filters, or select different locations."
        );


        dom.chartTitle.textContent =
            "Monthly SIF comparison";


        dom.chartSubtitle.textContent =
            `${classLabel} · ${nameA} vs ${nameB}`;


        return;

    }


    const scaleAtRequest =
        state.gridScale;


    if (
        state.compareBy
        === "location"
        &&
        state.compareType
        === "cell"
    ) {

        const a =
            normalizeId(
                state.compareCellA
            );


        const b =
            normalizeId(
                state.compareCellB
            );


        const [
            rowsA,
            rowsB
        ] = await Promise.all([
            loadCellTimeSeries(a),
            loadCellTimeSeries(b)
        ]);


        if (
            state.scienceView
            !== "timeseries"
            ||
            state.gridScale
            !== scaleAtRequest
        ) {
            return;
        }


        const makeCellTraces =
            (
                rows,
                name,
                color
            ) => {

                const valid =
                    rows.filter(
                        row => {

                            const month =
                                Number(
                                    row.month
                                );


                            return (
                                month >= 3
                                &&
                                month <= 10
                                &&
                                Number.isFinite(
                                    Number(
                                        row.sif
                                        ??
                                        row.mean_sif
                                    )
                                )
                            );

                        }
                    );


                const center =
                    notebook11CalendarSeries(
                        valid,
                        row =>
                            Number(
                                row.sif
                                ??
                                row.mean_sif
                            ),
                        row =>
                            Number(
                                row.sif_uncertainty
                                ??
                                row.retrieval_uncertainty
                            )
                    );


                const traces =
                    [];


                if (
                    state.showSpatial
                ) {

                    const lower =
                        notebook11CalendarSeries(
                            valid,
                            row => {

                                const sif =
                                    Number(
                                        row.sif
                                        ??
                                        row.mean_sif
                                    );


                                const spread =
                                    Number(
                                        row.spatial_sd
                                        ??
                                        row.spatial
                                    );


                                return (
                                    Number.isFinite(sif)
                                    &&
                                    Number.isFinite(spread)
                                )
                                    ?
                                    sif - spread
                                    :
                                    NaN;

                            }
                        );


                    const upper =
                        notebook11CalendarSeries(
                            valid,
                            row => {

                                const sif =
                                    Number(
                                        row.sif
                                        ??
                                        row.mean_sif
                                    );


                                const spread =
                                    Number(
                                        row.spatial_sd
                                        ??
                                        row.spatial
                                    );


                                return (
                                    Number.isFinite(sif)
                                    &&
                                    Number.isFinite(spread)
                                )
                                    ?
                                    sif + spread
                                    :
                                    NaN;

                            }
                        );


                    traces.push(
                        {
                            x:
                                upper.x,

                            y:
                                upper.y,

                            type:
                                "scatter",

                            mode:
                                "lines",

                            connectgaps:
                                false,

                            line: {
                                color,
                                width: 1.1,
                                dash: "dash"
                            },

                            opacity:
                                0.52,

                            hoverinfo:
                                "skip",

                            showlegend:
                                false,

                            legendgroup:
                                `${name}-spatial`
                        }
                    );


                    traces.push(
                        {
                            x:
                                lower.x,

                            y:
                                lower.y,

                            type:
                                "scatter",

                            mode:
                                "lines",

                            connectgaps:
                                false,

                            line: {
                                color,
                                width: 1.1,
                                dash: "dash"
                            },

                            opacity:
                                0.52,

                            hoverinfo:
                                "skip",

                            showlegend:
                                false,

                            legendgroup:
                                `${name}-spatial`
                        }
                    );

                }


                const trace = {

                    x:
                        center.x,

                    y:
                        center.y,

                    type:
                        "scatter",

                    mode:
                        "lines+markers",

                    name,

                    connectgaps:
                        false,

                    line: {
                        color,
                        width: 2
                    },

                    marker: {
                        color,
                        size: 4
                    }

                };


                if (
                    state.showRetrieval
                ) {

                    trace.error_y = {

                        type:
                            "data",

                        array:
                            center.error,

                        visible:
                            true,

                        thickness:
                            1,

                        width:
                            2,

                        color
                    };

                }


                traces.push(
                    trace
                );


                return traces;

            };


        hideEmptyState();


        Plotly.react(
            dom.sifChart,
            [
                ...makeCellTraces(
                    rowsA,
                    `A · ${nameA}`,
                    COMPARE_A_COLOR
                ),

                ...makeCellTraces(
                    rowsB,
                    `B · ${nameB}`,
                    COMPARE_B_COLOR
                )
            ],
            timeSeriesLayout(),
            plotConfig()
        );


        const ta =
            trendStatistics(
                rowsA
            );


        const tb =
            trendStatistics(
                rowsB
            );


        dom.chartTitle.textContent =
            "Monthly SIF comparison";


        dom.chartSubtitle.innerHTML =
            `
            ${classLabel} · 2019–2025
            <span class="trend-stat-line">
                A: slope ${fmt(ta.slope,4)} yr⁻¹ · R² ${fmt(ta.r2,3)} · n ${ta.n} · p ${fmtP(ta.p)}
                <br>
                B: slope ${fmt(tb.slope,4)} yr⁻¹ · R² ${fmt(tb.r2,3)} · n ${tb.n} · p ${fmtP(tb.p)}
            </span>
            `;


        dom.metricPois.textContent =
            "2";


        dom.metricObservations.textContent =
            (
                rowsA.length
                +
                rowsB.length
            )
            .toLocaleString();


        dom.metricYears.textContent =
            "7";


        return;

    }


    const allRows =
        await getGroupTimeSeriesRows();


    if (
        state.scienceView
        !== "timeseries"
        ||
        state.gridScale
        !== scaleAtRequest
    ) {
        return;
    }


    const rowsA =
        groupRowsForFeatures(
            allRows,
            featuresA
        )
        .filter(
            row =>
                Number(row.month) >= 3
                &&
                Number(row.month) <= 10
        );


    const rowsB =
        groupRowsForFeatures(
            allRows,
            featuresB
        )
        .filter(
            row =>
                Number(row.month) >= 3
                &&
                Number(row.month) <= 10
        );


    const monthlyA =
        aggregateMonthlyGroupRows(
            rowsA
        );


    const monthlyB =
        aggregateMonthlyGroupRows(
            rowsB
        );


    if (
        !monthlyA.length
        ||
        !monthlyB.length
    ) {

        showEmptyState(
            "No SIF series available",
            "One or both comparison groups have no monthly SIF observations."
        );


        return;

    }


    hideEmptyState();


    const traces = [

        ...makeGroupTimeSeriesTraces(
            monthlyA,
            `A · ${nameA}`,
            COMPARE_A_COLOR
        ),

        ...makeGroupTimeSeriesTraces(
            monthlyB,
            `B · ${nameB}`,
            COMPARE_B_COLOR
        )

    ];


    Plotly.react(
        dom.sifChart,
        traces,
        timeSeriesLayout(),
        plotConfig()
    );


    dom.chartTitle.textContent =
        `Monthly SIF comparison · ${classLabel}`;


    dom.chartSubtitle.textContent =
        (
            `${nameA} vs ${nameB}`
            +
            ` · 2019–2025`
            +
            ` · A n=${featuresA.length.toLocaleString()}`
            +
            ` · B n=${featuresB.length.toLocaleString()}`
        );


    dom.metricPois.textContent =
        (
            featuresA.length
            +
            featuresB.length
        )
        .toLocaleString();


    dom.metricObservations.textContent =
        (
            rowsA.length
            +
            rowsB.length
        )
        .toLocaleString();


    dom.metricYears.textContent =
        "7";


    const smallSides =
        [];


    if (
        featuresA.length < 10
    ) {

        smallSides.push(
            `A n=${featuresA.length}`
        );

    }


    if (
        featuresB.length < 10
    ) {

        smallSides.push(
            `B n=${featuresB.length}`
        );

    }


    if (
        smallSides.length
    ) {

        dom.comparisonWarning.textContent =
            (
                `Small comparison group (${smallSides.join(", ")}). `
                +
                `Spatial variability should be interpreted cautiously.`
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
   COMPACT CELL CONTEXT
   ========================================================== */

function finiteMean(
    rows,
    key
) {

    const values =
        rows
        .map(
            row =>
                Number(
                    row[key]
                )
        )
        .filter(
            Number.isFinite
        );


    return values.length
        ?
        mean(values)
        :
        NaN;

}


async function enrichSelectedCell(
    cellId
) {

    const id =
        normalizeId(
            cellId
        );


    const feature =
        state.poiById.get(
            id
        );


    if (!feature) {
        return;
    }


    let rows = [];


    try {

        rows =
            await loadCellTimeSeries(
                id
            );

    }
    catch (error) {

        rows = [];

    }


    if (
        normalizeId(
            state.selectedCell
        )
        !== id
    ) {
        return;
    }


    const p =
        feature.properties;


    const annualPrecip =
        new Map();


    for (
        const row
        of rows
    ) {

        const year =
            Number(
                row.year
            );

        const value =
            Number(
                row.precipitation_mm
            );


        if (
            Number.isFinite(year)
            &&
            Number.isFinite(value)
        ) {

            annualPrecip.set(
                year,
                (
                    annualPrecip.get(
                        year
                    )
                    ||
                    0
                )
                +
                value
            );

        }

    }


    const precipitation =
        annualPrecip.size
            ?
            mean(
                [
                    ...annualPrecip.values()
                ]
            )
            :
            NaN;


    const signature =
        state.sifByPoi.get(
            id
        )
        ||
        [];


    const retrieval =
        mean(
            signature
                .map(
                    row =>
                        Number(
                            row.retrieval_uncertainty
                        )
                )
                .filter(
                    Number.isFinite
                )
        );


    const support =
        mean(
            signature
                .map(
                    row =>
                        Number(
                            row.sif_support_mean
                        )
                )
                .filter(
                    Number.isFinite
                )
        );


    dom.selectedCellDetails.innerHTML =
        `
        <div class="cell-context-grid">

            <div>
                <span class="context-label">Forest class</span>
                <strong>${prettyForestClass(p.stable_forest_class)}</strong>
            </div>

            <div>
                <span class="context-label">Productive forest</span>
                <strong>${pct(Number(p.min_productive_fraction))}</strong>
            </div>

            <div>
                <span class="context-label">Stable class fraction</span>
                <strong>${pct(Number(p.stable_class_min_fraction))}</strong>
            </div>

            <div>
                <span class="context-label">Region</span>
                <strong>${p.admin1_name || "—"}</strong>
            </div>

            <div>
            </div>

            <div>
                <span class="context-label">Köppen–Geiger</span>
                <strong>${p.koppen_class || "—"}</strong>
            </div>

            <div>
                <span class="context-label">Peatland</span>
                <strong>${pct(Number(p.total_peatland_fraction_mean))}</strong>
            </div>

            <div>
                <span class="context-label">Drainage</span>
                <strong>${p.dominant_site_drainage_status || "—"}</strong>
            </div>

            <div>
                <span class="context-label">Site</span>
                <strong>${p.dominant_site_name_en || "—"}</strong>
            </div>

            <div>
                <span class="context-label">Mean air temperature</span>
                <strong>${fmt(finiteMean(rows,"air_temperature_c"),1)} °C</strong>
            </div>

            <div>
                <span class="context-label">Mean VPD</span>
                <strong>${fmt(finiteMean(rows,"vpd_kpa"),2)} kPa</strong>
            </div>

            <div>
                <span class="context-label">Precipitation in available months</span>
                <strong>${fmt(precipitation,0)} mm</strong>
            </div>

            <div>
                <span class="context-label">Mean snow depth</span>
                <strong>${fmt(finiteMean(rows,"snow_depth_m"),3)} m</strong>
            </div>

            <div>
                <span class="context-label">Mean retrieval uncertainty</span>
                <strong>${fmt(retrieval,3)}</strong>
            </div>

            <div>
                <span class="context-label">Mean SIF support</span>
                <strong>${fmt(support,2)}</strong>
            </div>

        </div>
        `;

}



function updateEverything() {

    updateEnvironmentFilterUI();


    updateRangeUI();

    updateModeUI();

    updateExploreSpatialUI();

    updateCompareTypeUI();

    updateCompareClassAvailability();

    updateMapFilters();

    updateExploreClassCounts();

    updateContextLayers();


    updateScienceUI();


    if (
        state.appMode === "explore"
    ) {

        updateExploreSummaryHeading();

    }


    updateCurrentChart();

}


/* ==========================================================
   EVENTS
   ========================================================== */


function bindEvents() {

    [
        dom.compareKoppenA,
        dom.compareKoppenB,
        dom.comparePeatlandAMin,
        dom.comparePeatlandAMax,
        dom.comparePeatlandBMin,
        dom.comparePeatlandBMax,
        dom.compareDrainageA,
        dom.compareDrainageB,
        dom.compareClimateAMin,
        dom.compareClimateAMax,
        dom.compareClimateBMin,
        dom.compareClimateBMax
    ]
        .forEach(
            control => {

                control.addEventListener(
                    "change",
                    () => {

                        updateEnvironmentComparison();

                    }
                );

            }
        );


    dom.compareClimateVariable.addEventListener(
        "change",
        event => {

            state.compareClimateVariable =
                event.target.value;


            setClimateComparisonDefaults(
                true
            );

        }
    );


    document
        .querySelectorAll(
            ".compare-by"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const next =
                            button.dataset.compareBy;


                        if (
                            next !== "location"
                            &&
                            next !== "environment"
                        ) {
                            return;
                        }


                        state.compareBy =
                            next;


                        updateCompareByUI();


                        if (
                            state.compareBy
                            === "environment"
                            &&
                            state.environmentCompareType
                            === "climate"
                        ) {

                            setClimateComparisonDefaults(
                                false
                            );

                        }


                        updateEverything();


                        if (
                            state.compareBy
                            === "location"
                        ) {

                            fitToComparison();

                        }


                        else {

                            fitToFinland();

                        }

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".environment-type"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const next =
                            button.dataset.environmentType;


                        if (
                            next !== "koppen"
                            &&
                            next !== "peatland"
                            &&
                            next !== "drainage"
                            &&
                            next !== "climate"
                        ) {
                            return;
                        }


                        state.environmentCompareType =
                            next;


                        updateCompareByUI();
                        syncEnvironmentComparisonState();


                        if (
                            state.compareBy
                            === "environment"
                            &&
                            state.environmentCompareType
                            === "climate"
                        ) {

                            setClimateComparisonDefaults(
                                true
                            );

                        }


                        else {

                            updateEverything();

                        }

                    }
                );

            }
        );


    bindEnvironmentFilters();


    document
        .querySelectorAll(
            "[data-science-view]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        setScienceView(
                            button.dataset
                                .scienceView
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            "[data-grid-scale]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        setGridScale(
                            button.dataset
                                .gridScale
                        );

                    }
                );

            }
        );


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

                        const nextType =
                            button.dataset.compareType;


                        if (
                            nextType !== "admin1"
                            &&
                            nextType !== "quadrant"
                            &&
                            nextType !== "cell"
                        ) {
                            return;
                        }


                        state.compareType =
                            nextType;


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


                        else {

                            validateCompareCells();

                        }


                        if (
                            dom.compareClassSelect
                        ) {

                            dom.compareClassSelect.value =
                                state.compareClass;

                        }


                        updateEverything();


                        if (
                            state.compareType !== "cell"
                        ) {

                            fitToComparison();

                        }

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


            if (
                state.compareBy
                === "environment"
                &&
                state.environmentCompareType
                === "climate"
            ) {

                setClimateComparisonDefaults(
                    false
                );

            }


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


            if (
                state.compareBy
                === "environment"
                &&
                state.environmentCompareType
                === "climate"
            ) {

                setClimateComparisonDefaults(
                    false
                );

            }


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


            if (
                state.compareBy
                === "environment"
                &&
                state.environmentCompareType
                === "climate"
            ) {

                setClimateComparisonDefaults(
                    false
                );

            }


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


            if (
                state.compareBy
                === "environment"
                &&
                state.environmentCompareType
                === "climate"
            ) {

                setClimateComparisonDefaults(
                    false
                );

            }


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


    dom.toggleQuadrants?.addEventListener(
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



/* NOTEBOOK 11 BLOCK 10E START */






























/* NOTEBOOK 11 BLOCK 10E END */


function updateCurrentChart() {

    const isTimeSeries =
        state.scienceView
        === "timeseries";


    const temporalControls =
        [
            document.getElementById(
                "toggle-temporal"
            ),
            document.getElementById(
                "show-temporal"
            ),
            document.querySelector(
                '[data-uncertainty="temporal"]'
            )
        ]
        .filter(Boolean);


    for (
        const control
        of temporalControls
    ) {

        control.disabled =
            isTimeSeries;


        const wrapper =
            control.closest(
                ".control-row"
            )
            ||
            control.closest(
                ".toggle-row"
            )
            ||
            control.closest(
                "label"
            );


        if (wrapper) {

            wrapper.style.display =
                isTimeSeries
                    ?
                    "none"
                    :
                    "";

        }

    }


    if (
        isTimeSeries
    ) {

        if (
            state.appMode
            === "compare"
        ) {

            renderCompareTimeSeries();

        }

        else {

            renderExploreTimeSeries();

        }


        return;

    }


    if (
        state.appMode
        === "compare"
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

    state.compareBy =
        "location";

    state.environmentCompareType =
        "koppen";

    state.compareKoppenA =
        "Dfb";

    state.compareKoppenB =
        "Dfc";

    state.comparePeatlandAMin =
        0;

    state.comparePeatlandAMax =
        20;

    state.comparePeatlandBMin =
        60;

    state.comparePeatlandBMax =
        100;

    state.compareDrainageA =
        "drained";

    state.compareDrainageB =
        "undrained";

    state.compareClimateVariable =
        "temperature";

    state.compareClimateAMin =
        null;

    state.compareClimateAMax =
        null;

    state.compareClimateBMin =
        null;

    state.compareClimateBMax =
        null;


    resetEnvironmentFilters(false);


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

    dom.compareKoppenA.value =
        "Dfb";

    dom.compareKoppenB.value =
        "Dfc";

    dom.comparePeatlandAMin.value =
        "0";

    dom.comparePeatlandAMax.value =
        "20";

    dom.comparePeatlandBMin.value =
        "60";

    dom.comparePeatlandBMax.value =
        "100";

    dom.compareDrainageA.value =
        "drained";

    dom.compareDrainageB.value =
        "undrained";

    dom.compareClimateVariable.value =
        "temperature";

    dom.compareClimateAMin.value =
        "";

    dom.compareClimateAMax.value =
        "";

    dom.compareClimateBMin.value =
        "";

    dom.compareClimateBMax.value =
        "";

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

    if (dom.toggleQuadrants) {

        dom.toggleQuadrants.checked =
            false;

    }


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

        rebuildForestLegend();

        bindEvents();

        updateScienceUI();

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
                Please reload the Explorer.
            </div>
            `;

    }

}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);
