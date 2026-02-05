import axios from 'axios'

// Create axios instance with caching strategy
let api = axios.create({
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Cache for API responses
const cache = new Map()
const CACHE_DURATION = 60000 // 1 minute

// Enhanced axios instance with simple caching
const cachedGet = async (url, config = {}) => {
  const cacheKey = `${url}${JSON.stringify(config.params || {})}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  
  const response = await api.get(url, config)
  cache.set(cacheKey, { data: response, timestamp: Date.now() })
  
  return response
}

let lastOmniboxInputEvent = null

// Initialize API settings from storage
chrome.storage.sync.get({ linkaceApi: '', linkaceToken: '' }, (item) => {
  if (item.linkaceApi && item.linkaceToken) {
    api.defaults.baseURL = item.linkaceApi
    api.defaults.headers.common['Authorization'] = `Bearer ${item.linkaceToken}`
  }
})

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.recipient === 'background' && msg.type === 'apiInfo') {
    api.defaults.baseURL = msg.content.apiUrl
    api.defaults.headers.common['Authorization'] = `Bearer ${msg.content.apiToken}`
    sendResponse({ success: true })
  } else if (msg.recipient === 'background' && msg.type === 'checkTab') {
    checkCurrentTab()
    sendResponse({ success: true })
  }
  return true // Keep message channel open for async response
})

// Tab update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    checkTab(tabId)
  }
})

// Tab activation listener
chrome.tabs.onActivated.addListener((tabInfo) => {
  setTimeout(() => {
    checkTab(tabInfo.tabId)
  }, 100)
})

// Omnibox listeners
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  if (lastOmniboxInputEvent) {
    clearTimeout(lastOmniboxInputEvent)
  }
  lastOmniboxInputEvent = setTimeout(() => {
    handleOmniboxInput(text, suggest)
  }, 250)
})

chrome.omnibox.onInputEntered.addListener((text) => {
  chrome.tabs.update({ url: text })
})

// Check if current tab URL exists in LinkAce
async function checkTab(tabId) {
  try {
    // Set loading badge
    await chrome.action.setBadgeText({ tabId, text: 'o' })
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#f2ce2b' })

    const tab = await chrome.tabs.get(tabId)
    let currentUrl = tab.url

    // Skip chrome:// and extension pages
    if (!currentUrl || currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://')) {
      await chrome.action.setBadgeText({ tabId, text: '' })
      return
    }

    // Remove trailing slash
    if (currentUrl.endsWith('/')) {
      currentUrl = currentUrl.slice(0, -1)
    }

    const response = await cachedGet('/api/v2/search/links', {
      params: { query: currentUrl }
    })

    const link = response.data.data[0]
    if (link) {
      // Page exists in LinkAce
      await chrome.action.setBadgeText({ tabId, text: '✓' })
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#41b349' })
      await chrome.storage.sync.set({ linkacePageStatus: link.id })
    } else {
      // Page not in LinkAce
      await chrome.action.setBadgeText({ tabId, text: '' })
      await chrome.storage.sync.set({ linkacePageStatus: -1 })
    }
  } catch (error) {
    console.error('Error checking tab:', error)
    await chrome.action.setBadgeText({ tabId, text: '!' })
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#a61b29' })
    await chrome.storage.sync.set({ linkacePageStatus: -2 })
  }
}

async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (tabs[0]) {
    checkTab(tabs[0].id)
  }
}

// Handle omnibox search
async function handleOmniboxInput(text, suggest) {
  try {
    const inputs = text.split(' ').filter(Boolean)
    const searchPromises = []

    for (const input of inputs) {
      if (input.startsWith('#') && input.length > 1) {
        // Tag search
        const tag = input.slice(1)
        searchPromises.push(
          cachedGet('/api/v2/search/tags', { params: { query: tag } })
            .then(async (res) => {
              const tagId = Object.keys(res.data)[0]
              if (tagId) {
                const linksRes = await cachedGet(`/api/v2/tags/${tagId}/links`)
                return linksRes.data.data
              }
              return []
            })
        )
      } else if (input.startsWith('@') && input.length > 1) {
        // List search
        const list = input.slice(1)
        searchPromises.push(
          cachedGet('/api/v2/search/lists', { params: { query: list } })
            .then(async (res) => {
              const listId = Object.keys(res.data)[0]
              if (listId) {
                const linksRes = await cachedGet(`/api/v2/lists/${listId}/links`)
                return linksRes.data.data
              }
              return []
            })
        )
      } else if (input) {
        // URL search
        searchPromises.push(
          cachedGet('/api/v2/search/links', { params: { query: input } })
            .then((res) => res.data.data)
        )
      }
    }

    const results = await Promise.all(searchPromises)
    
    if (results.length === 0) {
      suggest([])
      return
    }

    // Find intersection of all results
    let links = results[0] || []
    for (let i = 1; i < results.length; i++) {
      links = links.filter((link) =>
        results[i].some((r) => r.id === link.id)
      )
    }

    // Format suggestions
    const suggestions = links.slice(0, 10).map((link) => ({
      content: link.url,
      description: `${escapeXml(link.title)} - <url>${escapeXml(link.url)}</url>`
    }))

    suggest(suggestions)
  } catch (error) {
    console.error('Omnibox search error:', error)
    suggest([])
  }
}

function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

console.log('LinkAce Extension service worker loaded')
