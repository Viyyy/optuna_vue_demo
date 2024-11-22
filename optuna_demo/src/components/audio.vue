<template>
    <div>
      <audio-uploader @audio-uploaded="handleAudioUploaded" />
      <span>AudioPlayer: <audio-player :audio-url="audioUrl" :controls="true" :loop="false" :autoplay="false" /></span>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import AudioUploader from '~/components/AudioUploader.vue';
  import AudioPlayer from '~/components/AudioPlayer.vue';
  
  const audioUrl = ref('');
  
  const handleAudioUploaded = (url) => {
    console.log('Audio uploaded:', url);
    audioUrl.value = url;
  };
  </script>
  