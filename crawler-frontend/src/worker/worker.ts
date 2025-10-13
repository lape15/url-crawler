import { API } from '../services/auth';
let timer: any = null;
let currentJobId: string | null = null;
const authToken: string | null = null;

self.onmessage = (event) => {
  const { type, jobId, intervalMs = 1500, token } = event.data;
  if (!jobId) return;

  const getResult = async () => {
    try {
      const res = await API.get(`/crawler/jobs/${jobId}/result`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    } catch (err) {
      console.error(err);
    }
  };
  const tick = async () => {
    try {
      const res = await API.get(`/crawler/jobs/${jobId}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.data) return;

      const data = res.data;
      self.postMessage({ type: 'SNAPSHOT', jobId, data });

      if (data.status === 'complete' || data.status === 'failed') {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        currentJobId = null;

        const data = await getResult();
        const result = Object.values(data.result);
        self.postMessage({ type: 'RESULT', jobId, data: result });
      } else {
        timer = setTimeout(tick, intervalMs);
      }
    } catch (err) {
      console.error(err);
      timer = setTimeout(tick, intervalMs);
    }
  };

  switch (type) {
    case 'START':
      if (timer && currentJobId !== jobId) {
        clearTimeout(timer);
        timer = null;
      }
      if (!timer) {
        currentJobId = jobId;
        // timer = setInterval(tick, intervalMs);
        tick();
      }
      break;
    case 'STOP':
      if (timer && currentJobId === jobId) {
        clearInterval(timer);
        timer = null;
        currentJobId = null;
      }
      break;
    default:
      break;
  }
};
