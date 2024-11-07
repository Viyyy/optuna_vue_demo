import service from "~/axios";

export function get_studies() {
    console.log("get_studies called");
    return service.get("/studies");
}

export function get_dimensions(study_name) {
    console.log("get_dimensions called");
    return service.get(`/dimensions`, { params: { study_name: study_name } });
}

export function get_metrics() {
    console.log("get_metrics called");
    return service.get("/metrics");
}

export function get_study_details(study_name, metric = 'accuracy', min = 0.0, max = 1.0, keep_range = true) {
    console.log("get_study_details called");
    return service.get(`/study/${study_name}`,
        {
            params: { metric: metric, min: min, max: max, keep_range: keep_range}
        });
}