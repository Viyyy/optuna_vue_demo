<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import 'element-plus/dist/index.css';
import { Menu, TrendCharts, DataLine } from '@element-plus/icons-vue';

const router = useRouter();
const route = useRoute();

function handleTabClick(tab) {
  router.push(tab.props.name);
}

onMounted(() => {
  if (route.fullPath === '/') {
    router.push('/tasks');
  }
});

</script>

<template>
  <el-tabs v-model="route.fullPath" @tab-click="handleTabClick" type="border-card">
    <el-tab-pane name="/predictor">
      <template #label>
        <span>
          <el-icon>
            <TrendCharts />
          </el-icon>
          <span> Predictor</span>
        </span>
      </template>
    </el-tab-pane>
    <el-tab-pane name="/tasks">
      <template #label>
        <span>
          <el-icon>
            <TrendCharts />
          </el-icon>
          <span> Tasks</span>
        </span>
      </template>
    </el-tab-pane>
    <el-tab-pane name="/study">
      <template #label>
        <span>
          <el-icon>
            <DataLine />
          </el-icon>
          <span> Study</span>
        </span>
      </template>
    </el-tab-pane>

  </el-tabs>
  <router-view />
</template>

<style scoped></style>
