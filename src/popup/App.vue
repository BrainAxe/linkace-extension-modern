<template>
  <div class="popup-container">
    <!-- Settings Button -->
    <div class="nav-bar">
      <el-button
        :icon="Setting"
        circle
        @click="settingsVisible = true"
      />
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2 class="title">{{ isEditMode ? 'Edit Bookmark' : 'New Bookmark' }}</h2>

      <el-form :model="form" label-width="90px" label-position="left">
        <!-- URL -->
        <el-form-item label="URL">
          <el-input v-model="form.url" />
        </el-form-item>

        <!-- Title -->
        <el-form-item label="Title">
          <el-input v-model="form.title" />
        </el-form-item>

        <!-- Description -->
        <el-form-item label="Description">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <!-- Tags -->
        <el-form-item label="Tags">
          <el-select
            v-model="form.tags"
            multiple
            filterable
            remote
            reserve-keyword
            placeholder="Search tags"
            :remote-method="searchTags"
            :loading="tagsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="tag in availableTags"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            />
          </el-select>
        </el-form-item>

        <!-- Lists -->
        <el-form-item label="Lists">
          <el-select
            v-model="form.lists"
            multiple
            filterable
            remote
            reserve-keyword
            placeholder="Search lists"
            :remote-method="searchLists"
            :loading="listsLoading"
            style="width: 100%"
          >
            <el-option
              v-for="list in availableLists"
              :key="list.id"
              :label="list.name"
              :value="list.id"
            />
          </el-select>
        </el-form-item>

        <!-- Private Checkbox -->
        <el-form-item label="Private">
          <el-checkbox v-model="form.isPrivate" />
        </el-form-item>

        <!-- Action Buttons -->
        <el-form-item>
          <el-button type="primary" @click="saveBookmark" :loading="saving">
            {{ isEditMode ? 'Update' : 'Save' }}
          </el-button>
          <el-button @click="getCurrentTab">
            Get Current Tab
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- Settings Dialog -->
    <el-dialog v-model="settingsVisible" title="Settings" width="90%">
      <el-form label-width="100px">
        <el-form-item label="API URL">
          <el-input
            v-model="settings.apiUrl"
            placeholder="https://your-linkace.com"
          />
        </el-form-item>
        <el-form-item label="API Token">
          <el-input
            v-model="settings.apiToken"
            type="password"
            placeholder="Your API token"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsVisible = false">Cancel</el-button>
        <el-button type="primary" @click="saveSettings">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import api from '../api/linkace'

const settingsVisible = ref(false)
const isEditMode = ref(false)
const saving = ref(false)
const tagsLoading = ref(false)
const listsLoading = ref(false)

const form = ref({
  url: '',
  title: '',
  description: '',
  tags: [],
  lists: [],
  isPrivate: false
})

const settings = ref({
  apiUrl: '',
  apiToken: ''
})

const availableTags = ref([])
const availableLists = ref([])

// Load settings on mount
onMounted(async () => {
  const result = await chrome.storage.sync.get({
    linkaceApi: '',
    linkaceToken: '',
    linkacePageStatus: -2
  })

  settings.value.apiUrl = result.linkaceApi
  settings.value.apiToken = result.linkaceToken

  if (settings.value.apiUrl && settings.value.apiToken) {
    api.configure(settings.value.apiUrl, settings.value.apiToken)
    
    // Check if current page is already bookmarked
    if (result.linkacePageStatus > 0) {
      isEditMode.value = true
      await loadBookmark(result.linkacePageStatus)
    } else {
      await getCurrentTab()
    }
  }
})

// Get current tab info
async function getCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const tab = tabs[0]
    
    if (tab) {
      form.value.url = tab.url
      form.value.title = tab.title
    }
  } catch (error) {
    console.error('Error getting current tab:', error)
    ElMessage.error('Failed to get current tab information')
  }
}

// Load existing bookmark
async function loadBookmark(linkId) {
  try {
    const response = await api.getLink(linkId)
    const link = response.data
    
    form.value.url = link.url
    form.value.title = link.title
    form.value.description = link.description || ''
    form.value.tags = link.tags.map(t => t.id)
    form.value.lists = link.lists.map(l => l.id)
    form.value.isPrivate = link.visibility === 3 // 3 = private

    // Populate available tags and lists
    availableTags.value = link.tags
    availableLists.value = link.lists
  } catch (error) {
    console.error('Error loading bookmark:', error)
    ElMessage.error('Failed to load bookmark')
  }
}

// Search tags
async function searchTags(query) {
  if (!query) {
    availableTags.value = []
    return
  }
  
  tagsLoading.value = true
  try {
    const response = await api.searchTags(query)
    availableTags.value = Object.entries(response.data).map(([id, name]) => ({
      id: parseInt(id),
      name
    }))
  } catch (error) {
    console.error('Error searching tags:', error)
  } finally {
    tagsLoading.value = false
  }
}

// Search lists
async function searchLists(query) {
  if (!query) {
    availableLists.value = []
    return
  }
  
  listsLoading.value = true
  try {
    const response = await api.searchLists(query)
    availableLists.value = Object.entries(response.data).map(([id, name]) => ({
      id: parseInt(id),
      name
    }))
  } catch (error) {
    console.error('Error searching lists:', error)
  } finally {
    listsLoading.value = false
  }
}

// Save bookmark
async function saveBookmark() {
  if (!form.value.url) {
    ElMessage.warning('URL is required')
    return
  }

  saving.value = true
  try {
    const data = {
      url: form.value.url,
      title: form.value.title,
      description: form.value.description,
      tags: form.value.tags,
      lists: form.value.lists,
      visibility: form.value.isPrivate ? 3 : 1, // 1=public, 2=internal, 3=private
      check_disabled: false
    }

    if (isEditMode.value) {
      const status = await chrome.storage.sync.get('linkacePageStatus')
      await api.updateLink(status.linkacePageStatus, data)
      ElMessage.success('Bookmark updated successfully!')
    } else {
      await api.createLink(data)
      ElMessage.success('Bookmark saved successfully!')
    }

    // Trigger background check
    await chrome.runtime.sendMessage({
      recipient: 'background',
      type: 'checkTab'
    })

    // Close popup after short delay
    setTimeout(() => window.close(), 1000)
  } catch (error) {
    console.error('Error saving bookmark:', error)
    ElMessage.error('Failed to save bookmark')
  } finally {
    saving.value = false
  }
}

// Save settings
async function saveSettings() {
  if (!settings.value.apiUrl || !settings.value.apiToken) {
    ElMessage.warning('API URL and Token are required')
    return
  }

  try {
    await chrome.storage.sync.set({
      linkaceApi: settings.value.apiUrl,
      linkaceToken: settings.value.apiToken
    })

    api.configure(settings.value.apiUrl, settings.value.apiToken)

    // Notify background script
    await chrome.runtime.sendMessage({
      recipient: 'background',
      type: 'apiInfo',
      content: {
        apiUrl: settings.value.apiUrl,
        apiToken: settings.value.apiToken
      }
    })

    ElMessage.success('Settings saved successfully!')
    settingsVisible.value = false
  } catch (error) {
    console.error('Error saving settings:', error)
    ElMessage.error('Failed to save settings')
  }
}
</script>

<style scoped>
.popup-container {
  width: 500px;
  min-height: 400px;
  padding: 16px;
}

.nav-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.content {
  padding: 0 8px;
}

.title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}
</style>
