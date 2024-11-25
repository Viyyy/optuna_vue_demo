<template>
  <div class="common-layout">
    <el-header>
      <div class="header">
        <el-select v-model="taskId" placeholder="Select a Task" style="max-width: 350px;">
          <template #prefix>
            <label>Task ·</label>
          </template>
          <el-option
            v-for="task in tasks"
            :key="task.id"
            :label="`Task${task.id}-${task.name}`"
            :value="task.id"
          ></el-option>
        </el-select>
        <AudioUploader @audio-uploaded="handleUpload" />
        <el-button type="primary" @click="handlePredict">
          <el-icon><PieChart /></el-icon>
          Predict
        </el-button>
      </div>
    </el-header>
    <el-container style="border: 1px solid #e4e4e4; height: 100%;">
      <el-aside width="350px" style="border: 1px solid #e4e4e4; height: 100%;">
        <div style="display: flex; justify-content: center; margin: 5px 0 5px 0; padding: 0px;">
          <el-label style="font-size: 16px; font-weight: bold; margin: 10px 0 0 10px; ">
            <el-icon><Document /></el-icon>
            Config
          </el-label>
          <el-button type="primary" @click="handleCopy" plain style="margin-right: 10px; margin-top: 5px;" title="Copy config to clipboard" :disabled="!yamlContent">
            <el-icon><DocumentCopy /></el-icon>
          </el-button>
          <el-button type="primary" @click="downloadYaml" plain style="margin-top: 5px;" title="Download config.yml" v-loading="downloadLoading" :disabled="!yamlContent">
            <el-icon><Download /></el-icon>
          </el-button>
        </div>
        <el-divider style="margin: 10px 0 0 0;"/>
        <div
          ref="editableDiv"
          contenteditable="false"
          spellcheck="false"
          @input="updateYamlContent"
          class="hljs editable"
        ></div>
      </el-aside>
      <el-main>
        <div>
          <span style="font-size: 16px; font-weight: bold;">
            <el-icon style="margin-right: 5px;"><PieChart /></el-icon>Predictor Result</span>
          <el-divider style="margin: 10px 0;"/>
          <PredictResult :audioFile="audioFile" ref="resultComponent" class="predict-result" />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import highlight from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';
import 'highlight.js/styles/github.css';
import AudioUploader from '~/components/audioUploader.vue';
import PredictResult from '~/components/predictResult.vue';
import { toast } from '~/utils/common';
import { createPredictor } from '~/api/predictor';
import { get_tasks, get_task_info } from '~/api/analysor';
import { PieChart, Download, DocumentCopy, Document } from '@element-plus/icons-vue';

highlight.registerLanguage('yaml', yaml);

const tasks = ref([]);
const audioFile = ref(null);
const taskId = ref(null);
const yamlContent = ref('');
const resultComponent = ref(null);
const downloadLoading = ref(false);
const editableDiv = ref(null);

const fetchTasks = async () => {
  try {
    const { data } = await get_tasks();
    tasks.value = data;
  } catch (error) {
    toast('Failed to fetch tasks');
  }
};

const fetchTaskInfo = async () => {
  if (!taskId.value) {
    return;
  }
  try {
    const { data } = await get_task_info(taskId.value);
    yamlContent.value = data.config;
    highlightYaml();
  } catch (error) {
    toast('Failed to fetch task info');
  }
};

const handleUpload = (url, file) => {
  audioFile.value = file;
  toast('Upload successful');
};

const handlePredict = async () => {
  if (!taskId.value) {
    toast('Please select a task', 'warning');
    return;
  }
  try {
    const { data } = await createPredictor(taskId.value);
    resultComponent.value.predictAudio(data.predictor_id);
  } catch (error) {
    toast('Prediction failed');
  }
};

const updateYamlContent = () => {
  yamlContent.value = editableDiv.value.innerText;
  highlightYaml();
};

const highlightYaml = () => {
  nextTick(() => {
    if (editableDiv.value) {
      editableDiv.value.innerHTML = highlight.highlight(yamlContent.value, { language: 'yaml' }).value;
    }
  });
};

watch(taskId, () => {
  fetchTaskInfo();
});

watch(audioFile, (newVal) => {
  if (!newVal) {
    resultComponent.value.clearChart();
  }
});

watch(yamlContent, () => {
  highlightYaml();
});

const downloadYaml = () => {
  downloadLoading.value = true;
  const blob = new Blob([yamlContent.value], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'config.yml';
  link.click();
  URL.revokeObjectURL(url);
  downloadLoading.value = false;
};

const handleCopy = () => {
  const el = document.createElement('textarea');
  el.value = yamlContent.value;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  toast('Config copied to clipboard');
};

onMounted(() => {
  fetchTasks();
  highlightYaml();
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

.content {
  display: flex;
  justify-content: space-between;
  height: 650px;
  margin-top: 10px;
}

.predict-result,
.yaml-editor {
  width: 48%;
}

.yaml-editor {
  display: flex;
  flex-direction: column;
}

.hljs {
  min-height: 300px;
  border: 1px solid #e4e4e4;
}

.editable {
  max-height: 500px;
  overflow-y: auto;
  white-space: pre-wrap;
  padding: 10px;
  margin-top: 8px;
  border: #3b2e2e;
}
</style>
