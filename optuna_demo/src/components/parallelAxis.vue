<template>
    <div class="common-layout">
        <el-container>
            <el-header class="header">
                <el-select v-model="selectedStudy" placeholder="Study">
                    <el-option v-for="study in studies.data" :key="study" :label="study" :value="study"></el-option>
                </el-select>
                <el-select v-model="selectedMetric" placeholder="Metric">
                    <el-option v-for="metric in metrics.data" :key="metric" :label="metric" :value="metric"></el-option>
                </el-select>

                <label>Min: </label>
                <el-input v-model="min_value" type="number" step="0.01" placeholder="Min Value"></el-input>

                <label>Max:</label>
                <el-input v-model="max_value" type="number" step="0.01" placeholder="Max Value"></el-input>

                <el-button type="primary" @click="drawChart">Draw</el-button>
            </el-header>

            <el-main class="main">
                <div ref="chart" id="chart" v-loading="loading"></div>
            </el-main>
        </el-container>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from "vue";
import { get_studies, get_metrics, get_study_details } from "~/api/optuna";
import * as echarts from "echarts";

const studies = reactive({ data: [] });
const selectedStudy = ref("");

const metrics = reactive({ data: [] });
const selectedMetric = ref("");

const min_value = ref(null);
const max_value = ref(null);

const chart = ref(null);
const chartData = ref([]);
const chartAxises = ref([]);

const loading = ref(false);

function fetchStudy() {
    get_studies().then(data => {
        studies.data = data.data.studies;
    });
}

function fetchMetric() {
    get_metrics().then(data => {
        metrics.data = data.data.data;
    });
}

let myChart;
function drawChart() {
    loading.value = true; // 开始加载

    get_study_details(
        selectedStudy.value,
        selectedMetric.value,
        min_value.value,
        max_value.value
    ).then(data => {
        chartData.value = data.data.datas;
        chartAxises.value = data.data.axis;

        // 更新 min_value 和 max_value 为最后一个轴的值
        const lastAxis = chartAxises.value[chartAxises.value.length - 1];
        min_value.value = lastAxis.min;
        max_value.value = lastAxis.max;

        // 配置项
        const option = {
            title: {
                text: `${selectedStudy.value} - ${selectedMetric.value}`,
                left: 'center',
            },
            tooltip: {
                trigger: 'item',
                formatter: function (params) {
                    const result = [];
                    for (let i = 0; i < chartAxises.value.length; i++) {
                        const axis = chartAxises.value[i];
                        result.push(
                            `<b>${axis.name}</b>: ${params.value[axis.dim]}`
                        );
                    }
                    return result.join('<br>');
                }
            },
            visualMap: {
                show: true,
                text: [max_value.value, min_value.value],
                realtime: false,
                min: min_value.value,
                max: max_value.value,
                dimension: chartAxises.value[chartAxises.value.length - 1].dim,
                inRange: {
                    color: ['#d94e5d', '#eac736', '#50a3ba'].reverse(),
                },
                orient: 'vertical', // 方向设置为垂直
                left: 'right', // 设置在左侧
                top: 'center', // 垂直居中
                itemHeight: '100%', // 设置高度为80%
                itemWidth: 20 // 设置宽度
            },
            parallelAxis: chartAxises.value.slice(4),
            parallel: {
                left: '5%',
                right: '15%',
                bottom: '10%',
                top: '10%',
                width: '80%',
                height: '80%'
            },
            series: [{
                type: 'parallel',
                lineStyle: {
                    width: 1.5,
                    opacity: 0.5
                },
                emphasis: {
                    lineStyle: {
                        width: 3,
                        opacity: 1,
                        color: "#08eff3"
                    }
                },
                data: chartData.value
            }]
        };

        myChart.setOption(option);
    }).finally(() => {
        loading.value = false; // 结束加载
    });
}

watch(selectedStudy, () => {
    min_value.value = null;
    max_value.value = null;
});

watch(selectedMetric, () => {
    min_value.value = null;
    max_value.value = null;
});

onMounted(() => {
    myChart = echarts.init(chart.value);
    fetchStudy();
    fetchMetric();
});

// 绑定enter事件
document.addEventListener("keydown", function (event) {
    if (event.code === "Enter" || event.code === "NumpadEnter") {
        drawChart();
    }
});
</script>

<style scoped>
label {
    margin: 5px;
    font-size: 14px !important;
}

el-button {
    margin-left: 10px !important;
}

.header {
    height: 50px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.main {
    height: calc(100vh - 50px);
}

#chart {
    width: 100%;
    height: 600px;
    border: 1px solid #3b2e2e;
    border-radius: 5px;
    padding: 3%;
}
</style>
