<template>
    <div class="common-layout">
        <el-container>
            <el-header class="header">
                <el-select v-model="selectedStudy" placeholder="Select a Study" style="max-width: 350px;">
                    <template #prefix>
                        <label>Study ·</label>
                    </template>
                    <el-option v-for="study in studies.data" :key="study.id" :label="study.name"
                        :value="study.id"></el-option>
                </el-select>

                <el-select v-model="selectedParams" placeholder="Select Params" multiple clearable collapse-tags
                    :max-collapse-tags="1" style="max-width: 230px;" :disabled="hyperparams.data.length === 0">
                    <template #prefix>
                        <label>Params ·</label>
                    </template>
                    <template #header>
                        <el-checkbox v-model="checkAll" :indeterminate="indeterminate" @change="handleCheckAll">
                            All
                        </el-checkbox>
                    </template>
                    <el-option v-for="param in hyperparams.data" :key="param.dim" :label="param.name"
                        :value="param.dim"></el-option>
                </el-select>

                <el-select v-model="selectedMetric" placeholder="Select a metric" style="max-width: 170px;">
                    <template #prefix>
                        <label>Metric ·</label>
                    </template>
                    <el-option v-for="metric in metrics.data" :key="metric.id" :label="metric.name"
                        :value="metric.id"></el-option>
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
import { ref, reactive, onMounted, watch, onUnmounted } from "vue";
import { get_studies, get_tasks, get_metrics, get_hyperparams, get_best_logs } from "../api/analysor";
import * as echarts from "echarts";
import { toast } from "~/utils/common"
import { ta } from "element-plus/es/locale/index.mjs";

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
const hyperparams = reactive({ data: [] });
const selectedParams = ref([]);
const checkAll = ref(false);
const indeterminate = ref(false);
const loading = ref(false);
const keepRange = ref(true);

const drawData = ref(null);



function handleCheckAll(value) { // 参数全选/全不选
    selectedParams.value = value ? hyperparams.data.map(d => d.dim) : [];
    checkAll.value = value;
    indeterminate.value = false;
    setChart();
}

function fetchStudy() { // 获取Study列表
    get_studies().then(response => {
        studies.data = response.data;
        selectedStudy.value = response.data[0].id;
        fetchStudyParams(selectedStudy.value);
    });
}

function fetchStudyParams(study_id) { // 获取参数列表
    get_hyperparams(study_id).then(response => {
        hyperparams.data = response.data;
        handleCheckAll(true);
    })
}


function fetchMetric() { // 获取指标列表
    get_metrics().then(response => {
        metrics.data = response.data;
        selectedMetric.value = response.data[0].id;
    });
}


const task_data = reactive({ data: [] });
const log_data = reactive({ data: [] });

function fetchTasks() { // 获取任务列表
    get_tasks(selectedStudy.value).then(response => {
        task_data.data = response.data;
    })
}

function fetchBestLogs() { // 获取最优日志
    get_best_logs(selectedStudy.value, selectedMetric.value).then(response => {
        log_data.data = response.data;
    })
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

function get_chart_data(task_data, log_data) { // 获取图表数据
    const minValue = Math.min(...log_data.map(item => item.value));
    const maxValue = Math.max(...log_data.map(item => item.value));

    var axis_data = [
        { dim: 0, name: "Task", type: "category" },
        ...hyperparams.data,
        { dim: hyperparams.data.length, name: selectedMetric.value, type: "value", min: minValue, max: maxValue }
    ]


    var chart_data = [];
    for (let i = 0; i < task_data.length; i++) {
        const task = task_data[i];
        const log = log_data.find(item => item.task_id === task.id);
        chart_data.push([
            task.name,
            ...hyperparams.data.map(p => task.hyper_params[p.name]),
            log.value
        ])
    }

    drawData.value = {
        'axis': axis_data,
        'data': chart_data,
        'min': minValue,
        'max': maxValue
    }
}

function loadChart() {
    clearChart();
    const chart_data = drawData.value;

    if (chart_data === null) {
        console.log("chart_data is null");
        return;
    }

    var axis = chart_data.axis.filter(item => selectedParams.value.includes(item.dim) || item.dim === chart_data.axis.length - 1);

    const option = {
        title: {
            text: `【${selectedStudy.value}】 - ${chart_data.data.length} Tasks - ${selectedMetric.value}`,
            left: "center",
        },
        tooltip: {
            trigger: "item",
            formatter: params => {
                return axis
                    .map(axis => `<b>${axis.name}</b>: ${params.value[axis.dim]}`)
                    .join("<br>");
            },
        },
        visualMap: {
            show: true,
            text: [chart_data.min, chart_data.max],
            // realtime: false,
            min: chart_data.min,
            max: chart_data.max,
            dimension: axis[axis.length - 1].dim,
            inRange: {
                // color: colormap,
                color: ["red", "yellow", "green"],
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
        parallelAxis: axis,
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
                smooth: true,
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
                data: chart_data.data,
            },
        ],
    };

    console.log(option);
    myChart.setOption(option);
}
function setChart() {
    return;
    clearChart();

    const parallelAxis = chartAxises.value
        .filter(axis => selectedParams.value.includes(axis.dim) || axis.dim === chartAxises.value.length - 1)
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
            text: `【${selectedStudy.value}】 - ${drawData.length} Tasks - ${selectedMetric.value}`,
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
                smooth: true,
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


import { nextTick } from 'vue';

function fetchDrawData() {
    Promise.all([
        fetchTasks(),
        fetchBestLogs()
    ]).then(() => {
        get_chart_data(task_data.data, log_data.data);
    }).finally(() => {
        loading.value = false; // Ensure loading is set to false in all cases
        return;
    });
}

function drawChart() {
    const params = hyperparams.data.filter(param => selectedParams.value.includes(param.dim));
    
    loading.value = true;
    // Promise.all([
    //     fetchTasks(),
    //     fetchBestLogs()
    // ]).then(() => {
    //     get_chart_data(task_data.data, log_data.data);
    //     nextTick(() => {
    //         loadChart(); // Ensure this is called after the DOM has been updated
    //     });
    // }).catch(error => {
    //     console.error("Error fetching data:", error);
    // }).finally(() => {
    //     loading.value = false; // Ensure loading is set to false in all cases
    // });
    fetchDrawData();
    loadChart();
}

watch(selectedStudy, () => {
    fetchStudyParams(selectedStudy.value);
    selectedMetric.value = null;
    clearData();
    clearChart();
});

watch(selectedParams, () => {
    // if (chartAxises.value.length && selectedParams.value.length) {
    //     setChart();
    // }
    // else {
    //     drawChart();
    // }
});

watch(selectedMetric, () => {
    // clearRange();
});

watch(keepRange, (newVal, oldVal) => {
    // if (newVal && !oldVal) { // 切换到固定范围
    //     clearRange();
    // }
    // drawChart();
});


onMounted(() => {
    myChart = echarts.init(chart.value);
    fetchStudy();
    fetchMetric();
});

onUnmounted(() => {
    clearChart();
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
    justify-content: left;
    align-items: center;
}

.main {
    height: 650px;
    position: relative;
    width: calc(100% - 20px);
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