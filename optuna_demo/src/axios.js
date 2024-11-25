import axios from 'axios';
import 'virtual:windi.css'

const service = axios.create({
  baseURL: 'http://10.166.168.124:8081',
  // baseURL: import.meta.env.VUE_APP_API_URL,
  timeout: 5000,
});

export default service;