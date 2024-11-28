<template>
  <div ref="chart" class="chart-container" v-loading="loading"></div>
</template>

<script setup>
import { defineProps, onMounted, defineExpose, watch, onUnmounted } from 'vue';
import { reactive, ref } from 'vue';
import { doPredict, checkPredictor } from '~/api/predictor';
import * as echarts from 'echarts';
import { toast } from '~/utils/common'

const result = reactive({ data: null });
const loading = ref(false);
const chart = ref(null);
let resultChart = null;
const currentPredictId = ref(null);

const props = defineProps({
  audioFile: {
    type: File,
    required: true
  }
});


const predictAudio = async (predictId) => {
  
  if (!props.audioFile) {
    toast('Please select an audio file', 'warning');
    clearChart();
    return;
  }
  try {
    loading.value = true;
    const formData = new FormData();
    
    formData.append('audio_file', props.audioFile, 'filename.mp3');
    const response = await doPredict(predictId, formData);
    result.data = response.data;
    currentPredictId.value = predictId;
  } catch (error) {
    console.error(error);
    loading.value = false;
  } 
};

const clearChart = () => {
  resultChart?.clear();
};

function haveSameKeys(obj1, obj2) {
  const keys1 = obj1.map(item => item[0]);
  const keys2 = obj2.map(item => item[0]);

  // 如果键的数量不同，直接返回 false
  if (keys1.length !== keys2.length) {
    return false;
  }

  // 对键数组排序
  keys1.sort();
  keys2.sort();

  // 比较每个键
  for (let i = 0; i < keys1.length; i++) {
    if (keys1[i] !== keys2[i]) {
      return false;
    }
  }

  return true;
}


const loadChart = async () => {
  if (!result.data) return;

  clearChart();
  try {
    const response = await checkPredictor(currentPredictId.value);

    console.log("Predictor response", response.data);
    console.log("Predictor result", result.data);
    
    const totalData = result.data.total.map(item => ({
      value: parseFloat(item[1]).toFixed(4),
      name: item[0].split('_')[0]
    }));

    const categoryData = result.data.result.map(item => ({
      value: parseFloat(item[1]).toFixed(4),
      name: item[0]
    }));

    let series = [
        {
          name: 'Category',
          type: 'pie',
          selectedMode: 'single',
          radius: ['45%', '60%'],
          labelLine: {
            length: 30
          },
          label: {
            formatter: '{a|{a}}{abg|}\n{hr|}\n  {b|{b}：}{per|{d}%}  ',
            backgroundColor: '#F6F8FC',
            borderColor: '#8C8D8E',
            borderWidth: 1,
            borderRadius: 4,
            rich: {
              a: {
                color: '#6E7079',
                lineHeight: 22,
                align: 'center'
              },
              hr: {
                borderColor: '#8C8D8E',
                width: '100%',
                borderWidth: 1,
                height: 0
              },
              b: {
                color: '#4C5058',
                fontSize: 14,
                fontWeight: 'bold',
                lineHeight: 33
              },
              per: {
                color: '#fff',
                backgroundColor: '#4C5058',
                padding: [3, 4],
                borderRadius: 4
              }
            }
          },
          data: categoryData
        }
      ];

    if (haveSameKeys(result.data.total, result.data.result)) {
      console.log('total and category have same keys');
      series[0].radius = ['10%', '50%']
    }
    else {
      series.push({
          name: 'Total',
          type: 'pie',
          selectedMode: 'single',
          radius: [0, '30%'],
          label: {
            position: 'inner',
            fontSize: 14
          },
          labelLine: {
            show: false
          },
          data: totalData
        }) 
    }
    

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      series: series
    };

    resultChart.setOption(option);
  } catch (error) {
    console.error(error);
  }
  loading.value = false;
};

watch(() => result.data, loadChart);

defineExpose({
  predictAudio,
  clearChart
});

onMounted(() => {
  resultChart = echarts.init(chart.value);
});

onUnmounted(() => {
  clearChart();
});
</script>

<style scoped>
.chart-container {
  height: 500px !important;
  width: 650px !important;
  position: relative;
  /* width: calc(100% - 20px); */
  border: 2px solid #8c8a8a;
  border-radius: 5px;
  /* padding: 3%; */
  margin: 10px;
}
</style>
