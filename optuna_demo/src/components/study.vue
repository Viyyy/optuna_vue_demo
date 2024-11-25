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
                    :max-collapse-tags="1" style="max-width: 230px;" :disabled="!hyperparams.data.length">
                    <template #prefix>
                        <label>Params ·</label>
                    </template>
                    <template #header>
                        <el-checkbox v-model="checkAll" :indeterminate="indeterminate"
                            @change="handleCheckAll">All</el-checkbox>
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
                <el-slider v-if="minValue !== null && maxValue !== null" v-model="sliderValue" vertical range
                    :show-input="true" :min="minValue" :max="maxValue" :step="0.0001" height="480px"
                    @change="drawChart" />
            </el-main>
        </el-container>
    </div>
    <el-drawer v-model="drawer" :title="activeDrawer.title" size="700px">
        <div>
            <div class="header">
                <AudioUploader @audio-uploaded="handleUpload" />
                <el-button type="primary" @click="handlePredict">
                    <el-icon><PieChart /></el-icon>
                    Predict
                </el-button>
            </div>
        
            <PredictResult :audioFile="audioFile" ref="resultComponent" />
        </div>
    </el-drawer>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { get_studies, get_tasks, get_metrics, get_hyperparams, get_best_logs } from "../api/analysor";
import * as echarts from "echarts";
import { toast } from "~/utils/common"
import AudioUploader from '~/components/audioUploader.vue';
import PredictResult from '~/components/predictResult.vue';
import { createPredictor } from '~/api/predictor';
import { PieChart } from '@element-plus/icons-vue';

const colormap = ["#0000ff", "#0044cc", "#008899", "#00cc66", "#33cc33", "#66cc00", "#99cc00", "#cccc00", "#e6b800", "#ff9900", "#ff6600", "#ff3300", "#ff0000", "#cc0000", "#990000"];


const studies = reactive({ data: [] });
const selectedStudy = ref("");
const metrics = reactive({ data: [] });
const selectedMetric = ref("");
const minValue = ref(null);
const maxValue = ref(null);
const sliderValue = ref([null, null]);
let myChart;
const chart = ref(null);
const hyperparams = reactive({ data: [] });
const selectedParams = ref([]);
const checkAll = ref(false);
const indeterminate = ref(false);
const loading = ref(false);
const keepRange = ref(true);
const drawer = ref(false);
const activeDrawer = reactive({ task_id: null, title: null })
const audioFile = ref(null);
const taskId = ref(null);
const resultComponent = ref(null);
const handleUpload = (url, file) => {
    audioFile.value = file;
    toast('Upload successful');
};
  
const handlePredict = async () => {
    createPredictor(taskId.value).then(response => {
    const predictor_id = response.data.predictor_id;
    resultComponent.value.predictAudio(predictor_id);
    });
};

function handleCheckAll(value) {
    selectedParams.value = value ? hyperparams.data.map(d => d.dim) : [];
    checkAll.value = value;
    indeterminate.value = false;
    drawChart();
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

function updateSlider(sliderMin, sliderMax) {
    sliderValue.value = [sliderMin, sliderMax];
}

function clearRange() {
    updateRange(null, null);
    updateSlider(null, null);
}

function fetchStudies() {
    get_studies().then(response => {
        studies.data = response.data;
        selectedStudy.value = response.data[0]?.id;
    });
}

function fetchStudyParams(study_id) {
    get_hyperparams(study_id, 2).then(response => {
        hyperparams.data = response.data;
        handleCheckAll(true);
    });
}

function fetchMetrics() {
    get_metrics().then(response => {
        metrics.data = response.data;
        selectedMetric.value = response.data[0]?.id;
    });
}

function fetchChartData() {
    Promise.all([get_tasks(selectedStudy.value), get_best_logs(selectedStudy.value, selectedMetric.value)])
        .then(([tasksResponse, logsResponse]) => {
            const taskData = tasksResponse.data;
            const logData = logsResponse.data;
            const { axisData, chartData } = prepareChartData(taskData, logData);
            loadChart(axisData, chartData);
        })
        .finally(() => {
            loading.value = false;
        });
}

function prepareChartData(taskData, logData) {
    const min = parseFloat(Math.min(...logData.map(item => item.value)).toFixed(4)) - 0.0001;
    const max = parseFloat(Math.max(...logData.map(item => item.value)).toFixed(4)) + 0.0001;

    if (!sliderInitialized()) {
        updateSlider(min, max);
    }
    if (keepRange.value) { // fixed range
        if (!rangeInitialized()) {
            updateRange(min, max);
        }
    }
    else { // dynamic range
        updateRange(sliderValue.value[0], sliderValue.value[1]);
    }


    let axisData = [
        { dim: 0, name: "ID", type: "category" },
        { dim: 1, name: "Task", type: "category" },
        ...hyperparams.data,
    ];
    axisData.push({
        dim: axisData.length,
        name: metrics.data.find(m => m.id === selectedMetric.value).name,
        type: "value",
        min: keepRange.value ? min : sliderValue.value[0],
        max: keepRange.value ? max : sliderValue.value[1]
    });


    var logDataFiltered = logData.filter(item => item.value >= sliderValue.value[0] && item.value <= sliderValue.value[1]);
    var taskDataFiltered = taskData.filter(item => logDataFiltered.some(log => log.task_id === item.id));
    const chartData = taskDataFiltered.map(task => {
        const log = logDataFiltered.find(item => item.task_id === task.id);
        return [task.id, task.name, ...hyperparams.data.map(p => task.hyper_params[p.name]), log.value];
    });

    return { axisData, chartData };
}

function clearChart() {
    try {
        myChart.clear();
    } catch (error) {
        console.log(error);
    }
}

function loadChart(axisData, chartData) {
    if (!myChart) return;

    clearChart();
    const axis = axisData.filter(item => selectedParams.value.includes(item.dim) || item.dim === axisData.length - 1);

    const option = {
        title: {
            text: `【${studies.data.find(s => s.id === selectedStudy.value).name}】 - ${chartData.length} Tasks - ${metrics.data.find(m => m.id === selectedMetric.value).name}`,
            left: "center",
        },
        tooltip: {
            trigger: "item",
            formatter: params => {
                const details = axisData.map(a => {
                    const value = params.value[a.dim];
                    const formattedValue = (typeof value === 'number' && !Number.isInteger(value)) ? value.toFixed(5) : value;
                    return `<b>· ${a.name}</b>: ${formattedValue}`;
                }).join("<br>");
                return `
                    <div style="display: block; margin-bottom: 5px;">
                        ${details}
                    </div>
                    <hr style="margin: 5px 0; border: 1.5px solid #ccc;" />
                    <div style="display: flex; justify-content: center;">
                        <button 
                            style=" color: #fff; background-color: #409eff; border: 1px solid #409eff; border-radius: 4px; padding: 5px 10px 5px 10px; font-size: 13px; cursor: pointer;" 
                            :disabled="drawer.value"
                            onclick="handleDrawer('${params.value[0]}')">Predict</button>
                    </div>
                `;
            },
            enterable: true,
            transitionDuration: 0.4,
            hideDelay: 1000
        },
        visualMap: {
            show: true,
            min: minValue.value,
            max: maxValue.value,
            dimension: axis[axis.length - 1].dim,
            inRange: { color: colormap },
            orient: "vertical",
            left: "right",
            top: "center",
            itemHeight: "480px",
            formatter: p => `${metrics.data.find(m => m.id === selectedMetric.value).name}: ${parseFloat(p).toFixed(4)}`,
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
        series: [{
            type: "parallel",
            smooth: true,
            lineStyle: { width: 1.5, opacity: 0.5 },
            emphasis: { lineStyle: { width: 3, opacity: 1, color: "#08eff3" } },
            data: chartData,
        }],
    };

    myChart.setOption(option);
}

function drawChart() {

    if (selectedStudy.value === "" || selectedStudy.value === null) {
        toast("Please select a study", "warning");
        return;
    }
    if (selectedMetric.value === null || selectedMetric.value === "") {
        toast("Please select a metric", "warning");
        return;
    }
    if (selectedParams.value.length === 0) {
        toast("Please select at least one parameter", "warning");
        return;
    }
    loading.value = true;
    fetchChartData();
}

window.handleDrawer = (task_id) => {


    get_tasks(selectedStudy.value).then(response => {
        const tasks = response.data;        
        const task_name = tasks.find(t => t.id == task_id).name;
        taskId.value = parseInt(task_id);
        activeDrawer.task_id = task_id;
        activeDrawer.title = `Prediction for Task: ${task_name}`;
        if (resultComponent.value) {
            resultComponent.value.clearChart();
        }
    }).finally(() => {
        drawer.value = true;
    });
}


watch(selectedParams, () => {
    drawChart();
});

watch(keepRange, (newVal, oldVal) => {
    if (newVal && !oldVal) { // 切换到固定范围
        clearRange();
    }
    drawChart();
});

watch(selectedMetric, () => {
    clearRange();
    drawChart();
});

watch(selectedStudy, () => {
    fetchStudyParams(selectedStudy.value);
    fetchMetrics();
    clearChart();
    clearRange();
});

watch(audioFile, (newVal, oldVal) => {
    if (!newVal) {
        resultComponent.value.clearChart();
    }
    else {
        handlePredict();
    }
  })

// watch(taskId, () => {
//     resultComponent.value.clearChart();
// })

onMounted(() => {
    myChart = echarts.init(chart.value);
    fetchStudies();
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

.btn-predict {
    margin-left: 10px;
    color: #fff !important;
    font-weight: bold;
    border: 1px solid #3b2e2e !important;
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
    margin-left: 10px;
}

#chart {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>