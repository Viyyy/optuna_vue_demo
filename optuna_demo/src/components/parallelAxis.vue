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
                    :max-collapse-tags="1" style="max-width: 230px;" :disabled="dimensions.data.length === 0">
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

                <el-select v-model="selectedMetric" placeholder="Select a metric" style="max-width: 170px;">
                    <template #prefix>
                        <label>Metric ·</label>
                    </template>
                    <el-option v-for="metric in metrics.data" :key="metric" :label="metric" :value="metric"></el-option>
                </el-select>


                <el-tooltip :content="'Keep the range of the selected metric'" placement="top">
                    <el-switch v-model="keepRange" inline-prompt
                        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949; font-weight: bold;"
                        active-text="Fixed" inactive-text="Dynamic" />
                </el-tooltip>

                <el-button type="primary" @click="drawChart">Draw</el-button>
            </el-header>

            <el-main class="main">
                <div ref="chart" id="chart" v-loading="loading"></div>
                <el-slider :display="minValue !== null && maxValue !== null" v-model="sliderValue" vertical range
                    :show-input="true" :min="minValue" :max="maxValue" :step="0.0001" height="480px"
                    @change="handlerSlider" />
            </el-main>
        </el-container>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { get_studies, get_dimensions, get_metrics, get_study_details } from "~/api/optuna";
import * as echarts from "echarts";
import { toast } from "~/utils/common"

const colormap = [
    "#0000ff",
    "#0044cc",
    "#008899",
    "#00cc66",
    "#33cc33",
    "#66cc00",
    "#99cc00",
    "#cccc00",
    "#e6b800",
    "#ff9900",
    "#ff6600",
    "#ff3300",
    "#ff0000",
    "#cc0000",
    "#990000"
];
const studies = reactive({ data: [] });
const selectedStudy = ref("");
const metrics = reactive({ data: [] });
const selectedMetric = ref("");
const minValue = ref(null);
const maxValue = ref(null);
const sliderValue = ref([null, null]);
let myChart;
const chart = ref(null);
const chartData = ref([]);
const chartAxises = ref([]);
const dimensions = reactive({ data: [] });
const selectedDimensions = ref([]);
const checkAll = ref(false);
const indeterminate = ref(false);
const loading = ref(false);
const keepRange = ref(true);



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
    }).finally(() => {
        handleCheckAll(true);
    });
}

function fetchMetric() {
    get_metrics().then(data => {
        metrics.data = data.data.data;
    });
}

function clearChart() {
    try {
        myChart.clear();
    } catch (error) {
        console.log(error);
    }
}

function clearData() {
    chartData.value = [];
    chartAxises.value = [];
}

function setChart() {
    if (!chartAxises.value.length || !selectedDimensions.value.length) {
        console.log("chartAxises or selectedDimensions is empty");
        return;
    }

    clearChart();

    const parallelAxis = chartAxises.value
        .filter(axis => selectedDimensions.value.includes(axis.dim) || axis.dim === chartAxises.value.length - 1)
        .sort((a, b) => a.dim - b.dim);

    if (keepRange.value) {
        if (!rangeInitialized()) {
            updateRange(parallelAxis[parallelAxis.length - 1].min, parallelAxis[parallelAxis.length - 1].max);
        }
        if (!sliderInitialized()) {
            updateSlider(parallelAxis[parallelAxis.length - 1].min, parallelAxis[parallelAxis.length - 1].max);
        }
    }
    else {
        updateRange(parallelAxis[parallelAxis.length - 1].min, parallelAxis[parallelAxis.length - 1].max);
        if (!sliderInitialized()) {
            updateSlider(parallelAxis[parallelAxis.length - 1].min, parallelAxis[parallelAxis.length - 1].max);
        }
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
            // realtime: false,
            min: minValue.value,
            max: maxValue.value,
            dimension: chartAxises.value[chartAxises.value.length - 1].dim,
            inRange: {
                color: colormap,
            },
            orient: "vertical",
            left: "right",
            top: "center",
            itemHeight: "480px",
            itemWidth: 20,
            formatter: function (p) {
                // 如果是float，保留4位
                try {
                    return `${selectedMetric.value}: ${parseFloat(p).toFixed(4)}`;
                } catch (error) {
                    return ''; // 返回空字符串以隐藏数值
                }
            }
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

function updateSlider(sliderMin, sliderMax) {
    sliderValue.value = [sliderMin, sliderMax];
}

function rangeInitialized() {
    return !(minValue.value === null || maxValue.value === null)
}

function sliderInitialized() {
    return !sliderValue.value.includes(null)
}

function updateRange(min, max) {
    minValue.value = min;
    maxValue.value = max;
}

function clearRange() {
    updateRange(null, null);
    updateSlider(null, null);
}

function handlerSlider([min, max]) {
    drawChart();
}


function drawChart() {
    loading.value = true;
    if (selectedStudy.value === "" || selectedStudy.value === null) {
        toast("Please select a study", "warning");
        loading.value = false;
        return;
    }
    if (selectedMetric.value === null || selectedMetric.value === "") {
        toast("Please select a metric", "warning");
        loading.value = false;
        return;
    }
    if (selectedDimensions.value.length === 0) {
        toast("Please select at least one parameter", "warning");
        loading.value = false;
        return;
    }
    get_study_details(selectedStudy.value, selectedMetric.value, selectedDimensions.value).then(data => {
        chartData.value = data.data.data;
        chartAxises.value = data.data.axises;
        get_study_details(selectedStudy.value, selectedMetric.value, sliderValue.value[0], sliderValue.value[1], keepRange.value)
            .then(data => {
                chartData.value = data.data.datas;
                chartAxises.value = data.data.axis;
                setChart();
            })
            .finally(() => {
                loading.value = false;
            });
    });
}

watch(selectedStudy, () => {
    fetchDimensions(selectedStudy.value);
    selectedMetric.value = null;
    clearData();
    clearChart();
});

watch(selectedDimensions, () => {
    if (chartAxises.value.length && selectedDimensions.value.length) {
        setChart();
    }
});

watch(selectedMetric, () => {
    clearRange();
});

watch(keepRange, (newVal, oldVal) => {
    if (newVal && !oldVal) { // 切换到固定范围
        clearRange();
    }
    drawChart();
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

.el-switch {
    /* margin-top: 8px !important; */
    margin-left: 10px;
}

#chart {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>