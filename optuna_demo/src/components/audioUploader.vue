<template>
    <div class="audio-uploader"> 
        <label 
            :title="audioFile ? audioFile.name : '选择音频: '"
            style="font-size: 12px; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ audioFile ? audioFile.name : '选择音频: ' }}
        </label>
        <audio :src="audioUrl" controls style="height:40px; width:300px;"></audio>
        <el-upload action="" :before-upload="beforeUpload" :show-file-list="false" accept="audio/*">
            <el-button type="primary" :disabled="isRecording">
                <el-icon><UploadFilled /></el-icon>
                <!-- Upload -->
            </el-button>
        </el-upload>
        <el-button 
            type="danger" 
            :icon="Delete" 
            @click="deleteAudio"
            :disabled="!audioFile"/>
        <!-- <el-button @click="toggleRecording">
            <el-icon><Microphone /></el-icon>
            {{ isRecording ? '停止录音' : '开始录音' }}
        </el-button> -->
    </div>
</template>

<script setup>
import { ref } from 'vue';
import {UploadFilled, Microphone, Delete} from '@element-plus/icons-vue';
import { toast } from '~/utils/common'

const audioUrl = ref(null);
const isRecording = ref(false);
let mediaRecorder = null;
const audioChunks = [];
const audioFile = ref(null);

const beforeUpload = (file) => {
    audioFile.value = file;
    console.log(audioFile.value);
    audioUrl.value = URL.createObjectURL(file);
    emit('audio-uploaded', audioUrl.value, audioFile.value);
    return false; // 阻止默认上传行为
};

const deleteAudio = () => {
    const file = audioFile.value;
    audioFile.value = null;
    audioUrl.value = null;
    emit('audio-uploaded', null, null);
    toast(`Deleted audio file: ${file.name}`)
};

// const toggleRecording = async () => {
//     if (isRecording.value) {
//         mediaRecorder.stop();
//     } else {
//         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//         mediaRecorder = new MediaRecorder(stream);
//         mediaRecorder.ondataavailable = (event) => {
//             audioChunks.push(event.data);
//         };
//         mediaRecorder.onstop = () => {
//             const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
//             audioUrl.value = URL.createObjectURL(audioBlob);
//             emit('audio-uploaded', audioUrl.value);
//             audioChunks.length = 0;
//         };
//         mediaRecorder.start();
//     }
//     isRecording.value = !isRecording.value;
// };

const emit = defineEmits(['audio-uploaded']);
</script>

<style scoped>
.audio-uploader {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px;
    gap: 10px;
    min-width:200px;
    margin: 10px;
}
</style>