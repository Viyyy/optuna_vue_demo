export async function loadAudioData(url) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const formData = new FormData();
            formData.append('audio_file', blob, 'filename.mp3');
            return formData;
        })
        .catch(error => {
            console.error('Error fetching the file:', error);
        });
}