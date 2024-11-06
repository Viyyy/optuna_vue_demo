<template>
    <div class="common-layout">
        <el-container>
            <el-header class="header">
                <el-select v-model="selectedStudy" placeholder="Select a Study">
                    <template #prefix>
                        <label>Study ·</label>
                    </template>
                    <el-option v-for="study in studies.data" :key="study" :label="study" :value="study"></el-option>
                </el-select>

                <el-select v-model="selectedDimensions" placeholder="Select Params" multiple clearable collapse-tags
                    :max-collapse-tags="1">
                    <template #prefix>
                        <label>Params ·</label>
                    </template>
                    <template #header>
                        <el-checkbox v-model="checkAll" :indeterminate="indeterminate" @change="handleCheckAll">
                            All
                        </el-checkbox>
                    </template>
                    <el-option v-for="dimension in dimensions.data" :key="dimension.dim" :label="dimension.name"
                        :value="dimension.dim"></el-option>
                </el-select>

                <el-select v-model="selectedMetric" placeholder="Select a metric">
                    <template #prefix>
                        <label>Metric ·</label>
                    </template>
                    <el-option v-for="metric in metrics.data" :key="metric" :label="metric" :value="metric"></el-option>
                </el-select>

                <el-button type="primary" @click="drawChart">Draw</el-button>
            </el-header>

            <el-main class="main">
                <div ref="chart" id="chart" v-loading="loading"></div>
                <el-slider :display="minValue !== null && maxValue !== null" v-model="sliderValue" vertical range
                    :show-input="true" :min="minValue" :max="maxValue" :step="0.001" height="480px"
                    @change="updateValues" />
            </el-main>
        </el-container>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { get_studies, get_dimensions, get_metrics, get_study_details } from "~/api/optuna";
import * as echarts from "echarts";

const studies = reactive({ data: [] });
const selectedStudy = ref("");
const metrics = reactive({ data: [] });
const selectedMetric = ref("");
const minValue = ref(null);
const maxValue = ref(null);
const sliderValue = ref([null, null]);
const chart = ref(null);
const chartData = ref([]);
const chartAxises = ref([]);
const dimensions = reactive({ data: [] });
const selectedDimensions = ref([]);
const checkAll = ref(false);
const indeterminate = ref(false);
const loading = ref(false);

function handleCheckAll(value) {
    selectedDimensions.value = value ? dimensions.data.map(d => d.dim) : [];
    checkAll.value = value;
    indeterminate.value = false;
    setChart();
}

function fetchStudy() {
    get_studies().then(data => {
        studies.data = data.data.studies;
    });
}

function fetchDimensions(studyName) {
    get_dimensions(studyName).then(data => {
        dimensions.data = data.data.data;
    });
}

function fetchMetric() {
    get_metrics().then(data => {
        metrics.data = data.data.data;
    });
}

function setChart() {
    if (!chartAxises.value.length || !selectedDimensions.value.length) {
        console.log("chartAxises or selectedDimensions is empty");
        return;
    }

    if (myChart) {
        myChart.clear();
    }

    const parallelAxis = chartAxises.value
        .filter(axis => selectedDimensions.value.includes(axis.dim) || axis.dim === chartAxises.value.length - 1)
        .sort((a, b) => a.dim - b.dim);

    if (minValue.value === null || maxValue.value === null) {
        minValue.value = parallelAxis[parallelAxis.length - 1].min;
        maxValue.value = parallelAxis[parallelAxis.length - 1].max;
        sliderValue.value = [minValue.value, maxValue.value];
    }

    const drawData = chartData.value.filter(item => item[item.length - 1] < maxValue.value && item[item.length - 1] > minValue.value);

    const option = {
        title: {
            text: `${selectedStudy.value} - ${selectedMetric.value}`,
            left: "center",
        },
        tooltip: {
            trigger: "item",
            formatter: params => {
                return chartAxises.value
                    .map(axis => `<b>${axis.name}</b>: ${params.value[axis.dim]}`)
                    .join("<br>");
            },
        },
        visualMap: {
            show: true,
            text: [maxValue.value, minValue.value],
            realtime: false,
            min: minValue.value,
            max: maxValue.value,
            dimension: chartAxises.value[chartAxises.value.length - 1].dim,
            inRange: {
                color: ["#d94e5d", "#eac736", "#50a3ba"].reverse(),
            },
            orient: "vertical",
            left: "right",
            top: "center",
            itemHeight: "480px",
            itemWidth: 20,
        },
        parallelAxis: parallelAxis,
        parallel: {
            left: "5%",
            right: "15%",
            bottom: "10%",
            top: "10%",
            width: "80%",
            height: "80%",
        },
        series: [
            {
                type: "parallel",
                lineStyle: {
                    width: 1.5,
                    opacity: 0.5,
                },
                emphasis: {
                    lineStyle: {
                        width: 3,
                        opacity: 1,
                        color: "#08eff3",
                    },
                },
                data: drawData,
            },
        ],
    };

    myChart.setOption(option);
}

function updateValues([min, max]) {
    drawChart();
}

let myChart;
function drawChart() {
    loading.value = true;

    get_study_details(selectedStudy.value, selectedMetric.value, sliderValue.value[0], sliderValue.value[1])
        .then(data => {
            chartData.value = data.data.datas;
            chartAxises.value = data.data.axis;
            setChart();
        })
        .finally(() => {
            loading.value = false;
        });
}

watch(selectedStudy, () => {
    minValue.value = null;
    maxValue.value = null;
    fetchDimensions(selectedStudy.value);
});

watch(selectedDimensions, () => {
    if (chartAxises.value.length && selectedDimensions.value.length) {
        setChart();
    }
});

watch(selectedMetric, () => {
    minValue.value = null;
    maxValue.value = null;
    sliderValue.value = [null, null];
});

onMounted(() => {
    myChart = echarts.init(chart.value);
    fetchStudy();
    fetchMetric();
});

document.addEventListener("keydown", event => {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
        drawChart();
    }
});
</script>

<style scoped>
label {
    color: #3b2e2e !important;
    font-weight: bold;
    font-size: 14px;
}

.el-button {
    margin-left: 10px !important;
}

.header {
    height: 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.main {
    height: 650px;
    position: relative;
    width: 100%;
    border: 1px solid #3b2e2e;
    border-radius: 5px;
    padding: 3%;
    margin: 10px;
}

.main .el-slider {
    --el-slider-main-bg-color: rgb(0, 3, 4) !important;
    --el-slider-runway-bg-color: rgb(192, 222, 236) !important;
    --el-slider-border-radius: 0px;
    --el-slider-button-size: 15px;
    opacity: 0.3;
    height: 100%;
    top: 0;
    right: 33px;
    position: absolute;
    z-index: 999;
}

#chart {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>