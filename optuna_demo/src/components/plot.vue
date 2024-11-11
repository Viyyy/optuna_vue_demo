<template>
    <div class="common-layout">
        <el-container>
            <el-header class="header">
                <el-select v-model="selectedStudy" placeholder="Select a Study"  style="max-width: 350px;">
                    <template #prefix>
                        <label>Study ·</label>
                    </template>
                    <el-option v-for="study in studies.data" :key="study" :label="study" :value="study"></el-option>
                </el-select>

                <el-select v-model="selectedTasks" placeholder="Select Tasks" multiple clearable collapse-tags
                    :max-collapse-tags="1" style="max-width: 360px;" :disabled="tasks.data.length === 0">
                    <template #prefix>
                        <label>Tasks ·</label>
                    </template>
                    <template #header>
                        <el-checkbox v-model="checkAll" :indeterminate="indeterminate" @change="handleCheckAll">
                            All
                        </el-checkbox>
                    </template>
                    <el-option v-for="task in tasks.data" :key="task" :label="task"
                        :value="task"></el-option>
                </el-select>

                <el-select v-model="selectedMetric" placeholder="Select a metric" style="max-width: 170px;">
                    <template #prefix>
                        <label>Metric ·</label>
                    </template>
                    <el-option v-for="metric in metrics.data" :key="metric" :label="metric" :value="metric"></el-option>
                </el-select>

                <el-button type="primary" @click="">Draw</el-button>
            </el-header>

            <el-main class="main">
                <div ref="chart" id="chart" v-loading="loading"></div>
            </el-main>
        </el-container>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { get_studies, get_tasks, get_metrics} from "~/api/optuna";
import * as echarts from "echarts";
import { toast } from "~/utils/common"

const studies = reactive({ data: [] });
const selectedStudy = ref("");
const metrics = reactive({ data: [] });
const selectedMetric = ref("");
let myChart;
const chart = ref(null);
const chartData = ref([]);
const chartAxises = ref([]);
const tasks = reactive({ data: [] });
const selectedTasks = ref([]);
const checkAll = ref(false);
const indeterminate = ref(false);
const loading = ref(false);

function setChart() {
    console.log("setChart");
}

function handleCheckAll(value) {
    selectedTasks.value = value ? tasks.data.map(d => d) : [];
    checkAll.value = value;
    indeterminate.value = false;
    setChart();
}

function fetchStudy() {
    get_studies().then(data => {
        studies.data = data.data.studies;
    });
}

function fetchTasks(studyName) {
    get_tasks(studyName).then(data => {
        tasks.data = data.data.tasks;
    }).finally(() => {
        handleCheckAll(true);
    });
}

function fetchMetric() {
    get_metrics(true).then(data => {
        metrics.data = data.data.metrics;
    });
}

watch(selectedStudy, () => {
    fetchTasks(selectedStudy.value);
});

onMounted(() => {
    fetchStudy();
    fetchMetric();
    myChart = echarts.init(chart.value);
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