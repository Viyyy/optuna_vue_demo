<template>
    <div>
      <audio :src="audioUrl" :controls="controls" :loop="loop" :autoplay="autoplay"></audio>
    </div>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  
  const props = defineProps({
    audioUrl: {
      type: String,
      required: true,
    },
    controls: {
      type: Boolean,
      default: true,
    },
    loop: {
      type: Boolean,
      default: false,
    },
    autoplay: {
      type: Boolean,
      default: false,
    },
  });
  </script>
  