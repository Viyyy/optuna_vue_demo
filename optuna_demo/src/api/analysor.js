import service from "~/axios";

export function get_studies() {
    return service.get("/analysor/studies");
}

export function get_tasks(study_id=null) {
    return service.get(`/analysor/tasks`, {
        params: {
            study_id: study_id
        }
    });
}

export function get_metrics(has_duration=false, ids=null) {
    return service.get("/analysor/metrics", {
        params: {
            has_duration: has_duration,
            ids: ids
        }
    });
}

export function create_studies() {
    return service.post("/analysor/create_studies");
}

export function get_hyperparams(study_id, start_dim=1) {
    return service.get(`/analysor/hyperparams/${study_id}`, {params: {start_dim: start_dim}});
}

export function get_best_logs(study_id, metric_ids) {
    return service.get(`/analysor/bestLogs/${study_id}`, {
        params: {
            metric_ids: metric_ids
        }
    });
}

export function get_train_logs(task_ids, metric_id){
    return service.get("/analysor/trainLogs", {
        params: {
            task_ids: task_ids,
            metric_id: metric_id
        }
    });
}