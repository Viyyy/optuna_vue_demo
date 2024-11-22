import service from "~/axios";

export function getPredictors() {
    return service.get("/analysor/getPredictors");
}

export function createPredictor(task_id) {
    return service.post(`/analysor/createPredictor/${task_id}`);
}

export function checkPredictor(predictor_id) {
    return service.get(`/analysor/checkPredictor/${predictor_id}`)
}

export function doPredict(predictor_id, formData) {
    return service.post(`/analysor/predict?predictor_id=${predictor_id}`, formData, {
        headers: {
            'accept': 'application/json',
            'Content-Type': 'multipart/form-data'
        }
    })
}