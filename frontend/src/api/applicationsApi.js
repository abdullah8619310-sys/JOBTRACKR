import { request } from './httpClient';

const BASE_PATH = '/api/applications';

function listApplications() {
  return request(BASE_PATH);
}

function getApplication(id) {
  return request(`${BASE_PATH}/${id}`);
}

function createApplication(data) {
  return request(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

function updateApplication(id, data) {
  return request(`${BASE_PATH}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

function deleteApplication(id) {
  return request(`${BASE_PATH}/${id}`, {
    method: 'DELETE',
  });
}

function analyzeApplication(id) {
  return request(`${BASE_PATH}/${id}/analyze`, {
    method: 'POST',
  });
}

function listStaleApplications() {
  return request(`${BASE_PATH}/stale`);
}

function generateFollowUp(id) {
  return request(`${BASE_PATH}/${id}/follow-up`, {
    method: 'POST',
  });
}

export {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  analyzeApplication,
  listStaleApplications,
  generateFollowUp,
};
