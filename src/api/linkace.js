import axios from 'axios'

class LinkAceAPI {
  constructor() {
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
  }

  configure(baseURL, token) {
    this.client.defaults.baseURL = baseURL
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // Search endpoints
  async searchLinks(query) {
    return this.client.get('/api/v2/search/links', {
      params: { query }
    })
  }

  async searchTags(query) {
    return this.client.get('/api/v2/search/tags', {
      params: { query }
    })
  }

  async searchLists(query) {
    return this.client.get('/api/v2/search/lists', {
      params: { query }
    })
  }

  // Link CRUD operations
  async getLink(id) {
    return this.client.get(`/api/v2/links/${id}`)
  }

  async createLink(data) {
    return this.client.post('/api/v2/links', data)
  }

  async updateLink(id, data) {
    return this.client.patch(`/api/v2/links/${id}`, data)
  }

  async deleteLink(id) {
    return this.client.delete(`/api/v2/links/${id}`)
  }

  // Tag operations
  async getTag(id) {
    return this.client.get(`/api/v2/tags/${id}`)
  }

  async getTagLinks(id) {
    return this.client.get(`/api/v2/tags/${id}/links`)
  }

  // List operations
  async getList(id) {
    return this.client.get(`/api/v2/lists/${id}`)
  }

  async getListLinks(id) {
    return this.client.get(`/api/v2/lists/${id}/links`)
  }
}

export default new LinkAceAPI()
