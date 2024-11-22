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

                <el-select v-model="selectedTasks" placeholder="Select Tasks" multiple clearable collapse-tags
                    :max-collapse-tags="1" style="max-width: 360px;" :disabled="!tasks.data.length">
                    <template #prefix>
                        <label>Tasks ·</label>
                    </template>
                    <template #header>
                        <el-checkbox v-model="checkAll" :indeterminate="indeterminate" @change="handleCheckAll">
                            All
                        </el-checkbox>
                    </template>
                    <el-option v-for="task in tasks.data" :key="task.id" :label="`Task${task.id}-${task.name}`"
                        :value="task.id"></el-option>
                </el-select>

                <el-select v-model="selectedMetric" placeholder="Select a metric" style="max-width: 170px;">
                    <template #prefix>
                        <label>Metric ·</label>
                    </template>
                    <el-option v-for="metric in metrics.data" :key="metric.id" :label="metric.name"
                        :value="metric.id"></el-option>
                </el-select>

                <el-tooltip :content="'Show end label'" placement="top">
                    <el-switch v-model="showEndLabel" inline-prompt
                        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949; font-weight: bold;"
                        active-text="Show" inactive-text="Hide" />
                </el-tooltip>

                <el-button type="primary" @click="handleDraw">Draw</el-button>
            </el-header>

            <el-main class="main">
                <div ref="chart" id="chart" v-loading="loading"></div>
            </el-main>
        </el-container>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { get_studies, get_tasks, get_metrics, get_train_logs } from "~/api/analysor";
import * as echarts from "echarts";
import {toast} from "~/utils/common";

const studies = reactive({ data: [] });
const selectedStudy = ref("");
const metrics = reactive({ data: [] });
const selectedMetric = ref("");
const tasks = reactive({ data: [] });
const selectedTasks = ref([]);
const checkAll = ref(false);
const indeterminate = ref(false);
const loading = ref(false);
let chartInstance;
const chart = ref(null);
const showEndLabel = ref(true);

const fetchStudies = async () => {
    const response = await get_studies();
    studies.data = response.data;
    selectedStudy.value = response.data[0]?.id || "";
};

const fetchTasks = async (studyId) => {
    const response = await get_tasks(studyId);
    tasks.data = response.data;
    handleCheckAll(true);
};

const fetchMetrics = async () => {
    const response = await get_metrics();
    metrics.data = response.data;
    selectedMetric.value = response.data[0]?.id || "";
};

const handleDraw = async () => {
    if (!selectedTasks.value.length) {
        toast("Please select at least one task.", "warning");
        return;
    }

    if (!selectedMetric.value) {
        toast("Please select a metric.", "warning");
        return;
    }


    clearChart();
    const colormap = ["#0000ff", "#0044cc", "#008899", "#00cc66", "#33cc33", "#66cc00", "#99cc00", "#cccc00", "#e6b800", "#ff9900", "#ff6600", "#ff3300", "#ff0000", "#cc0000", "#990000"];

    const response = await get_train_logs(selectedTasks.value.join(","), selectedMetric.value);
    const _rawData = response.data;
    const datasetWithFilters = [];
    const seriesList = [];

    // // 控制 endLabel 是否显示的变量
    // const showEndLabel = true; // 可以根据需要修改为 false
    const chartRight = showEndLabel.value ? 150 : 60;
    const animationDuration = 2000; // 动画持续时间，可以根据需要修改


    echarts.util.each(selectedTasks.value, function (task_id) {
        var datasetId = 'dataset_id' + task_id;
        datasetWithFilters.push({
            id: datasetId,
            fromDatasetId: 'dataset_raw',
            transform: {
                type: 'filter',
                config: {
                    and: [
                        { dimension: 'epoch', gte: 1 },
                        { dimension: 'task_id', '=': task_id }
                    ]
                }
            }
        });
        seriesList.push({
            type: 'line',
            datasetId: datasetId,
            showSymbol: false,
            name: `Task${task_id}`,
            endLabel: {
                show: showEndLabel.value,
                formatter: function (params) {
                    return `Task${params.value[0]}-Epoch${params.value[2]}: ${params.value[params.value.length - 1]}`;
                }
            },
            labelLayout: {
                moveOverlap: 'shiftY' // 自适应位置，避免重叠
            },
            emphasis: {
                focus: 'series'
            },
            encode: {
                x: 'epoch',
                y: 'value',
                label: ['task', 'value'],
                itemName: 'epoch',
                tooltip: ['value']
            }
        });
    });


    const minValue = Math.min(..._rawData.map(d => d.value));
    const maxValue = Math.max(..._rawData.map(d => d.value));

    const option = {
        animationDuration: animationDuration,
        dataset: [
            {
                id: 'dataset_raw',
                source: _rawData
            },
            ...datasetWithFilters
        ],
        title: {
            text: `Study ${studies.data.find(s => s.id === selectedStudy.value)?.name || ''}`,
            left: 'center' // 标题居中
        },
        legend: {
            data: selectedTasks.value.map(t => `Task${t}`),
            top: 'bottom',
            right: `${chartRight + 10}px`
        },
        tooltip: {
            trigger: 'axis',
            position: function (point, params, dom, rect, size) {
                const { viewSize } = size;
                const x = (viewSize[0] - dom.offsetWidth) / 2;
                const y = (viewSize[1] - dom.offsetHeight) / 2;
                return [x, y];
            },
            order: 'valueDesc'
        },
        xAxis: {
            type: 'value',
            name: 'Epoch',
            nameLocation: 'middle',
            min: 1,
            value: 'value',
            splitNumber: 10,

            nameTextStyle: {
                padding: [10, 0, 0, 0], // Adjust the padding as needed
                fontSize: 14,
                fontWeight: 'bold'
            },
        },
        yAxis: {
            type: 'value',
            name: `${metrics.data.find(m => m.id === selectedMetric.value)?.name}`,
            min: minValue,
            max: maxValue,
            nameRotate: 90,
            nameLocation: 'middle',
            nameTextStyle: {
                // padding: [10, 0, 0, 30], // Adjust the padding as needed
                fontSize: 14,
                fontWeight: 'bold',
            },
        },
        grid: {
            top: '10%',
            left: '3%',
            right: `${chartRight}px`,
            bottom: '18%',
            containLabel: true
        },
        series: seriesList
    };
    chartInstance.setOption(option);
};


const handleCheckAll = (value) => {
    selectedTasks.value = value ? tasks.data.map(d => d.id) : [];
    checkAll.value = value;
    indeterminate.value = false;
};

const clearChart = () => {
    chartInstance?.clear();
};

watch(selectedStudy, () => {
    fetchTasks(selectedStudy.value);
    fetchMetrics();
});

watch(showEndLabel, () => {
    handleDraw();
})

onMounted(() => {
    fetchStudies();
    chartInstance = echarts.init(chart.value);
    handleDraw();
});

document.addEventListener("keydown", event => {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
        handleDraw();
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

#chart {
    position: relative;
    width: 100%;
    height: 100%;
}
</style>