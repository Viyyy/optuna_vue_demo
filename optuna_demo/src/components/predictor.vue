<template>
    <div class="common-layout">
      <div class="header">
        <el-select v-model="taskId" placeholder="Select a Task" style="max-width: 350px;">
          <template #prefix>
            <label>Task ·</label>
          </template>
          <el-option v-for="task in tasks.data" :key="task.id" :label="`Task${task.id}-${task.name}`"
                        :value="task.id"></el-option>
        </el-select>
        
      </div>
      <div class="header">
      <AudioUploader @audio-uploaded="handleUpload" />
        <el-button type="primary" @click="handlePredict">
            <el-icon><Finished /></el-icon>
            Predict
        </el-button>
        </div>
      <PredictResult :audioFile="audioFile" ref="resultComponent" />
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, onMounted, watch } from 'vue';
  import AudioUploader from '~/components/audioUploader.vue';
  import PredictResult from '~/components/predictResult.vue';
  import { toast } from '~/utils/common';
  import { createPredictor } from '~/api/predictor';
  import { get_tasks } from '~/api/analysor';
  import { Finished } from '@element-plus/icons-vue';
  
  const tasks = reactive({ data: [] });
  const audioFile = ref(null);
  const taskId = ref(null);
  const resultComponent = ref(null);
  
  const fetchTasks = async () => {
    const response = await get_tasks();
    tasks.data = response.data;
  };
  
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

  watch(audioFile, (newVal, oldVal) => {
    if (!newVal) {
        resultComponent.value.clearChart();
    }
  })

  
  onMounted(() => {
    fetchTasks();
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
    height: 60px;
    display: flex;
    align-items: center;
    padding-left: 10px;
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
  