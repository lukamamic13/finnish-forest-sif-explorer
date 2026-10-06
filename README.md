# Finnish Forest SIF Explorer

An interactive web application for exploring spatial and temporal patterns of **solar-induced chlorophyll fluorescence (SIF)** across Finnish forests.

The Finnish Forest SIF Explorer integrates satellite-derived SIF observations with forest composition, productive-forest coverage, peatland characteristics, Köppen climate classification, and meteorological variables. It supports exploration and comparison at **5 × 5 km** and **10 × 10 km** spatial scales.

**Live application:**  
https://lukamamic13.github.io/finnish-forest-sif-explorer/

**Analysis period:** 2019–2025

---

## Overview

Solar-induced chlorophyll fluorescence (SIF) is a remotely sensed signal associated with photosynthetic activity. The Finnish Forest SIF Explorer provides an interactive interface for examining spatial, seasonal, and interannual patterns in SIF across Finnish forest environments.

The Explorer allows users to:

- explore forest SIF geographically;
- switch between **5 × 5 km** and **10 × 10 km** analysis grids;
- examine different forest composition classes;
- restrict analyses by productive-forest coverage;
- filter cells according to environmental characteristics;
- compare Finnish regions;
- compare geographic quadrants;
- compare individual grid cells;
- compare environmental groups;
- inspect seasonal SIF signatures;
- inspect monthly SIF time series from **2019–2025**;
- distinguish temporal variability, spatial variability, and retrieval uncertainty;
- inspect trends without filling or fabricating unavailable observations.

The application is entirely client-side and is deployed as a static website through GitHub Pages.

---

# Explorer modes

The application contains two main modes: **Explore** and **Compare**.

## Explore

**Explore** is intended for investigating SIF patterns within a selected spatial and environmental domain.

Users can select a geographic area, forest class, productive-forest threshold, and environmental filters. The map and plots update according to the resulting eligible population.

Depending on the selected visualization, the Explorer can show seasonal SIF signatures or monthly SIF time series.

When multiple forest classes are represented in an Explore analysis, they are displayed as distinct series so that their SIF behaviour can be compared directly.

---

## Compare

**Compare** provides side-by-side comparison of two groups.

Two comparison frameworks are available:

### Location

Spatial groups can be compared using:

- **Regions**
- **Quadrants**
- **Cells**

Region comparisons use administrative regions represented in the dataset.

Quadrant comparisons use the geographic quadrant assigned to each grid cell:

- North-west
- North-east
- South-west
- South-east

Cell comparison allows two individual grid cells to be examined directly.

### Environment

Environmental comparison allows two groups of forest cells to be defined according to environmental characteristics.

Available environmental comparisons include:

- **Köppen climate class**
- **Peatland fraction**
- **Drainage status**
- **Air temperature**
- **Vapour pressure deficit (VPD)**
- **Snow depth**

For continuous climate variables, comparison ranges can be defined independently for groups A and B.

Initial climate comparison ranges are automatically divided around the mean of the currently eligible comparison population, providing an immediate lower-versus-higher environmental contrast that can subsequently be adjusted by the user.

The selected forest class and productive-forest eligibility criteria continue to apply to environmental comparisons.

When a variable itself is being compared, the ordinary filter for that same variable is neutralized so that the comparison is not inadvertently restricted by its own filter.

---

# Spatial scales

The Explorer supports two grid resolutions.

## 5 × 5 km

The finer grid provides greater spatial detail for examining mapped forest SIF patterns and environmental characteristics.

The public Explorer contains:

**10,814 displayed 5 × 5 km forest cells**

## 10 × 10 km

The coarser grid provides a broader spatial representation of the same forest system.

The public Explorer contains:

**2,896 displayed 10 × 10 km forest cells**

Only cells assigned to a stable forest composition class are displayed in the public Explorer.

The underlying time-series indexes contain additional cells required for data inheritance and analysis:

- **14,105 indexed 5 × 5 km cells**
- **3,604 indexed 10 × 10 km cells**

---

# Forest composition

Forest cells are classified according to stable forest composition.

The Explorer dynamically supports the forest classes contained in the data rather than relying on a fixed hard-coded list.

Current classes are:

- Pine
- Pine–spruce
- Birch–pine
- Birch–spruce
- Spruce
- Other broadleaf–pine
- Complex mixed forest

Forest-class availability varies geographically and between spatial scales.

---

# Productive-forest coverage

Each grid cell contains an estimate of the fraction of the cell associated with productive forest.

The Explorer provides a **productive-forest coverage** control ranging from:

**0–100%**

The default eligibility range is:

**70–100%**

This threshold allows analyses to focus on cells with stronger representation of productive forest while still allowing the user to broaden or narrow the selection.

---

# Environmental filters

Several environmental characteristics can be used to restrict the eligible forest-cell population.

## Peatland fraction

Cells can be filtered according to total peatland fraction.

The control spans:

**0–100%**

## Köppen climate class

The available Köppen climate classes represented in the Explorer are:

- **Dfb**
- **Dfc**
- **Not classified**

A cell with unavailable Köppen classification is retained explicitly as **Not classified** rather than being silently removed.

## Drainage status

Dominant peatland/site drainage status can be filtered as:

- **Drained**
- **Undrained**
- **Not classified**

## Air temperature

Cells can be filtered according to their mean air-temperature conditions represented in the analysis data.

## Vapour pressure deficit

Vapour pressure deficit (**VPD**) can be used to examine differences in atmospheric moisture demand.

Values are displayed in **kPa**.

## Snow depth

Cells can be filtered according to mean snow-depth conditions represented in the analysis data.

Values are displayed in **cm**.

## Precipitation

Precipitation is retained in the underlying environmental data but is **not exposed as an environmental comparison/filter variable in the public Explorer**.

The available monthly climate records do not provide complete twelve-month calendar-year coverage for the analysis period. Consequently, these records should not be interpreted as complete annual precipitation totals.

This distinction prevents seasonal or incomplete precipitation coverage from being interpreted as annual precipitation climatology.

---

# Seasonal SIF signatures

The **Signature** view summarizes the seasonal SIF cycle.

Visible SIF observations are restricted to:

**March–October**

These months represent the observation period used for the public seasonal visualization.

February observations remain preserved in the underlying raw data but are not displayed in the public seasonal signature.

The Signature view can represent three conceptually different quantities:

- temporal/interannual variability;
- within-cell spatial variability;
- retrieval uncertainty.

These quantities are deliberately kept separate.

---

# Monthly SIF time series

The **Time series** view presents monthly SIF observations for:

**2019–2025**

The time axis retains the complete monthly calendar sequence from January 2019 through December 2025.

Visible SIF observations are restricted to:

**March–October**

November, December, January, and February are represented as unavailable periods in the public visualization.

Missing winter observations are not interpolated or connected across seasonal gaps.

This preserves the temporal structure of the available observations without creating artificial data.

---

# Missing observations

The Explorer does not fabricate missing SIF observations.

For time-series visualization:

- unavailable months remain null;
- seasonal gaps remain visible;
- plot lines do not connect across missing winter periods;
- trend calculations use only valid displayed observations.

This behaviour is important because the underlying satellite observation record is seasonal rather than a uniformly complete monthly record.

---

# Variability and uncertainty

A central design principle of the Explorer is that different forms of variability and uncertainty should not be treated as interchangeable.

The application distinguishes three quantities.

## Temporal variability

Temporal variability describes interannual variation in SIF for a given seasonal month.

For seasonal signatures, this quantity uses the precomputed **SIF interannual standard deviation** (`sif_interannual_sd`).

It is calculated from the available annual observations for the corresponding month.

Temporal/interannual variability is displayed in the **Signature** view.

It is not displayed as an uncertainty ribbon in the monthly Time-series view.

## Spatial variability

Spatial variability describes heterogeneity in native SIF values within a grid cell.

It is based on the **area-weighted within-cell population standard deviation** of valid native SIF values, using overlap area as the weighting basis.

For an individual selected cell, monthly Time-series spatial variability therefore represents the native within-cell spatial variability for that cell and month.

For grouped analyses, spatial variability is aggregated as the arithmetic mean of the contributing cells' native within-cell spatial variability.

It is **not** calculated as the standard deviation among the mean SIF values of the selected cells.

This distinction is important: variation among grid-cell means describes between-cell heterogeneity and is not the same quantity as the within-cell spatial variability represented by the Explorer.

## Retrieval uncertainty

Retrieval uncertainty represents uncertainty associated with the SIF retrieval.

It is displayed independently from temporal and spatial variability.

For grouped analyses, retrieval uncertainty is summarized across contributing cells while remaining conceptually distinct from spatial variability.

---

# Grouped analyses

Several Explorer operations summarize more than one grid cell.

Depending on the selected mode, groups can represent:

- a region;
- a quadrant;
- an environmental category;
- an environmental range;
- a forest class;
- another currently eligible subset of cells.

For grouped monthly time series, the application calculates the mean SIF signal from contributing cell-month observations.

The group representation retains:

- mean SIF;
- mean native within-cell spatial variability;
- mean retrieval uncertainty;
- number of contributing cell-month observations.

This allows grouped comparisons without redefining spatial variability as between-cell variation.

---

# Climate variables

Climate information is associated with the forest grid and can be used for filtering and environmental comparison.

The Explorer currently exposes:

- mean air temperature;
- mean vapour pressure deficit;
- mean snow depth.

The 5 × 5 km grid inherits the corresponding climate information from its associated 10 × 10 km parent cell.

This provides consistent climate context between the two spatial scales while retaining the finer forest/SIF mapping of the 5 × 5 km grid.

Climate summaries should be interpreted in the context of the available analysis-month observations rather than as uniformly complete year-round climatologies.

---

# Peatland information

The Explorer contains peatland-related attributes including:

- total peatland fraction;
- dominant drainage status;
- dominant site information.

These variables provide environmental context for investigating SIF behaviour across Finnish forest and peatland landscapes.

---

# Geographic quadrants

Each grid cell contains an assigned geographic quadrant.

The four public categories are:

- North-west
- North-east
- South-west
- South-east

Quadrant membership is stored directly with the grid-cell data and is used for filtering and comparison.

Quadrant comparison therefore does not depend on visual quadrant boundary lines being drawn on the map.

---

# Trend estimation

Time-series plots can include a trend estimate based on valid observations.

Trend information includes:

- slope;
- R²;
- number of observations (`n`);
- p-value.

Only valid displayed observations contribute to trend estimation.

Unavailable winter months are not filled and therefore do not contribute artificial observations to the regression.

The trend should be interpreted as a **descriptive trend through the available seasonal SIF observations**, rather than as a reconstruction of continuously observed year-round SIF or, by itself, evidence of a long-term causal change.

---

# Data period

The SIF analysis currently covers:

**2019–2025**

No observations beyond the available analysis period are fabricated or extrapolated.

---

# Data organization

The deployed application is organized as a static web project.

~~~text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── data/
    ├── cells_5km.geojson
    ├── cells_10km.geojson
    ├── signature_5km.csv
    ├── signature_10km.csv
    ├── manifest.json
    ├── group_timeseries/
    │   ├── 5km.json
    │   └── 10km.json
    └── timeseries/
        ├── 5km/
        │   ├── index.json
        │   └── ...
        └── 10km/
            ├── index.json
            └── ...
~~~

---

# Grid-cell GeoJSON

The spatial grids are stored as GeoJSON:

~~~text
data/cells_5km.geojson
data/cells_10km.geojson
~~~

Grid-cell properties include information used by the Explorer such as:

- cell identifier;
- geographic quadrant;
- administrative region;
- Köppen climate class;
- stable forest class;
- productive-forest fraction;
- peatland fraction;
- dominant drainage status;
- dominant site information;
- climate summaries.

The 5 × 5 km cells additionally retain their associated 10 × 10 km parent-cell identifier.

---

# Seasonal signature data

Seasonal signature data are stored in:

~~~text
data/signature_5km.csv
data/signature_10km.csv
~~~

The signature data contain fields including:

~~~text
cell_id
month
n_years
sif_mean
sif_interannual_sd
retrieval_uncertainty_mean
sif_support_mean
support90_fraction_of_available_years
support95_fraction_of_available_years
year_coverage_fraction
spatial_sd_mean
~~~

These precomputed quantities support efficient interactive seasonal visualization without requiring the browser to repeatedly aggregate the complete monthly archive.

---

# Monthly time-series data

Monthly observations are stored in sharded JSON files:

~~~text
data/timeseries/5km/
data/timeseries/10km/
~~~

Each scale contains an:

~~~text
index.json
~~~

The index maps each cell identifier to the shard containing that cell's monthly observations.

The application therefore loads individual monthly records **lazily**, when they are required, rather than downloading the complete cell-level monthly archive when the application starts.

Monthly records contain variables including:

- cell identifier;
- year;
- month;
- SIF;
- SIF retrieval uncertainty;
- native spatial SIF variability;
- air temperature;
- dew-point temperature;
- vapour pressure deficit;
- precipitation;
- snow depth;
- soil water;
- solar radiation;
- valid-area fraction;
- support and eligibility information.

---

# Group time-series data

Compact group time-series packages are stored in:

~~~text
data/group_timeseries/5km.json
data/group_timeseries/10km.json
~~~

These support efficient aggregation for region, quadrant, environmental, forest-class, and other grouped comparisons.

The compact representation preserves the quantities required for the public time-series analysis while avoiding unnecessary transfer and processing of the complete underlying monthly records during grouped analyses.

---

# Scientific interpretation

The Finnish Forest SIF Explorer is intended primarily as an **exploratory and descriptive scientific tool**.

It can be used to identify spatial and temporal patterns, formulate hypotheses, compare forest/environmental groups, and inspect the processed dataset interactively.

Associations visible in the Explorer should not automatically be interpreted as causal relationships.

For example, differences in SIF between lower- and higher-VPD groups may also be associated with geographic, climatic, forest-composition, peatland, productivity, or other environmental differences.

Formal causal or inferential conclusions require analyses designed specifically for those questions.

---

# Interpretation of the 5 × 5 km product

The 5 × 5 km representation provides finer mapped spatial detail.

It should be interpreted according to the methodology used to construct the finer-scale SIF representation rather than as an assumption that all input satellite observations natively occur at 5 × 5 km resolution.

Climate information for 5 × 5 km cells is inherited from the corresponding 10 × 10 km parent cell.

Consequently, multiple 5 × 5 km cells can contain distinct forest/SIF information while sharing the same parent-cell climate context.

---

# Data sources

The Finnish Forest SIF Explorer integrates satellite, forest, meteorological, and peatland spatial datasets from several data providers.

## Solar-induced chlorophyll fluorescence (SIF)

Solar-induced chlorophyll fluorescence data are based on **TROPOMI Level-3 SIF products generated by the Finnish Meteorological Institute (FMI)**.

TROPOMI is carried aboard the Copernicus Sentinel-5 Precursor satellite. The Level-2 satellite data are provided by the European Space Agency (ESA), while FMI generates the Level-3 gridded products used in this analysis.

The FMI Level-3 processing uses spatial binning to generate gridded TROPOMI products. For SIF, FMI reports a Level-3 grid resolution of approximately **0.05° latitude × 0.1° longitude** and applies a SIF validity threshold greater than 50.

The Explorer uses monthly SIF information for the analysis period **2019–2025**.

**Source and product information:**  
https://sampo.fmi.fi/tropomi_l3/

**FMI TROPOMI Level-3 documentation:**  
https://sampo.fmi.fi/tropomi_l3/info.php

**FMI monthly SIF product interface:**  
https://sampo.fmi.fi/tropomi_l3/tropomi_l3dev.php?date=20260910&product=SIF&mode=monthly&count=10

**Acknowledgement:**  
The TROPOspheric Monitoring Instrument (TROPOMI) is co-funded by ESA and NSO and is aboard the Copernicus Sentinel-5 Precursor satellite. ESA provided the Level-2 data, and the Finnish Meteorological Institute (FMI) generated the Level-3 images and data files.

---

## Forest information

Forest information is derived from the **Finnish Multi-Source National Forest Inventory (MS-NFI / VMI)** spatial datasets produced by the **Natural Resources Institute Finland (Luke)**.

These data provide spatial information used to characterize forest composition and productive-forest conditions within the analysis grid.

The Explorer uses the forest information to derive stable forest-composition classes and to quantify the representation of productive forest within individual grid cells.

Forest classes represented in the current Explorer include:

- Pine
- Pine–spruce
- Birch–pine
- Birch–spruce
- Spruce
- Other broadleaf–pine
- Complex mixed forest

**Source:**  
https://www.nic.funet.fi/index/geodata/luke/vmi/

The VMI geodata archive contains spatial products from multiple inventory/reference years. Users interested in the original forest datasets, definitions, methodology, licensing, and reuse conditions should consult the corresponding Luke/VMI documentation.

---

## Meteorological information

Meteorological information is derived from **ERA5-Land Monthly Aggregated** data accessed through the **Google Earth Engine Data Catalog**.

ERA5-Land is a land-surface reanalysis produced within the framework of the **Copernicus Climate Change Service (C3S)** and the **European Centre for Medium-Range Weather Forecasts (ECMWF)**.

The Google Earth Engine product used in the analysis is:

~~~text
ECMWF/ERA5_LAND/MONTHLY_AGGR
~~~

The dataset contains monthly aggregates of ERA5-Land variables at a nominal pixel size of approximately **11 km**.

Meteorological variables used in the analysis include information related to:

- 2 m air temperature;
- 2 m dew-point temperature;
- vapour pressure deficit derived from temperature and dew-point information;
- snow depth;
- soil-water conditions;
- solar radiation;
- precipitation.

The public Explorer exposes selected meteorological variables for filtering and environmental comparison, including **air temperature, vapour pressure deficit (VPD), and snow depth**.

Precipitation remains in the underlying analysis data but is not exposed as an annual precipitation filter or environmental comparison because the available records used in this analysis do not provide complete twelve-month calendar-year coverage.

For the 5 × 5 km representation, climate information is inherited from the associated 10 × 10 km parent cell.

**Google Earth Engine Data Catalog:**  
https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_MONTHLY_AGGR

**Dataset citation:**

Muñoz Sabater, J. (2019). *ERA5-Land monthly averaged data from 1981 to present*. Copernicus Climate Change Service (C3S) Climate Data Store (CDS).  
https://doi.org/10.24381/cds.68d2bb30

**Copernicus acknowledgement:**  
Contains modified Copernicus Climate Change Service Information.

Neither the European Commission nor ECMWF is responsible for any use that may be made of the Copernicus information or data contained in this application.

---

## Peatland information

Peatland characteristics are derived from Finnish spatial datasets describing **mires, drained peatlands, peatland site characteristics, and peatland forest types**.

The peatland information used by the Explorer provides environmental context for examining SIF patterns across Finnish forest and peatland environments.

The processed grid-cell information includes variables such as:

- total peatland fraction;
- dominant drainage status;
- dominant site information.

The public Explorer uses these data to support **peatland-fraction filtering**, **drainage-status filtering**, and environmental comparisons.

Relevant source organizations and documentation include the **Natural Resources Institute Finland (Luke)** and the **Geological Survey of Finland (GTK)**.

**Natural Resources Institute Finland (Luke) — national peatland spatial dataset:**  
https://www.luke.fi/en/news/first-spatial-dataset-on-peatlands-covers-mires-and-drained-peatlands-throughout-finland

**Geological Survey of Finland (GTK) — Suotyypit ja turvekankaat metadata:**  
https://tupa.gtk.fi/paikkatieto/meta/suotyypit_ja_turvekankaat.html

Users should consult the original Luke and GTK documentation for detailed descriptions of the source datasets, classifications, methodology, licensing, and recommended citation practices.

---

# Data attribution

The Finnish Forest SIF Explorer is a derived scientific application. The data presented by the Explorer have been processed, spatially integrated, filtered, and summarized from several original data sources.

Use of the Explorer does not transfer ownership of the underlying source datasets.

The original data providers should be acknowledged where appropriate:

- **Finnish Meteorological Institute (FMI)** — TROPOMI Level-3 solar-induced chlorophyll fluorescence products;
- **European Space Agency (ESA) / Copernicus Sentinel-5 Precursor** — underlying TROPOMI satellite observations;
- **Natural Resources Institute Finland (Luke)** — Multi-Source National Forest Inventory (MS-NFI / VMI) forest information and peatland spatial information;
- **European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus Climate Change Service (C3S)** — ERA5-Land meteorological reanalysis;
- **Google Earth Engine** — access to the ERA5-Land Monthly Aggregated data used in the analysis;
- **Geological Survey of Finland (GTK)** — peatland and peatland-forest spatial information.

Users wishing to reuse or redistribute the underlying source data should consult the licences, terms of use, and citation requirements of the respective original data providers.

The Finnish Forest SIF Explorer represents a processed analytical product and should not be treated as a replacement for the authoritative source datasets.

---

# Technical implementation

The Finnish Forest SIF Explorer is a static client-side web application.

Core technologies include:

- HTML
- CSS
- JavaScript
- MapLibre GL JS
- Plotly
- Papa Parse

No application server or database is required for the public Explorer.

The browser loads the required spatial and scientific datasets directly from static files in the repository.

---

# Map

The interactive map uses **MapLibre GL JS**.

The map provides spatial visualization and selection of eligible forest cells and geographic context for the analysis.

Filtering and comparison operate on analytical attributes associated with the grid cells rather than depending on decorative map overlays.

---

# Plotting

Interactive scientific plots are rendered using **Plotly**.

Plots respond to the current application state, including:

- Explore or Compare mode;
- Signature or Time-series view;
- 5 × 5 km or 10 × 10 km scale;
- spatial selection;
- forest class;
- productive-forest coverage;
- environmental filters;
- comparison groups;
- variability and uncertainty display settings.

---

# Running locally

Because the Explorer loads data files through browser requests, the repository should be served through a local HTTP server rather than opening `index.html` directly using a `file://` URL.

For example, with Python installed, run the following command from the repository root:

~~~bash
python -m http.server 8000
~~~

Then open:

~~~text
http://localhost:8000/
~~~

in a web browser.

---

# GitHub Pages deployment

The application is designed to work as a static GitHub Pages site.

The deployed site root must contain:

~~~text
index.html
css/
js/
data/
~~~

The complete `data/` directory must be retained because the application loads spatial data, seasonal signatures, group time series, indexes, and individual time-series shards dynamically.

No build framework or compilation step is required.

---

# Important interpretation notes

When using the Explorer, several methodological distinctions should be kept in mind.

### SIF is not a direct measurement of carbon uptake

Solar-induced chlorophyll fluorescence is associated with photosynthetic processes, but SIF should not automatically be interpreted as a direct measurement of gross primary productivity, net ecosystem exchange, or carbon sequestration.

### Spatial variability is within-cell variability

The spatial variability displayed by the application describes native SIF heterogeneity within grid cells.

It should not be interpreted as the variability among the mean SIF values of selected grid cells.

### Retrieval uncertainty is separate from biological variability

Retrieval uncertainty describes uncertainty associated with the satellite SIF retrieval and is not equivalent to temporal ecological variability or spatial heterogeneity.

### Temporal variability is used for seasonal signatures

Interannual variability is represented in the Signature view using the precomputed month-specific interannual SIF standard deviation.

It is not used as a monthly Time-series uncertainty ribbon.

### Missing winter observations remain missing

The application does not interpolate unavailable winter SIF observations.

### Climate summaries reflect the available analysis observations

Environmental climate summaries should be interpreted in the context of the available analysis-month records.

In particular, precipitation records do not constitute complete twelve-month annual totals and are therefore not exposed as an annual precipitation comparison/filter in the public Explorer.

### Spatial scales have different interpretations

The 5 × 5 km representation provides finer mapped spatial detail, while the 10 × 10 km representation provides the coarser analysis context.

Climate information for 5 × 5 km cells is inherited from their corresponding 10 × 10 km parent cells.

### Environmental comparisons are descriptive

Environmental group comparisons are intended for exploratory analysis.

A difference between two environmental groups should not by itself be interpreted as evidence that the compared environmental variable caused the observed SIF difference.

---

# Reproducibility and data integrity

The deployed version of the Explorer was prepared as a frozen static publication package.

Before publication, the package was checked for:

- valid JavaScript syntax;
- valid browser HTML structure;
- required spatial and scientific data files;
- expected displayed grid-cell counts;
- required seasonal-signature fields;
- time-series indexes;
- all indexed time-series shards;
- group time-series packages;
- valid JSON files;
- local static asset references;
- absence of local development paths;
- preservation of the final application structure.

The publication package also contains a deployment inventory with file sizes and SHA-256 hashes that can be used for integrity checking.

---

# Browser and performance notes

The Explorer processes spatial and scientific data directly in the browser.

Performance can therefore depend on:

- network speed;
- browser;
- device memory;
- selected spatial scale;
- number of eligible cells;
- selected comparison mode.

Individual cell-level monthly time series are sharded and loaded on demand to reduce unnecessary initial data transfer.

For the best experience, a current desktop browser is recommended.

---

# Citation

If you use the Finnish Forest SIF Explorer in research, teaching, presentations, or other published work, please cite the associated research output and datasets when formal citation information becomes available.

A permanent software citation can be added here if the repository is subsequently archived and assigned a persistent identifier such as a DOI.

---

# License

No software or data license is specified by this README.

The source datasets may have their own licensing and attribution requirements.

Before redistributing or reusing the application or bundled datasets, users should consult the applicable terms of the original data providers and any repository-level `LICENSE` file.

---

# Live application

**Finnish Forest SIF Explorer**

https://lukamamic13.github.io/finnish-forest-sif-explorer/

Interactive exploration of forest solar-induced chlorophyll fluorescence across Finland at **5 × 5 km** and **10 × 10 km** spatial scales.

**Data period: 2019–2025**
